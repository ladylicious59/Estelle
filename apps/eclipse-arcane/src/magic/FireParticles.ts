import * as THREE from 'three';
import { MAX_ACTIVE_PARTICLES } from '../utils/constants';

export interface FireParticleSpawn {
  position: THREE.Vector3;
  velocity?: THREE.Vector3;
  /** Total lifetime in seconds */
  life: number;
  /** Color at birth (hex string, e.g. '#FF6600') */
  colorStart: string;
  /** Color at death (fades to this). Defaults to colorStart. */
  colorEnd?: string;
  /** World-space sprite size (square) */
  size: number;
  /** Vertical acceleration in units/sec² — positive rises, negative falls. */
  gravity?: number;
}

interface ActiveParticle {
  sprite: THREE.Sprite;
  velocity: THREE.Vector3;
  life: number; // remaining
  totalLife: number;
  colorStart: THREE.Color;
  colorEnd: THREE.Color;
  baseSize: number;
  gravity: number;
}

/**
 * Shared fire particle pool (VFX spec §1.2 / §6.1).
 * Sprite-based additive particles with per-particle color, size and opacity curves.
 * Hard-capped at MAX_ACTIVE_PARTICLES total across all spells — spawn() returns
 * false when the pool is exhausted (callers may drop the particle).
 */
export class FireParticleSystem {
  private scene: THREE.Scene;
  private particles: ActiveParticle[] = [];
  private texture: THREE.Texture | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  get activeCount(): number {
    return this.particles.length;
  }

  private getTexture(): THREE.Texture {
    if (!this.texture) {
      // 64×64 soft radial gradient, tinted at runtime via SpriteMaterial.color
      const size = 64;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.35, 'rgba(255,255,255,0.85)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      this.texture = new THREE.CanvasTexture(canvas);
    }
    return this.texture;
  }

  /** Spawn a particle. Returns false if the pool is exhausted (count not incremented). */
  spawn(opts: FireParticleSpawn): boolean {
    if (this.particles.length >= MAX_ACTIVE_PARTICLES) return false;

    const mat = new THREE.SpriteMaterial({
      map: this.getTexture(),
      color: new THREE.Color(opts.colorStart),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(opts.position);
    sprite.scale.set(opts.size, opts.size, 1);
    this.scene.add(sprite);

    this.particles.push({
      sprite,
      velocity: opts.velocity ? opts.velocity.clone() : new THREE.Vector3(),
      life: opts.life,
      totalLife: opts.life,
      colorStart: new THREE.Color(opts.colorStart),
      colorEnd: new THREE.Color(opts.colorEnd ?? opts.colorStart),
      baseSize: opts.size,
      gravity: opts.gravity ?? 0,
    });
    return true;
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.scene.remove(p.sprite);
        (p.sprite.material as THREE.SpriteMaterial).map = null; // texture is shared — don't dispose it
        (p.sprite.material as THREE.SpriteMaterial).dispose();
        this.particles.splice(i, 1);
        continue;
      }

      const t = 1 - p.life / p.totalLife; // normalized age 0 → 1

      // Integrate motion
      p.sprite.position.addScaledVector(p.velocity, dt);
      p.velocity.y += p.gravity * dt;

      // Size curve: grow in 0→0.2, hold 0.2→0.7, shrink 1.0→0.3 over 0.7→1.0
      let sizeFactor = 1;
      if (t < 0.2) {
        sizeFactor = t / 0.2;
      } else if (t > 0.7) {
        sizeFactor = 1 - ((t - 0.7) / 0.3) * 0.7;
      }
      const s = Math.max(0.001, p.baseSize * sizeFactor);
      p.sprite.scale.set(s, s, 1);

      // Opacity curve: fade in 0→1 over 0→0.15, hold to 0.6, fade out to 0
      let opacity = 1;
      if (t < 0.15) {
        opacity = t / 0.15;
      } else if (t > 0.6) {
        opacity = 1 - (t - 0.6) / 0.4;
      }
      (p.sprite.material as THREE.SpriteMaterial).opacity = Math.max(0, Math.min(1, opacity));

      // Color lerp birth → death
      (p.sprite.material as THREE.SpriteMaterial).color.copy(p.colorStart).lerp(p.colorEnd, t);
    }
  }

  clear(): void {
    for (const p of this.particles) {
      this.scene.remove(p.sprite);
      (p.sprite.material as THREE.SpriteMaterial).dispose();
    }
    this.particles = [];
  }
}
