/**
 * Data model for NPC dialogue.
 *
 * Every NPC is described declaratively as a set of *states*. A state is picked
 * by scanning its `condition`s in priority order (first match wins) against the
 * GameFlags store, which is how quest progress / unlocked elements change what
 * an NPC says. Inside a state, `nodes` are small graphs of lines and player
 * choices. Adding a new NPC means adding data — no engine changes required.
 */

import type { GameFlags } from '../state/GameFlags';

export type DialogueCondition = (flags: GameFlags) => boolean;

/** Actions a dialogue line or choice can trigger (shop UI, healing, flags...). */
export type DialogueAction =
  | { type: 'setFlag'; name: string; value?: boolean | number | string }
  | { type: 'increment'; name: string; by?: number }
  | { type: 'questStatus'; questId: string; status: 'not_started' | 'available' | 'active' | 'complete' }
  | { type: 'unlockElement'; element: string }
  | { type: 'openShop'; shopId: string }
  | { type: 'heal'; cost: number }
  | { type: 'log'; message: string };

/**
 * Where a node / choice leads after it is finished.
 * - `end`   — close the dialogue window
 * - `node`  — another node in the same state
 * - `state` — the root node of another state (e.g. the shared `gossip` branch)
 * - `return`— the root node of the state the conversation started in
 */
export type DialogueTarget =
  | { kind: 'end' }
  | { kind: 'node'; nodeId: string }
  | { kind: 'state'; stateId: string }
  | { kind: 'return' };

export const END_DIALOGUE: DialogueTarget = { kind: 'end' };

export interface DialogueChoiceSpec {
  /** The player's line, shown as a button (quotes are added by the UI). */
  text: string;
  /** Where this choice leads. Omitted ⇒ end the dialogue. */
  goto?: DialogueTarget;
  /** Side effect fired when the choice is picked. */
  action?: DialogueAction;
  /** Hidden unless the condition passes (quest flags, gold, level...). */
  condition?: DialogueCondition;
  /** Hide the choice once it has been picked (per save). */
  once?: boolean;
  /** Stable id, required only when `once` is used. */
  id?: string;
}

export interface DialogueNodeSpec {
  id: string;
  /** NPC lines, shown one at a time and advanced with E / click. */
  lines: string[];
  /** Side effect fired when the node is entered. */
  onEnter?: DialogueAction;
  /** Player options, shown once the final line of the node is on screen. */
  choices?: DialogueChoiceSpec[];
  /** Auto-continue target when the node has no choices. Defaults to end. */
  goto?: DialogueTarget;
}

export interface DialogueStateSpec {
  id: string;
  /** Higher wins. `default` sits at the bottom (priority 0, no condition). */
  priority: number;
  /** Only entered while this returns true. Omitted on the fallback state. */
  condition?: DialogueCondition;
  /** Node shown when the state is entered. */
  rootNodeId: string;
  nodes: Record<string, DialogueNodeSpec>;
}

export interface DialogueTree {
  npcId: string;
  npcName: string;
  /** Human-readable title, used in debug output. */
  title?: string;
  states: DialogueStateSpec[];
  /** State used when nothing else matches. Must exist in `states`. */
  defaultStateId: string;
}

/** Convenience helpers so the data files stay terse. */
export const node = (
  id: string,
  lines: string[],
  rest: Omit<DialogueNodeSpec, 'id' | 'lines'> = {},
): DialogueNodeSpec => ({ id, lines, ...rest });

export const state = (
  id: string,
  rootNodeId: string,
  nodes: DialogueNodeSpec[],
  rest: Omit<DialogueStateSpec, 'id' | 'rootNodeId' | 'nodes'> = { priority: 0 },
): DialogueStateSpec => ({
  id,
  rootNodeId,
  nodes: Object.fromEntries(nodes.map((n) => [n.id, n])),
  ...rest,
});

export const toNode = (nodeId: string): DialogueTarget => ({ kind: 'node', nodeId });
export const toState = (stateId: string): DialogueTarget => ({ kind: 'state', stateId });
export const toReturn = (): DialogueTarget => ({ kind: 'return' });
