/**
 * Npc — a talkable character in the world.
 *
 * Owns its mesh, its interaction radius and its dialogue tree. Distance checks
 * and prompt text live here so new NPCs only ever need a config object.
 */

import * as THREE from 'three';
import type { DialogueTree } from '../dialogue/types';

export interface NpcConfig {
  id: string;
  name: string;
  /** Short label used by the interaction prompt (defaults to `name`). */
  promptLabel?: string;
  position: THREE.Vector3;
  /** Facing in radians at rest; the NPC turns toward the player in range. */
  restYaw?: number;
  /** Distance at which the interaction prompt appears. */
  interactionRadius?: number;
  /** How far away the NPC will turn to face the player. */
  noticeRadius?: number;
  dialogue: DialogueTree;
  buildModel: () => THREE.Group;
}

export const DEFAULT_INTERACTION_RADIUS = 3.6;

export class Npc {
  public readonly id: string;
  public readonly name: string;
  public readonly promptLabel: string;
  public readonly position: THREE.Vector3;
  public readonly interactionRadius: number;
  public readonly noticeRadius: number;
  public readonly dialogue: DialogueTree;
  public readonly group: THREE.Group;

  private restYaw: number;
  private currentYaw: number;
  private idleTime: number = 0;
  private body: THREE.Group;
  private baseBodyY: number = 0;

  /** Distance from the player to this NPC (updated each frame). */
  public distance: number = Infinity;
  /** True while the player is close enough to talk. */
  public isInRange: boolean = false;

  constructor(config: NpcConfig, scene: THREE.Scene) {
    this.id = config.id;
    this.name = config.name;
    this.promptLabel = config.promptLabel ?? config.name;
    this.position = config.position.clone();
    this.interactionRadius = config.interactionRadius ?? DEFAULT_INTERACTION_RADIUS;
    this.noticeRadius = config.noticeRadius ?? 9;
    this.dialogue = config.dialogue;
    this.restYaw = config.restYaw ?? 0;
    this.currentYaw = this.restYaw;

    this.group = new THREE.Group();
    this.group.position.copy(this.position);
    this.group.rotation.y = this.currentYaw;

    this.body = config.buildModel();
    this.baseBodyY = this.body.position.y;
    this.group.add(this.body);

    scene.add(this.group);
  }

  /** Idle animation + player distance / facing bookkeeping. */
  update(dt: number, playerPosition: THREE.Vector3): void {
    this.idleTime += dt;

    // Breathing bob so the character doesn't look frozen.
    this.body.position.y = this.baseBodyY + Math.sin(this.idleTime * 1.6) * 0.012;

    const dx = playerPosition.x - this.position.x;
    const dz = playerPosition.z - this.position.z;
    this.distance = Math.hypot(dx, dz);
    this.isInRange = this.distance <= this.interactionRadius;

    // Face the player when they're nearby, otherwise drift back to rest pose.
    let targetYaw = this.restYaw;
    if (this.distance <= this.noticeRadius) {
      targetYaw = Math.atan2(dx, dz);
    }
    const delta = shortestAngle(this.currentYaw, targetYaw);
    this.currentYaw += delta * Math.min(1, dt * 6);
    this.group.rotation.y = this.currentYaw;
  }

  dispose(scene: THREE.Scene): void {
    scene.remove(this.group);
  }
}

/** Signed shortest angular difference from `from` to `to`, in radians. */
function shortestAngle(from: number, to: number): number {
  let diff = (to - from) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}
