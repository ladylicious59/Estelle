import * as THREE from 'three';
import { Player } from '../player/Player';
import { Goblin } from '../enemies/Goblin';
import { DamageNumbers } from '../ui/DamageNumbers';
import { FireParticleSystem } from './FireParticles';
import {
  FIREBOLT_MANA,
  FLAME_WAVE_MANA,
  INFERNO_MANA,
  PHOENIX_DASH_MANA,
  FIREBOLT_COOLDOWN,
  FLAME_WAVE_COOLDOWN,
  INFERNO_COOLDOWN,
  PHOENIX_DASH_COOLDOWN,
  FIREBOLT_DAMAGE,
  FIREBOLT_PROJECTILE_SPEED,
  FIREBOLT_RANGE,
  FIREBOLT_PROJECTILE_RADIUS,
  FIREBOLT_EXPLOSION_RADIUS,
  FIREBOLT_HIT_RADIUS,
  FLAME_WAVE_DAMAGE,
  FLAME_WAVE_RANGE,
  FLAME_WAVE_ARC_DEG,
  FLAME_WAVE_EXTEND_DURATION,
  INFERNO_DAMAGE_PER_SEC,
  INFERNO_RADIUS,
  INFERNO_DURATION,
  INFERNO_FADE_DURATION,
  INFERNO_CAST_RANGE,
  PHOENIX_DASH_DAMAGE,
  PHOENIX_DASH_DISTANCE,
  PHOENIX_DASH_DURATION,
  PHOENIX_DASH_AOE_RADIUS,
  PHOENIX_ARRIVAL_EXPLOSION_RADIUS,
  WORLD_BOUNDS,
} from '../utils/constants';

// Fire palette (VFX spec §1.1)
const CORE_WHITE = '#FFFA66';
const INNER_GLOW = '#FFCC00';
const CORE_FLAME = '#FF6600';
const OUTER_EDGE = '#FF3300';
const DEEP_EMBER = '#CC2200';
const ORANGE = '#FF9900';
const MAGIC_DMG_COLOR = '#FF9900';

export type SpellId = 'firebolt' | 'flamewave' | 'inferno' | 'phoenixdash';

export interface SpellStatus {
  id: SpellId;
  name: string;
  key: string;
  cooldown: number; // remaining seconds
  maxCooldown: number;
}

interface FireboltProjectile {
  mesh: THREE.Mesh;
  light: THREE.PointLight;
  velocity: THREE.Vector3;
  traveled: number;
  trailTimer: number;
}

interface ActiveCone {
  mesh: THREE.Mesh;
  timer: number;
  totalLife: number;
  scorched: boolean;
}

interface ActiveInferno {
  center: THREE.Vector3;
  circle: THREE.Mesh;
  light: THREE.PointLight;
  timer: number;
  tickTimer: number;
}

interface DashState {
  timer: number;
  duration: number;
  direction: THREE.Vector3;
  startPos: THREE.Vector3;
  arrivalPos: THREE.Vector3;
  wingTimer: number;
  streakTimer: number;
}

interface PhoenixVFX {
  group: THREE.Group;
  timer: number;
  totalLife: number;
}

interface ScorchDecal {
  mesh: THREE.Mesh;
  life: number;
  totalLife: number;
}

interface LightFlash {
  light: THREE.PointLight;
  life: number;
  totalLife: number;
  startIntensity: number;
}

/**
 * Fire element magic controller (GDD §5, fire-spell-vfx-specs.md).
 * Handles casting input (keys 1-4), mana/cooldown gating, spell mechanics
 * and all fire VFX. Enemies are registered via setGoblins(), mirroring
 * CombatController.
 */
export class FireMagic {
  private player: Player;
  private scene: THREE.Scene;
  private particles: FireParticleSystem;

  private goblins: Goblin[] = [];

  // Per-spell cooldown timers (seconds remaining)
  private cooldowns: Record<SpellId, number> = {
    firebolt: 0,
    flamewave: 0,
    inferno: 0,
    phoenixdash: 0,
  };

  // Active spell entities
  private projectiles: FireboltProjectile[] = [];
  private cones: ActiveCone[] = [];
  private activeInferno: ActiveInferno | null = null;
  private dash: DashState | null = null;
  private phoenixVFX: PhoenixVFX | null = null;

  // Transient VFX
  private scorches: ScorchDecal[] = [];
  private lightFlashes: LightFlash[] = [];

  // Dash material swap (fire-wrapped player)
  private dashOriginalMaterials: Map<THREE.Mesh, THREE.Material | THREE.Material[]> = new Map();
  private dashFireMaterials: THREE.MeshBasicMaterial[] = [];

  private onKeyDown: (e: KeyboardEvent) => void;

  private static readonly Y_AXIS = new THREE.Vector3(0, 1, 0);

  constructor(player: Player, scene: THREE.Scene) {
    this.player = player;
    this.scene = scene;
    this.particles = new FireParticleSystem(scene);

    this.onKeyDown = (e: KeyboardEvent): void => {
      switch (e.code) {
        case 'Digit1':
          this.castFirebolt();
          break;
        case 'Digit2':
          this.castFlameWave();
          break;
        case 'Digit3':
          this.castInferno();
          break;
        case 'Digit4':
          this.castPhoenixDash();
          break;
      }
    };
    window.addEventListener('keydown', this.onKeyDown);
  }

  // --- Public API ---

  /** Register active goblins for spell hit detection. */
  setGoblins(goblins: Goblin[]): void {
    this.goblins = goblins;
  }

  /** Remaining cooldown in seconds (0 = ready) for a spell. */
  getCooldownRemaining(spell: SpellId): number {
    return this.cooldowns[spell];
  }

  /** UI snapshot of all four spells. */
  getSpellStatuses(): SpellStatus[] {
    return [
      { id: 'firebolt', name: 'Firebolt', key: '1', cooldown: this.cooldowns.firebolt, maxCooldown: FIREBOLT_COOLDOWN },
      { id: 'flamewave', name: 'Flame Wave', key: '2', cooldown: this.cooldowns.flamewave, maxCooldown: FLAME_WAVE_COOLDOWN },
      { id: 'inferno', name: 'Inferno', key: '3', cooldown: this.cooldowns.inferno, maxCooldown: INFERNO_COOLDOWN },
      { id: 'phoenixdash', name: 'Phoenix Dash', key: '4', cooldown: this.cooldowns.phoenixdash, maxCooldown: PHOENIX_DASH_COOLDOWN },
    ];
  }

  /** Number of active particles (for debugging / budget checks). */
  get activeParticles(): number {
    return this.particles.activeCount;
  }

  update(dt: number): void {
    // Tick cooldowns
    for (const key of Object.keys(this.cooldowns) as SpellId[]) {
      if (this.cooldowns[key] > 0) {
        this.cooldowns[key] = Math.max(0, this.cooldowns[key] - dt);
      }
    }

    this.updateFirebolts(dt);
    this.updateCones(dt);
    this.updateInferno(dt);
    this.updateDash(dt);
    this.updatePhoenixVFX(dt);
    this.updateScorches(dt);
    this.updateLightFlashes(dt);
    this.particles.update(dt);
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    this.particles.clear();
    for (const p of this.projectiles) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
      this.scene.remove(p.light);
      p.light.dispose();
    }
    this.projectiles = [];
    for (const c of this.cones) {
      this.scene.remove(c.mesh);
      c.mesh.geometry.dispose();
      (c.mesh.material as THREE.Material).dispose();
    }
    this.cones = [];
    this.removeInferno();
    this.restorePlayerMaterials();
    for (const s of this.scorches) {
      this.scene.remove(s.mesh);
      s.mesh.geometry.dispose();
      (s.mesh.material as THREE.Material).dispose();
    }
    this.scorches = [];
    for (const f of this.lightFlashes) {
      this.scene.remove(f.light);
      f.light.dispose();
    }
    this.lightFlashes = [];
    if (this.phoenixVFX) {
      this.scene.remove(this.phoenixVFX.group);
      this.disposeGroup(this.phoenixVFX.group);
      this.phoenixVFX = null;
    }
    this.dash = null;
  }

  // --- Casting gate ---

  private canCast(): boolean {
    return this.player.canAct && !this.player.isDodgingNow && this.player.isAlive();
  }

  /** Shared gate: attack lock, cooldown, then mana — then run the spell. */
  private tryCast(spell: SpellId, name: string, cost: number, cooldown: number, castFn: () => void): void {
    if (!this.canCast()) return; // silent while attacking / dodging / dead
    if (this.cooldowns[spell] > 0) {
      console.log(`[${name}] on cooldown`);
      return;
    }
    if (!this.player.useMana(cost)) {
      console.log('Not enough mana!');
      return;
    }
    this.cooldowns[spell] = cooldown;
    castFn();
  }

  // --- Direction helpers ---

  /** Player's cast-facing direction (lock-on overrides camera forward). */
  private getFacingDirection(): THREE.Vector3 {
    return this.player.combatController.getAttackDirection();
  }

  // =========================================================================
  // SPELL 1 — FIREBOLT
  // =========================================================================

  private castFirebolt(): void {
    this.tryCast('firebolt', 'Firebolt', FIREBOLT_MANA, FIREBOLT_COOLDOWN, () => {
      const dir = this.getFacingDirection();
      const start = this.player.position.clone().add(dir.clone().multiplyScalar(0.7));
      start.y = 1.35; // extended right hand height

      // Orb: bright yellow-orange emissive sphere
      const orbGeo = new THREE.SphereGeometry(FIREBOLT_PROJECTILE_RADIUS, 12, 8);
      const orbMat = new THREE.MeshStandardMaterial({
        color: CORE_FLAME,
        emissive: INNER_GLOW,
        emissiveIntensity: 2.0,
        roughness: 0.2,
      });
      const orb = new THREE.Mesh(orbGeo, orbMat);
      orb.position.copy(start);
      this.scene.add(orb);

      // Travelling point light
      const light = new THREE.PointLight(new THREE.Color(CORE_FLAME), 0.6, 3, 2);
      light.position.copy(start);
      this.scene.add(light);

      // Launch burst (5-8 embers)
      for (let i = 0; i < 7; i++) {
        const jitter = new THREE.Vector3((Math.random() - 0.5) * 0.5, Math.random() * 0.4, (Math.random() - 0.5) * 0.5);
        this.particles.spawn({
          position: start.clone().add(jitter),
          velocity: new THREE.Vector3((Math.random() - 0.5) * 2, 1 + Math.random() * 2, (Math.random() - 0.5) * 2),
          life: 0.4 + Math.random() * 0.2,
          colorStart: CORE_FLAME,
          colorEnd: DEEP_EMBER,
          size: 0.12,
          gravity: 1.5,
        });
      }

      this.projectiles.push({
        mesh: orb,
        light,
        velocity: dir.clone().multiplyScalar(FIREBOLT_PROJECTILE_SPEED),
        traveled: 0,
        trailTimer: 0,
      });
      console.log(`Firebolt! — ${FIREBOLT_DAMAGE} dmg`);
    });
  }

  private updateFirebolts(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];

      p.mesh.position.addScaledVector(p.velocity, dt);
      p.light.position.copy(p.mesh.position);
      p.traveled += FIREBOLT_PROJECTILE_SPEED * dt;

      // Trail particles: small orange embers behind the orb
      p.trailTimer -= dt;
      if (p.trailTimer <= 0) {
        p.trailTimer = 0.04;
        const dir = p.velocity.clone().normalize();
        const rear = p.mesh.position.clone().sub(dir.clone().multiplyScalar(0.35));
        rear.y += 0.05;
        this.particles.spawn({
          position: rear,
          velocity: new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.3 + Math.random() * 0.5, (Math.random() - 0.5) * 0.6),
          life: 0.4 + Math.random() * 0.2,
          colorStart: ORANGE,
          colorEnd: DEEP_EMBER,
          size: 0.15,
          gravity: 0.4,
        });
      }

      // Hit detection: first alive goblin within hit radius
      let hitGoblin: Goblin | null = null;
      for (const goblin of this.goblins) {
        if (!goblin.isAlive) continue;
        if (goblin.positionVec.distanceTo(p.mesh.position) <= FIREBOLT_HIT_RADIUS) {
          hitGoblin = goblin;
          break;
        }
      }

      const maxedOut = p.traveled >= FIREBOLT_RANGE;
      if (hitGoblin || maxedOut) {
        const impactPos = p.mesh.position.clone();
        impactPos.y = Math.max(0.6, impactPos.y);

        if (hitGoblin) {
          const knock = p.velocity.clone().normalize();
          knock.y = 0;
          hitGoblin.takeDamage(FIREBOLT_DAMAGE, knock);
          const dmgPos = hitGoblin.positionVec.clone();
          dmgPos.y = 1.4;
          DamageNumbers.show(dmgPos, FIREBOLT_DAMAGE, false, MAGIC_DMG_COLOR);
          console.log(`Firebolt hit goblin for ${FIREBOLT_DAMAGE} damage!`);
        }

        // 1-unit explosion: 8-12 particles + 0.2s orange light flash
        this.explodeAt(impactPos, FIREBOLT_EXPLOSION_RADIUS, 8 + Math.floor(Math.random() * 4));
        this.flashLight(impactPos, 0.2, 2.0, 4, CORE_FLAME);

        // Remove projectile
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.scene.remove(p.light);
        p.light.dispose();
        this.projectiles.splice(i, 1);
      }
    }
  }

  // =========================================================================
  // SPELL 2 — FLAME WAVE
  // =========================================================================

  private castFlameWave(): void {
    this.tryCast('flamewave', 'Flame Wave', FLAME_WAVE_MANA, FLAME_WAVE_COOLDOWN, () => {
      const forward = this.getFacingDirection();

      // Damage everything in the 60° cone once
      this.applyConeDamage(forward);

      // Cone VFX: apex at player, base 6 units forward
      const radius = Math.tan((FLAME_WAVE_ARC_DEG / 2) * Math.PI / 180) * FLAME_WAVE_RANGE;
      const coneGeo = new THREE.ConeGeometry(radius, FLAME_WAVE_RANGE, 24, 6, true);
      const coneMat = new THREE.MeshBasicMaterial({
        color: CORE_FLAME,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.rotation.x = -Math.PI / 2; // apex (+Y) → -Z local
      cone.rotation.y = Math.atan2(forward.x, forward.z);
      const conePos = this.player.position.clone().add(forward.clone().multiplyScalar(FLAME_WAVE_RANGE / 2));
      conePos.y = 0;
      cone.position.copy(conePos);
      this.scene.add(cone);

      this.cones.push({ mesh: cone, timer: 0, totalLife: 0.8, scorched: false });
      console.log(`Flame Wave! — ${FLAME_WAVE_DAMAGE} dmg in cone`);
    });
  }

  private applyConeDamage(forward: THREE.Vector3): void {
    const halfArcRad = (FLAME_WAVE_ARC_DEG / 2) * Math.PI / 180;
    const minDot = Math.cos(halfArcRad);
    const origin = this.player.position;

    for (const goblin of this.goblins) {
      if (!goblin.isAlive) continue;
      const toGoblin = new THREE.Vector3(goblin.positionVec.x - origin.x, 0, goblin.positionVec.z - origin.z);
      const dist = toGoblin.length();
      if (dist > FLAME_WAVE_RANGE) continue;
      toGoblin.normalize();
      if (forward.dot(toGoblin) >= minDot) {
        goblin.takeDamage(FLAME_WAVE_DAMAGE, toGoblin.clone());
        const dmgPos = goblin.positionVec.clone();
        dmgPos.y = 1.2;
        DamageNumbers.show(dmgPos, FLAME_WAVE_DAMAGE, false, MAGIC_DMG_COLOR);
      }
    }
  }

  private updateCones(dt: number): void {
    for (let i = this.cones.length - 1; i >= 0; i--) {
      const cone = this.cones[i];
      cone.timer += dt;
      const t = cone.timer / cone.totalLife;
      const mat = cone.mesh.material as THREE.MeshBasicMaterial;

      if (t < 0.5) {
        // Extend 0.2 → 1.0 scale over the first 0.4s, brightening
        const ext = t / 0.5;
        cone.mesh.scale.setScalar(0.15 + 0.85 * ext);
        mat.opacity = 0.55 * ext;
      } else {
        // Fade out over the last 0.4s
        const fade = (t - 0.5) / 0.5;
        mat.opacity = 0.55 * (1 - fade);
      }

      // Rising flame particles within the cone during the extend phase
      if (t < 0.5) {
        const forward = this.getFacingDirection();
        const angle = (Math.random() - 0.5) * (FLAME_WAVE_ARC_DEG * Math.PI / 180);
        const dist = 0.5 + Math.random() * (FLAME_WAVE_RANGE - 0.5);
        const dir = forward.clone().applyAxisAngle(FireMagic.Y_AXIS, angle);
        const pos = this.player.position.clone()
          .add(dir.multiplyScalar(dist))
          .add(new THREE.Vector3(0, 0.1 + Math.random() * 0.8, 0));
        this.particles.spawn({
          position: pos,
          velocity: new THREE.Vector3((Math.random() - 0.5) * 0.8, 1 + Math.random() * 2, (Math.random() - 0.5) * 0.8),
          life: 0.5 + Math.random() * 0.3,
          colorStart: ORANGE,
          colorEnd: OUTER_EDGE,
          size: 0.18,
          gravity: 1.5,
        });
      }

      // Ground scorch when the wave has fully extended
      if (!cone.scorched && t >= 0.5) {
        cone.scorched = true;
        this.scorchConeArea();
      }

      if (cone.timer >= cone.totalLife) {
        this.scene.remove(cone.mesh);
        cone.mesh.geometry.dispose();
        mat.dispose();
        this.cones.splice(i, 1);
      }
    }
  }

  /** 5-8 dark decals inside the cone footprint, fading over 2s. */
  private scorchConeArea(): void {
    const forward = this.getFacingDirection();
    const count = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const angle = (Math.random() - 0.5) * (FLAME_WAVE_ARC_DEG * Math.PI / 180);
      const dist = 0.5 + Math.random() * (FLAME_WAVE_RANGE - 0.5);
      const dir = forward.clone().applyAxisAngle(FireMagic.Y_AXIS, angle);
      const pos = this.player.position.clone().add(dir.multiplyScalar(dist));
      pos.y = 0.02;
      this.spawnScorch(pos, 0.5 + Math.random() * 0.7, 2.0);
    }
  }

  // =========================================================================
  // SPELL 3 — INFERNO
  // =========================================================================

  private castInferno(): void {
    this.tryCast('inferno', 'Inferno', INFERNO_MANA, INFERNO_COOLDOWN, () => {
      // Only one inferno at a time — recast replaces the previous one
      this.removeInferno();

      const target = this.getInfernoTarget();

      // Glowing ground circle
      const circleGeo = new THREE.CircleGeometry(INFERNO_RADIUS, 32);
      const circleMat = new THREE.MeshBasicMaterial({
        color: CORE_FLAME,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const circle = new THREE.Mesh(circleGeo, circleMat);
      circle.rotation.x = -Math.PI / 2;
      circle.position.set(target.x, 0.02, target.z);
      this.scene.add(circle);

      // Warm point light over the circle
      const light = new THREE.PointLight(new THREE.Color(CORE_FLAME), 1.5, 6, 2);
      light.position.set(target.x, 1.5, target.z);
      this.scene.add(light);

      this.activeInferno = { center: target.clone(), circle, light, timer: 0, tickTimer: 0 };

      // Ignition burst
      this.explodeAt(target.clone().add(new THREE.Vector3(0, 0.3, 0)), INFERNO_RADIUS, 10);

      console.log(`Inferno! — ${INFERNO_DAMAGE_PER_SEC} dmg/sec for ${INFERNO_DURATION}s`);
    });
  }

  /** Target ground position: lock-on target's feet, else 6 units ahead. */
  private getInfernoTarget(): THREE.Vector3 {
    const lockOn = this.player.combatController.getLockOnTargetPosition();
    if (lockOn) {
      return lockOn.clone().setY(0);
    }
    const forward = this.getFacingDirection();
    const target = this.player.position.clone().add(forward.multiplyScalar(INFERNO_CAST_RANGE));
    target.y = 0;
    target.x = Math.max(-WORLD_BOUNDS, Math.min(WORLD_BOUNDS, target.x));
    target.z = Math.max(-WORLD_BOUNDS, Math.min(WORLD_BOUNDS, target.z));
    return target;
  }

  private updateInferno(dt: number): void {
    if (!this.activeInferno) return;
    const inf = this.activeInferno;
    inf.timer += dt;

    // Damage tick: once per second while the circle is active
    inf.tickTimer += dt;
    if (inf.tickTimer >= 1 && inf.timer <= INFERNO_DURATION) {
      inf.tickTimer -= 1;
      this.applyInfernoDamage(inf);
    }

    // Rising flames: ~17/sec (1 per 0.06s) keeps ~20 visible in the budget
    if (inf.timer < INFERNO_DURATION) {
      const ang = Math.random() * Math.PI * 2;
      const dist = Math.sqrt(Math.random()) * INFERNO_RADIUS;
      const pos = new THREE.Vector3(
        inf.center.x + Math.cos(ang) * dist,
        0.1 + Math.random() * 0.4,
        inf.center.z + Math.sin(ang) * dist,
      );
      this.particles.spawn({
        position: pos,
        velocity: new THREE.Vector3((Math.random() - 0.5) * 0.6, 1.5 + Math.random() * 2.5, (Math.random() - 0.5) * 0.6),
        life: 0.9 + Math.random() * 0.5,
        colorStart: ORANGE,
        colorEnd: DEEP_EMBER,
        size: 0.22,
        gravity: 1.0,
      });
    }

    // Flickering light, dims as the inferno ages
    const ageRatio = Math.min(inf.timer / INFERNO_DURATION, 1);
    inf.light.intensity = 1.5 * (1 - ageRatio * 0.4) * (0.85 + Math.random() * 0.3);

    // Circle opacity: pulse while active, fade over the last second
    const mat = inf.circle.material as THREE.MeshBasicMaterial;
    if (inf.timer < INFERNO_DURATION) {
      mat.opacity = 0.3 + Math.sin(inf.timer * Math.PI * 2) * 0.07;
    } else {
      const fadeT = (inf.timer - INFERNO_DURATION) / INFERNO_FADE_DURATION;
      mat.opacity = 0.35 * (1 - Math.min(fadeT, 1));
    }

    if (inf.timer >= INFERNO_DURATION + INFERNO_FADE_DURATION) {
      this.removeInferno();
    }
  }

  private applyInfernoDamage(inf: ActiveInferno): void {
    for (const goblin of this.goblins) {
      if (!goblin.isAlive) continue;
      const dx = goblin.positionVec.x - inf.center.x;
      const dz = goblin.positionVec.z - inf.center.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist <= INFERNO_RADIUS) {
        const knock = dist > 0.01 ? new THREE.Vector3(dx, 0, dz).normalize() : new THREE.Vector3(1, 0, 0);
        goblin.takeDamage(INFERNO_DAMAGE_PER_SEC, knock);
        const dmgPos = goblin.positionVec.clone();
        dmgPos.y = 1.2;
        DamageNumbers.show(dmgPos, INFERNO_DAMAGE_PER_SEC, false, MAGIC_DMG_COLOR);
      }
    }
  }

  private removeInferno(): void {
    if (!this.activeInferno) return;
    this.scene.remove(this.activeInferno.circle);
    this.activeInferno.circle.geometry.dispose();
    (this.activeInferno.circle.material as THREE.Material).dispose();
    this.scene.remove(this.activeInferno.light);
    this.activeInferno.light.dispose();
    this.activeInferno = null;
  }

  // =========================================================================
  // SPELL 4 — PHOENIX DASH
  // =========================================================================

  private castPhoenixDash(): void {
    this.tryCast('phoenixdash', 'Phoenix Dash', PHOENIX_DASH_MANA, PHOENIX_DASH_COOLDOWN, () => {
      const dir = this.getFacingDirection();
      const start = this.player.position.clone();
      const arrival = start.clone().add(dir.clone().multiplyScalar(PHOENIX_DASH_DISTANCE));
      arrival.y = 0;
      arrival.x = Math.max(-WORLD_BOUNDS, Math.min(WORLD_BOUNDS, arrival.x));
      arrival.z = Math.max(-WORLD_BOUNDS, Math.min(WORLD_BOUNDS, arrival.z));

      // Wrap player model in fire (emissive orange swap)
      this.wrapPlayerInFire();

      this.player.canMove = false;
      this.player.canAct = false;
      this.player.setInvulnerable(true);

      // Departure ember burst
      for (let i = 0; i < 8; i++) {
        this.particles.spawn({
          position: start.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.6, Math.random() * 1.6, (Math.random() - 0.5) * 0.6)),
          velocity: new THREE.Vector3((Math.random() - 0.5) * 4, 1 + Math.random() * 2, (Math.random() - 0.5) * 4),
          life: 0.4 + Math.random() * 0.2,
          colorStart: CORE_FLAME,
          colorEnd: DEEP_EMBER,
          size: 0.14,
          gravity: 0.5,
        });
      }
      this.spawnScorch(start.clone().setY(0.02), 0.8, 3.0);
      this.flashLight(start.clone().add(new THREE.Vector3(0, 1, 0)), 0.2, 1.0, 3, CORE_FLAME);

      this.dash = {
        timer: PHOENIX_DASH_DURATION,
        duration: PHOENIX_DASH_DURATION,
        direction: dir.clone(),
        startPos: start.clone(),
        arrivalPos: arrival.clone(),
        wingTimer: 0,
        streakTimer: 0,
      };
      console.log(`Phoenix Dash! — ${PHOENIX_DASH_DAMAGE} dmg on arrival`);
    });
  }

  private updateDash(dt: number): void {
    if (!this.dash) return;
    const d = this.dash;
    d.timer -= dt;
    const progress = 1 - d.timer / d.duration;

    // Move the player along the dash path
    this.player.position.copy(d.startPos).lerp(d.arrivalPos, progress);
    this.player.position.y = 0;

    // Phoenix wing trails (two sweeping arcs) + body streak
    d.wingTimer -= dt;
    if (d.wingTimer <= 0) {
      d.wingTimer = 0.05;
      const right = new THREE.Vector3(d.direction.z, 0, -d.direction.x); // perpendicular
      for (const side of [-1, 1]) {
        const offset = right.clone().multiplyScalar(0.8 * side);
        const spawnPos = this.player.position.clone().add(offset).add(new THREE.Vector3(0, 0.2, 0));
        this.particles.spawn({
          position: spawnPos,
          velocity: new THREE.Vector3(0, 1.5 + Math.random() * 1.5, 0)
            .add(offset.clone().normalize().multiplyScalar(2.5))
            .add(d.direction.clone().multiplyScalar(-1)),
          life: 0.5 + Math.random() * 0.2,
          colorStart: INNER_GLOW,
          colorEnd: OUTER_EDGE,
          size: 0.25,
          gravity: 0.5,
        });
      }
    }
    d.streakTimer -= dt;
    if (d.streakTimer <= 0) {
      d.streakTimer = 0.04;
      this.particles.spawn({
        position: this.player.position.clone().add(new THREE.Vector3(0, 0.9, 0)),
        velocity: d.direction.clone().multiplyScalar(-0.5),
        life: 0.2,
        colorStart: CORE_WHITE,
        colorEnd: INNER_GLOW,
        size: 0.2,
      });
    }

    if (d.timer <= 0) {
      // --- Arrival ---
      this.restorePlayerMaterials();
      this.player.canMove = true;
      this.player.canAct = true;
      this.player.setInvulnerable(false);

      const arrivalPos = d.arrivalPos.clone();

      // Arrival AoE damage (2.5 unit radius)
      for (const goblin of this.goblins) {
        if (!goblin.isAlive) continue;
        const dx = goblin.positionVec.x - arrivalPos.x;
        const dz = goblin.positionVec.z - arrivalPos.z;
        if (Math.sqrt(dx * dx + dz * dz) <= PHOENIX_DASH_AOE_RADIUS) {
          const knock = Math.abs(dx) + Math.abs(dz) > 0.01
            ? new THREE.Vector3(dx, 0, dz).normalize()
            : new THREE.Vector3(1, 0, 0);
          goblin.takeDamage(PHOENIX_DASH_DAMAGE, knock);
          const dmgPos = goblin.positionVec.clone();
          dmgPos.y = 1.2;
          DamageNumbers.show(dmgPos, PHOENIX_DASH_DAMAGE, false, MAGIC_DMG_COLOR);
          console.log(`Phoenix Dash hit goblin for ${PHOENIX_DASH_DAMAGE} damage!`);
        }
      }

      // Arrival explosion + phoenix silhouette + scorch
      this.explodeAt(arrivalPos.clone().add(new THREE.Vector3(0, 0.5, 0)), PHOENIX_ARRIVAL_EXPLOSION_RADIUS, 16);
      this.flashLight(arrivalPos.clone().add(new THREE.Vector3(0, 1, 0)), 0.4, 2.5, 6, CORE_FLAME);
      this.spawnPhoenixSilhouette(arrivalPos);
      this.spawnScorch(arrivalPos.clone().setY(0.02), 2.5, 6.0);

      this.dash = null;
    }
  }

  private wrapPlayerInFire(): void {
    this.dashOriginalMaterials.clear();
    this.dashFireMaterials = [];
    this.player.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.Material) {
        this.dashOriginalMaterials.set(child, child.material);
        const fireMat = new THREE.MeshBasicMaterial({ color: CORE_FLAME });
        this.dashFireMaterials.push(fireMat);
        child.material = fireMat;
      }
    });
  }

  private restorePlayerMaterials(): void {
    this.player.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.Material) {
        const orig = this.dashOriginalMaterials.get(child);
        if (orig) child.material = orig;
      }
    });
    for (const mat of this.dashFireMaterials) mat.dispose();
    this.dashFireMaterials = [];
    this.dashOriginalMaterials.clear();
  }

  /** Rough phoenix silhouette built from overlapping flame sprites, rising + fading over 0.5s. */
  private spawnPhoenixSilhouette(at: THREE.Vector3): void {
    const group = new THREE.Group();
    const addSprite = (scaleX: number, scaleY: number, color: string, offset: THREE.Vector3): void => {
      const mat = new THREE.SpriteMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(scaleX, scaleY, 1);
      sprite.position.copy(offset);
      group.add(sprite);
    };
    // Body, wings, tail, head — stylized bird of flame
    addSprite(0.7, 1.0, INNER_GLOW, new THREE.Vector3(0, 0.8, 0));
    addSprite(1.2, 0.5, CORE_FLAME, new THREE.Vector3(-0.9, 0.9, 0));
    addSprite(1.2, 0.5, CORE_FLAME, new THREE.Vector3(0.9, 0.9, 0));
    addSprite(0.4, 0.8, OUTER_EDGE, new THREE.Vector3(0, -0.4, 0));
    addSprite(0.5, 0.5, CORE_WHITE, new THREE.Vector3(0, 1.5, 0));
    group.position.copy(at);
    this.scene.add(group);
    this.phoenixVFX = { group, timer: 0, totalLife: 0.5 };
  }

  private updatePhoenixVFX(dt: number): void {
    if (!this.phoenixVFX) return;
    const ph = this.phoenixVFX;
    ph.timer += dt;
    const t = ph.timer / ph.totalLife;

    // Rise to ~2.5 units over the lifetime
    ph.group.position.y += dt * (2.5 / ph.totalLife);

    // Unfurl: compressed → full proportions over the first 0.15s
    const unfurl = Math.min(ph.timer / 0.15, 1);
    ph.group.scale.set(1.2 - unfurl * 0.2, 0.3 + unfurl * 0.7, 1);

    // Fade out over the whole lifetime
    const fade = Math.max(0, 1 - t);
    ph.group.traverse((child) => {
      if (child instanceof THREE.Sprite) {
        (child.material as THREE.SpriteMaterial).opacity = 0.9 * fade;
      }
    });

    if (t >= 1) {
      // Dissipate into rising embers
      for (let i = 0; i < 8; i++) {
        this.particles.spawn({
          position: ph.group.position.clone().add(new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5))),
          velocity: new THREE.Vector3((Math.random() - 0.5) * 1.5, 1 + Math.random() * 2, (Math.random() - 0.5) * 1.5),
          life: 0.4 + Math.random() * 0.2,
          colorStart: CORE_FLAME,
          colorEnd: DEEP_EMBER,
          size: 0.15,
          gravity: 1.5,
        });
      }
      this.scene.remove(ph.group);
      this.disposeGroup(ph.group);
      this.phoenixVFX = null;
    }
  }

  // =========================================================================
  // Shared VFX helpers
  // =========================================================================

  /** Radial particle burst (explosion). */
  private explodeAt(position: THREE.Vector3, radius: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const dir = new THREE.Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2);
      if (dir.lengthSq() < 0.01) dir.set(0, 1, 0);
      dir.normalize();
      const speed = 2 + Math.random() * 4;
      const colorStart = Math.random() < 0.3 ? CORE_WHITE : (Math.random() < 0.5 ? CORE_FLAME : ORANGE);
      this.particles.spawn({
        position: position.clone().add(dir.clone().multiplyScalar(Math.min(0.2, radius * 0.4))),
        velocity: dir.multiplyScalar(speed),
        life: 0.3 + Math.random() * 0.4,
        colorStart,
        colorEnd: DEEP_EMBER,
        size: 0.14 + Math.random() * 0.12,
        gravity: -1.5, // slight fall for explosion debris
      });
    }
  }

  /** Brief point light flash that decays to zero over `duration`. */
  private flashLight(position: THREE.Vector3, duration: number, intensity: number, range: number, color: string): void {
    const light = new THREE.PointLight(new THREE.Color(color), intensity, range, 2);
    light.position.copy(position);
    this.scene.add(light);
    this.lightFlashes.push({ light, life: duration, totalLife: duration, startIntensity: intensity });
  }

  private updateLightFlashes(dt: number): void {
    for (let i = this.lightFlashes.length - 1; i >= 0; i--) {
      const f = this.lightFlashes[i];
      f.life -= dt;
      if (f.life <= 0) {
        this.scene.remove(f.light);
        f.light.dispose();
        this.lightFlashes.splice(i, 1);
        continue;
      }
      f.light.intensity = f.startIntensity * (f.life / f.totalLife);
    }
  }

  /** Dark ground decal that fades out over its lifetime. */
  private spawnScorch(position: THREE.Vector3, size: number, life: number): void {
    const geo = new THREE.PlaneGeometry(size, size);
    const mat = new THREE.MeshBasicMaterial({
      color: '#221100',
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(position);
    mesh.position.y = 0.02;
    mesh.renderOrder = 900;
    this.scene.add(mesh);
    this.scorches.push({ mesh, life, totalLife: life });
  }

  private updateScorches(dt: number): void {
    for (let i = this.scorches.length - 1; i >= 0; i--) {
      const s = this.scorches[i];
      s.life -= dt;
      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        s.mesh.geometry.dispose();
        (s.mesh.material as THREE.Material).dispose();
        this.scorches.splice(i, 1);
        continue;
      }
      (s.mesh.material as THREE.MeshBasicMaterial).opacity = 0.5 * (s.life / s.totalLife);
    }
  }

  private disposeGroup(group: THREE.Group): void {
    group.traverse((child) => {
      if (child instanceof THREE.Sprite) {
        (child.material as THREE.SpriteMaterial).dispose();
      }
    });
  }
}
