/**
 * DialogueStateMachine — the runtime behind an NPC conversation.
 *
 * Two responsibilities:
 *  1. `selectState()` picks the dialogue state for the current game flags:
 *     states are scanned in priority order and the first matching one wins,
 *     falling through to the NPC's `default` state.
 *  2. `DialogueSession` walks the chosen state's node graph — advancing lines,
 *     resolving player choices and firing the actions they carry.
 *
 * The session is UI-agnostic: the controller asks "what should be on screen?"
 * and reports back what the player pressed.
 */

import { GameFlags } from '../state/GameFlags';
import type {
  DialogueAction,
  DialogueChoiceSpec,
  DialogueNodeSpec,
  DialogueStateSpec,
  DialogueTarget,
  DialogueTree,
} from './types';

export function selectState(tree: DialogueTree, flags: GameFlags): DialogueStateSpec {
  const candidates = [...tree.states].sort((a, b) => b.priority - a.priority);
  for (const candidate of candidates) {
    if (candidate.condition && !candidate.condition(flags)) continue;
    return candidate;
  }
  const fallback = findState(tree, tree.defaultStateId);
  if (fallback) return fallback;
  throw new Error(
    `No dialogue state matched for NPC "${tree.npcId}" and no default state is defined.`,
  );
}

export function findState(tree: DialogueTree, stateId: string): DialogueStateSpec | null {
  return tree.states.find((s) => s.id === stateId) ?? null;
}

/** What `advance()` did — the controller re-renders from the session either way. */
export type AdvanceResult = 'line' | 'choices' | 'closed';

/** What `choose()` did. */
export type ChooseResult = 'line' | 'choices' | 'closed';

export class DialogueSession {
  public readonly tree: DialogueTree;
  private flags: GameFlags;
  private runAction: (action: DialogueAction) => void;

  /** State resolved when the conversation opened — target of `return`. */
  public entryStateId: string = '';
  public stateId: string = '';
  public nodeId: string = '';
  public lineIndex: number = 0;
  public phase: 'line' | 'choices' | 'closed' = 'line';

  /** Choices already picked this conversation (for `once` conditions). */
  private pickedOnce: Set<string> = new Set();

  constructor(
    tree: DialogueTree,
    flags: GameFlags,
    runAction: (action: DialogueAction) => void,
    entryStateId?: string,
  ) {
    this.tree = tree;
    this.flags = flags;
    this.runAction = runAction;
    this.enterState(entryStateId ?? null);
  }

  // --- Introspection ---

  get npcName(): string {
    return this.tree.npcName;
  }

  get isClosed(): boolean {
    return this.phase === 'closed';
  }

  get currentNode(): DialogueNodeSpec {
    const node = this.currentState.nodes[this.nodeId];
    if (!node) {
      throw new Error(`Missing dialogue node "${this.nodeId}" in state "${this.stateId}"`);
    }
    return node;
  }

  get currentState(): DialogueStateSpec {
    const state = findState(this.tree, this.stateId);
    if (!state) {
      throw new Error(`Missing dialogue state "${this.stateId}" for NPC "${this.tree.npcId}"`);
    }
    return state;
  }

  /** Current NPC line (only meaningful while `phase === 'line'`). */
  get currentLine(): string {
    const lines = this.currentNode.lines;
    return lines[Math.min(this.lineIndex, lines.length - 1)] ?? '';
  }

  get isLastLine(): boolean {
    return this.lineIndex >= this.currentNode.lines.length - 1;
  }

  /** Choices whose conditions currently pass and that are not spent. */
  get visibleChoices(): DialogueChoiceSpec[] {
    const choices = this.currentNode.choices ?? [];
    return choices.filter((choice) => {
      if (choice.once && choice.id && this.pickedOnce.has(choice.id)) return false;
      if (choice.condition && !choice.condition(this.flags)) return false;
      return true;
    });
  }

  // --- Navigation ---

  /**
   * Advance the conversation: next line, reveal choices, or move to the node's
   * `goto` target. Returns what the session did so the UI can react.
   */
  advance(): AdvanceResult {
    if (this.phase === 'closed') return 'closed';

    if (this.phase === 'choices') {
      // Nothing to advance — the player must pick an option.
      return 'choices';
    }

    if (!this.isLastLine) {
      this.lineIndex += 1;
      return 'line';
    }

    if (this.visibleChoices.length > 0) {
      this.phase = 'choices';
      return 'choices';
    }

    return this.follow(this.currentNode.goto);
  }

  /**
   * Called once the current line has finished typing: if this was the node's
   * last line and the node offers choices, surface them straight away so the
   * player doesn't need a throwaway keypress. Returns true if the phase changed.
   */
  revealChoicesIfReady(): boolean {
    if (this.phase !== 'line') return false;
    if (!this.isLastLine) return false;
    if (this.visibleChoices.length === 0) return false;
    this.phase = 'choices';
    return true;
  }

  /** Pick the visible choice at `index`. */
  choose(index: number): ChooseResult {
    if (this.phase !== 'choices') return this.phase === 'closed' ? 'closed' : 'line';

    const choice = this.visibleChoices[index];
    if (!choice) return 'choices';

    if (choice.once && choice.id) this.pickedOnce.add(choice.id);
    if (choice.action) this.runAction(choice.action);

    const result = this.follow(choice.goto);
    return result;
  }

  /** Directly jump to a state (used by dev tools and scripted sequences). */
  jumpToState(stateId: string): void {
    this.enterState(stateId);
  }

  /** Directly jump to a node inside the current state. */
  jumpToNode(nodeId: string): void {
    this.enterNode(nodeId);
  }

  // --- Internals ---

  private follow(target: DialogueTarget | undefined): 'line' | 'closed' {
    if (!target) {
      this.phase = 'closed';
      return 'closed';
    }

    switch (target.kind) {
      case 'end':
        this.phase = 'closed';
        return 'closed';

      case 'node':
        this.enterNode(target.nodeId);
        return 'line';

      case 'state':
        this.enterState(target.stateId);
        return 'line';

      case 'return':
        this.enterState(this.entryStateId);
        return 'line';
    }
  }

  private enterState(stateId: string | null): void {
    const state = stateId ? findState(this.tree, stateId) : null;
    const resolved = state ?? selectState(this.tree, this.flags);
    this.stateId = resolved.id;
    if (!this.entryStateId) this.entryStateId = resolved.id;
    this.enterNode(resolved.rootNodeId);
  }

  private enterNode(nodeId: string): void {
    this.nodeId = nodeId;
    this.lineIndex = 0;
    this.phase = 'line';
    const node = this.currentNode;
    if (node.onEnter) this.runAction(node.onEnter);
  }
}
