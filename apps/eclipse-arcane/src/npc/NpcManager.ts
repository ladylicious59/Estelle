/**
 * NpcManager — registry and proximity tracking for every talkable NPC.
 *
 * Each frame it updates the NPCs and works out which one (if any) the player is
 * close enough to interact with; the dialogue controller turns that into the
 * on-screen prompt. Adding an NPC is a single `add()` call, so new characters
 * need no changes here.
 */

import * as THREE from 'three';
import { Npc, type NpcConfig } from './Npc';

export class NpcManager {
  private npcs: Npc[] = [];
  private scene: THREE.Scene;
  /** NPC currently in interaction range and closest to the player. */
  private focusedNpc: Npc | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  add(config: NpcConfig): Npc {
    const npc = new Npc(config, this.scene);
    this.npcs.push(npc);
    return npc;
  }

  get all(): readonly Npc[] {
    return this.npcs;
  }

  getNpc(id: string): Npc | null {
    return this.npcs.find((npc) => npc.id === id) ?? null;
  }

  /** Closest NPC within its interaction radius, or null. */
  get focused(): Npc | null {
    return this.focusedNpc;
  }

  update(dt: number, playerPosition: THREE.Vector3): void {
    let closest: Npc | null = null;

    for (const npc of this.npcs) {
      npc.update(dt, playerPosition);
      if (!npc.isInRange) continue;
      if (!closest || npc.distance < closest.distance) closest = npc;
    }

    this.focusedNpc = closest;
  }

  dispose(): void {
    for (const npc of this.npcs) npc.dispose(this.scene);
    this.npcs = [];
    this.focusedNpc = null;
  }
}
