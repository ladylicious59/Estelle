/**
 * DialogueController — glues NPC proximity, conversation state and the UI.
 *
 * Responsibilities:
 *  - show/hide the "Press E to talk" prompt for the NPC in range
 *  - open a conversation, feed input into the DialogueSession, render results
 *  - run the actions dialogue triggers (flags, quest status, shops, healing)
 *  - freeze player movement/actions while talking and swallow game input so a
 *    keypress meant for the dialogue box never reaches combat or spellcasting
 *
 * Input is captured on `window` in the capture phase and, while a conversation
 * is open (or while E is being used to start one), propagation is stopped so
 * CombatController / FireMagic never see the key.
 */

import type { Player } from '../player/Player';
import type { NpcManager } from '../npc/NpcManager';
import type { Npc } from '../npc/Npc';
import { GameFlags, type ElementId, type QuestStatus } from '../state/GameFlags';
import { DialogueSession } from './DialogueStateMachine';
import { DialogueUI } from './DialogueUI';
import type { DialogueAction } from './types';

export interface DialogueDebugInfo {
  npcId: string | null;
  npcName: string | null;
  stateId: string | null;
  entryStateId: string | null;
  nodeId: string | null;
  lineIndex: number;
  phase: 'line' | 'choices' | 'closed' | 'none';
  line: string | null;
  choices: string[];
  promptTarget: string | null;
}

export class DialogueController {
  public readonly flags: GameFlags;
  private npcManager: NpcManager;
  private player: Player;
  private ui: DialogueUI;

  private session: DialogueSession | null = null;
  private activeNpc: Npc | null = null;
  private lastRenderedLineKey: string = '';
  private savedPlayerCanMove: boolean = true;
  private savedPlayerCanAct: boolean = true;
  private promptVisible: boolean = false;

  constructor(npcManager: NpcManager, player: Player, flags: GameFlags) {
    this.npcManager = npcManager;
    this.player = player;
    this.flags = flags;
    this.ui = new DialogueUI();
    this.ui.onChoiceClicked = (index) => this.choose(index);
    this.ui.onAdvanceClicked = () => this.advance();
    this.ui.onPromptClicked = () => {
      const npc = this.npcManager.focused;
      if (npc) this.startDialogue(npc.id);
    };

    window.addEventListener('keydown', this.handleKeyDown, true);
  }

  // --- Public API ---

  get isOpen(): boolean {
    return this.session !== null && !this.session.isClosed;
  }

  get activeNpcId(): string | null {
    return this.activeNpc?.id ?? null;
  }

  /** Per-frame: proximity, prompt, typewriter. */
  update(dt: number): void {
    this.npcManager.update(dt, this.player.position);
    this.ui.update(dt);

    // Once a line has finished typing, offer the node's choices immediately.
    if (this.session && !this.ui.isTyping && !this.ui.hasChoices) {
      if (this.session.revealChoicesIfReady()) this.render();
    }

    // Prompt is only shown when a conversation isn't already in progress.
    const npc = this.npcManager.focused;
    if (!this.isOpen && npc) {
      if (!this.promptVisible) {
        this.ui.showPrompt(npc.promptLabel);
        this.promptVisible = true;
      }
    } else if (this.promptVisible) {
      this.ui.hidePrompt();
      this.promptVisible = false;
    }
  }

  /** Begin a conversation, optionally forcing a specific dialogue state. */
  startDialogue(npcId: string, stateId?: string): boolean {
    const npc = this.npcManager.getNpc(npcId);
    if (!npc) {
      console.warn(`[dialogue] unknown NPC "${npcId}"`);
      return false;
    }

    this.session = new DialogueSession(
      npc.dialogue,
      this.flags,
      (action) => this.runAction(action),
      stateId,
    );
    this.activeNpc = npc;
    this.lastRenderedLineKey = '';

    this.savedPlayerCanMove = this.player.canMove;
    this.savedPlayerCanAct = this.player.canAct;
    this.player.canMove = false;
    this.player.canAct = false;
    this.player.uiInputLocked = true;

    if (this.promptVisible) {
      this.ui.hidePrompt();
      this.promptVisible = false;
    }

    this.ui.open(npc.dialogue.npcName);
    this.render();
    return true;
  }

  /** Close the current conversation. */
  endDialogue(): void {
    if (!this.session) return;
    this.session = null;
    this.activeNpc = null;
    this.lastRenderedLineKey = '';
    this.ui.close();

    this.player.canMove = this.savedPlayerCanMove;
    this.player.canAct = this.savedPlayerCanAct;
    this.player.uiInputLocked = false;
  }

  /** Advance the current line, or reveal it if it is still being typed. */
  advance(): void {
    if (!this.session) return;

    if (this.ui.isTyping) {
      this.ui.finishTyping();
      return;
    }

    if (this.ui.hasChoices) {
      this.choose(this.ui.currentSelectedIndex);
      return;
    }

    this.session.advance();
    this.render();
  }

  /** Pick a choice from the currently visible list. */
  choose(index: number): void {
    if (!this.session) return;
    this.session.choose(index);
    this.lastRenderedLineKey = '';
    this.render();
  }

  // --- Debug / test helpers ---------------------------------------------

  /** Force a quest flag (used to reach Renn's later states before quests exist). */
  setQuestStatus(questId: string, status: QuestStatus): void {
    this.flags.forceQuestStatus(questId, status);
    if (this.session) {
      // Re-render the greeting the new state dictates.
      this.lastRenderedLineKey = '';
      this.render();
    }
  }

  /** Introspection for tests and dev tools. */
  getDebugInfo(): DialogueDebugInfo {
    const npc = this.activeNpc;
    return {
      npcId: npc?.id ?? null,
      npcName: npc?.name ?? null,
      stateId: this.session?.stateId ?? null,
      entryStateId: this.session?.entryStateId ?? null,
      nodeId: this.session?.nodeId ?? null,
      lineIndex: this.session?.lineIndex ?? 0,
      phase: this.session ? this.session.phase : 'none',
      line: this.session ? this.session.currentLine : null,
      choices: this.session ? this.session.visibleChoices.map((c) => c.text) : [],
      promptTarget: this.promptVisible ? (this.npcManager.focused?.promptLabel ?? null) : null,
    };
  }

  /** Which dialogue state would this NPC greet the player with right now? */
  getGreetingState(npcId: string): string | null {
    const npc = this.npcManager.getNpc(npcId);
    if (!npc) return null;
    const probe = new DialogueSession(npc.dialogue, this.flags, () => undefined);
    return probe.stateId;
  }

  dispose(): void {
    this.endDialogue();
    window.removeEventListener('keydown', this.handleKeyDown, true);
  }

  // --- Rendering ---

  private render(): void {
    if (!this.session || this.session.isClosed) {
      this.endDialogue();
      return;
    }

    if (this.session.phase === 'choices') {
      this.ui.showChoices(this.session.visibleChoices.map((choice) => choice.text));
      return;
    }

    const key = `${this.session.stateId}:${this.session.nodeId}:${this.session.lineIndex}`;
    if (key !== this.lastRenderedLineKey) {
      this.lastRenderedLineKey = key;
      this.ui.showLine(this.session.currentLine);
    }
  }

  // --- Actions ---

  private runAction(action: DialogueAction): void {
    switch (action.type) {
      case 'setFlag':
        this.flags.setFlag(action.name, action.value ?? true);
        break;

      case 'increment':
        this.flags.increment(action.name, action.by ?? 1);
        break;

      case 'questStatus':
        this.flags.setQuestStatus(action.questId, action.status);
        break;

      case 'unlockElement':
        this.flags.unlockElement(action.element as ElementId);
        break;

      case 'openShop':
        // Shop UI arrives with the merchant milestone (Greta / Milo).
        console.log(`[dialogue] openShop("${action.shopId}") — shop UI not implemented yet`);
        break;

      case 'heal':
        console.log(`[dialogue] heal(cost: ${action.cost}) — healing UI not implemented yet`);
        break;

      case 'log':
        console.log(`[dialogue] ${action.message}`);
        break;
    }
  }

  // --- Input -------------------------------------------------------------

  private handleKeyDown = (e: KeyboardEvent): void => {
    // While talking, the dialogue owns the keyboard.
    if (this.isOpen) {
      e.preventDefault();
      e.stopPropagation();
      if (e.repeat) return;

      switch (e.code) {
        case 'KeyE':
        case 'Enter':
        case 'NumpadEnter':
        case 'Space':
          this.advance();
          break;
        case 'ArrowUp':
        case 'KeyW':
          this.ui.selectNext(-1);
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.ui.selectNext(1);
          break;
        case 'Escape':
          this.endDialogue();
          break;
        default:
          break;
      }
      return;
    }

    // E opens a conversation when an NPC is in range (and never doubles as a
    // heavy attack in that moment).
    if (e.code === 'KeyE' && !e.repeat) {
      const npc = this.npcManager.focused;
      if (npc) {
        e.preventDefault();
        e.stopPropagation();
        this.startDialogue(npc.id);
      }
    }
  };
}
