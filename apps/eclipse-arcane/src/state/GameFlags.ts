/**
 * GameFlags — central, serialisable game state that dialogue (and later quests,
 * shops and saves) reads from.
 *
 * Dialogue states are selected from these flags, so keeping them in one
 * well-typed store avoids scattering ad-hoc booleans through the codebase.
 */

export type QuestStatus = 'not_started' | 'available' | 'active' | 'complete';

/** Known quest ids (GDD Section 9 / Emberwood quest document). */
export const QUEST_FORGOTTEN_FLAME = 'the_forgotten_flame';

/** Known element ids (GDD Section 3 — eight elemental schools). */
export type ElementId =
  | 'fire'
  | 'water'
  | 'earth'
  | 'air'
  | 'lightning'
  | 'ice'
  | 'light'
  | 'shadow';

export type FlagValue = boolean | number | string;

export const ELEMENT_IDS: ElementId[] = [
  'fire', 'water', 'earth', 'air', 'lightning', 'ice', 'light', 'shadow',
];

export interface GameFlagsSnapshot {
  quests: Record<string, QuestStatus>;
  elements: Record<string, boolean>;
  flags: Record<string, FlagValue>;
}

type FlagsListener = (flags: GameFlags) => void;

export class GameFlags {
  private quests: Map<string, QuestStatus> = new Map();
  private elements: Map<string, boolean> = new Map();
  private values: Map<string, FlagValue> = new Map();
  private listeners: Set<FlagsListener> = new Set();

  constructor() {
    this.reset();
  }

  /** Restore the opening state of the game. */
  reset(): void {
    this.quests.clear();
    this.elements.clear();
    this.values.clear();

    // Fire is the element the player already wields (fire-magic milestone).
    for (const id of ELEMENT_IDS) {
      this.elements.set(id, id === 'fire');
    }

    this.emit();
  }

  // --- Quests ---

  getQuestStatus(questId: string): QuestStatus {
    return this.quests.get(questId) ?? 'not_started';
  }

  /**
   * Quests only move forward: not_started → available → active → complete.
   * (A debug/dev caller can force any status with `forceQuestStatus`.)
   */
  setQuestStatus(questId: string, status: QuestStatus): void {
    const current = this.getQuestStatus(questId);
    const order: QuestStatus[] = ['not_started', 'available', 'active', 'complete'];
    if (order.indexOf(status) < order.indexOf(current)) return;
    this.quests.set(questId, status);
    this.emit();
  }

  /** Dev/testing helper — bypasses the forward-only guard. */
  forceQuestStatus(questId: string, status: QuestStatus): void {
    this.quests.set(questId, status);
    this.emit();
  }

  isQuestStatus(questId: string, status: QuestStatus): boolean {
    return this.getQuestStatus(questId) === status;
  }

  /** True once the quest has been accepted (active or complete). */
  isQuestAccepted(questId: string): boolean {
    const s = this.getQuestStatus(questId);
    return s === 'active' || s === 'complete';
  }

  // --- Elements ---

  isElementUnlocked(element: ElementId): boolean {
    return this.elements.get(element) === true;
  }

  unlockElement(element: ElementId): void {
    if (this.elements.get(element) === true) return;
    this.elements.set(element, true);
    this.emit();
  }

  // --- Generic flags (booleans / counters / strings) ---

  getFlag(name: string): FlagValue | undefined {
    return this.values.get(name);
  }

  getBool(name: string, fallback: boolean = false): boolean {
    const v = this.values.get(name);
    return typeof v === 'boolean' ? v : fallback;
  }

  getNumber(name: string, fallback: number = 0): number {
    const v = this.values.get(name);
    return typeof v === 'number' ? v : fallback;
  }

  setFlag(name: string, value: FlagValue = true): void {
    if (this.values.get(name) === value) return;
    this.values.set(name, value);
    this.emit();
  }

  increment(name: string, by: number = 1): void {
    this.values.set(name, this.getNumber(name, 0) + by);
    this.emit();
  }

  hasFlag(name: string): boolean {
    const v = this.values.get(name);
    return v !== undefined && v !== false && v !== 0;
  }

  // --- Introspection & persistence ---

  snapshot(): GameFlagsSnapshot {
    return {
      quests: Object.fromEntries(this.quests),
      elements: Object.fromEntries(this.elements),
      flags: Object.fromEntries(this.values),
    };
  }

  load(snapshot: GameFlagsSnapshot): void {
    this.quests = new Map(Object.entries(snapshot.quests ?? {}));
    this.elements = new Map(Object.entries(snapshot.elements ?? {}));
    this.values = new Map(Object.entries(snapshot.flags ?? {}));
    this.emit();
  }

  onChange(cb: FlagsListener): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private emit(): void {
    for (const cb of this.listeners) cb(this);
  }
}
