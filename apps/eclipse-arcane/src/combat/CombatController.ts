import * as THREE from 'three';
import { Player } from '../player/Player';
import {
  LIGHT_ATTACK_DAMAGE,
  LIGHT_ATTACK_DURATION,
  LIGHT_ATTACK_RANGE,
  LIGHT_ATTACK_ARC,
  HEAVY_ATTACK_DAMAGE,
  HEAVY_ATTACK_DURATION,
  HEAVY_ATTACK_RANGE,
  HEAVY_ATTACK_ARC,
  HEAVY_ATTACK_STAMINA_COST,
  COMBO_WINDOW,
} from '../utils/constants';

interface ActiveEffect {
  mesh: THREE.Object3D;
  remainingLife: number;
  totalLife: number;
}

export type CombatState = 'idle' | 'light_attack' | 'heavy_windup' | 'heavy_attack' | 'locked_on';

export class CombatController {
  private player: Player;
  private scene: THREE.Scene;

  // --- Light attack state ---
  private lightComboStep: number = 0;        // 0, 1, 2
  private lightAttackTimer: number = 0;       // countdown for current hit
  private comboWindowTimer: number = 0;       // countdown for next input
  private isLightAttacking: boolean = false;

  // --- Heavy attack state ---
  private heavyAttackTimer: number = 0;
  private isHeavyWindup: boolean = false;
  private isHeavyStriking: boolean = false;
  private heavyWindupIndicator: THREE.Mesh | null = null;

  // --- Lock-on state ---
  private isLockedOn: boolean = false;
  private lockOnReticle: THREE.Mesh | null = null;
  private lockOnPulseTimer: number = 0;

  // --- Active visual effects ---
  private effects: ActiveEffect[] = [];

  // --- Input flags (set by listeners, cleared each frame after processing) ---
  private lightAttackRequested: boolean = false;
  private heavyAttackRequested: boolean = false;
  private lockOnToggleRequested: boolean = false;
  private lockOnCancelRequested: boolean = false;

  // Bound event handlers for cleanup
  private onMouseDown: (e: MouseEvent) => void;
  private onKeyDown: (e: KeyboardEvent) => void;

  constructor(player: Player, scene: THREE.Scene) {
    this.player = player;
    this.scene = scene;

    // Bind event handlers
    this.onMouseDown = this.handleMouseDown.bind(this);
    this.onKeyDown = this.handleKeyDown.bind(this);

    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('keydown', this.onKeyDown);
  }

  // --- Public API ---

  getCombatStateLabel(): string {
    if (this.isHeavyWindup || this.isHeavyStriking) return 'HEAVY ATTACK';
    if (this.isLightAttacking) return 'ATTACKING';
    if (this.isLockedOn) return 'LOCKED ON';
    return 'IDLE';
  }

  get isAttacking(): boolean {
    return this.isLightAttacking || this.isHeavyWindup || this.isHeavyStriking;
  }

  /** Player's attack-facing direction (lock-on overrides normal facing) */
  getAttackDirection(): THREE.Vector3 {
    if (this.isLockedOn && this.lockOnReticle) {
      const toReticle = new THREE.Vector3()
        .subVectors(this.lockOnReticle.position, this.player.position);
      toReticle.y = 0;
      if (toReticle.length() > 0.001) return toReticle.normalize();
    }
    // Default: player's camera forward
    return new THREE.Vector3(0, 0, -1)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.cameraYaw);
  }

  update(deltaTime: number): void {
    const dt = Math.min(deltaTime, 0.1);

    // Process lock-on input
    this.processLockOnInput();

    // Only allow new attacks if player can act and is not already attacking
    if (this.player.canAct && !this.isLightAttacking && !this.isHeavyWindup && !this.isHeavyStriking) {
      if (this.lightAttackRequested) {
        this.startLightAttack();
      } else if (this.heavyAttackRequested && this.player.stamina >= HEAVY_ATTACK_STAMINA_COST) {
        this.startHeavyAttack();
      }
    }

    // Clear one-shot input flags
    this.lightAttackRequested = false;
    this.heavyAttackRequested = false;
    this.lockOnToggleRequested = false;
    this.lockOnCancelRequested = false;

    // Update light attack
    if (this.isLightAttacking) {
      this.updateLightAttack(dt);
    }

    // Update heavy attack
    if (this.isHeavyWindup || this.isHeavyStriking) {
      this.updateHeavyAttack(dt);
    }

    // Update combo window
    if (this.comboWindowTimer > 0 && !this.isLightAttacking) {
      this.comboWindowTimer -= dt;
      if (this.comboWindowTimer <= 0) {
        this.lightComboStep = 0; // combo reset
      }
    }

    // Update lock-on reticle
    if (this.isLockedOn && this.lockOnReticle) {
      this.updateLockOnReticle(dt);
    }

    // Update visual effects
    this.updateEffects(dt);
  }

  // --- Input handlers ---

  private handleMouseDown(e: MouseEvent): void {
    if (e.button === 0) {
      // Left click — light attack
      this.lightAttackRequested = true;
    } else if (e.button === 2) {
      // Right click — heavy attack
      this.heavyAttackRequested = true;
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    // Tab: toggle lock-on
    if (e.code === 'Tab') {
      e.preventDefault();
      this.lockOnToggleRequested = true;
    }
    // Escape: cancel lock-on
    if (e.code === 'Escape') {
      this.lockOnCancelRequested = true;
    }
    // E key: backup heavy attack
    if (e.code === 'KeyE' && !e.repeat) {
      // Only use E for heavy attack if not locked on (E is also interact)
      // For now, E triggers heavy attack as backup
      this.heavyAttackRequested = true;
    }
  }

  // --- Light Attack ---

  private startLightAttack(): void {
    const step = this.lightComboStep;
    if (step >= 3) return; // shouldn't happen

    this.isLightAttacking = true;
    this.lightAttackTimer = LIGHT_ATTACK_DURATION[step];
    this.player.canMove = false;
    this.player.canAct = false;

    const arcDeg = LIGHT_ATTACK_ARC[step];
    const range = LIGHT_ATTACK_RANGE[step];
    const dmg = LIGHT_ATTACK_DAMAGE[step];

    console.log(`Light Attack ${step + 1} — ${dmg} dmg`);

    // Spawn swing arc visual
    this.spawnSwingArc(arcDeg, range, LIGHT_ATTACK_DURATION[step], '#FFAA33');
  }

  private updateLightAttack(dt: number): void {
    this.lightAttackTimer -= dt;

    // Update effect opacities proportionally
    // (handled in updateEffects)

    if (this.lightAttackTimer <= 0) {
      // Attack finished
      this.isLightAttacking = false;
      this.player.canMove = true;
      this.player.canAct = true;

      // Advance combo
      this.lightComboStep++;
      if (this.lightComboStep >= 3) {
        this.lightComboStep = 0; // chain complete, reset
      }
      // Start combo window
      this.comboWindowTimer = COMBO_WINDOW;
    }
  }

  // --- Heavy Attack ---

  private startHeavyAttack(): void {
    // Deduct stamina
    this.player.stamina -= HEAVY_ATTACK_STAMINA_COST;
    this.player.canMove = false;
    this.player.canAct = false;

    this.isHeavyWindup = true;
    this.heavyAttackTimer = HEAVY_ATTACK_DURATION;

    // Spawn windup indicator (growing sphere near player)
    this.spawnWindupIndicator();

    console.log(`Heavy Attack windup — ${HEAVY_ATTACK_DAMAGE} dmg incoming`);
  }

  private updateHeavyAttack(dt: number): void {
    this.heavyAttackTimer -= dt;

    if (this.isHeavyWindup) {
      // Grow windup indicator
      if (this.heavyWindupIndicator) {
        const progress = 1 - (this.heavyAttackTimer / HEAVY_ATTACK_DURATION);
        const scale = 0.3 + progress * 0.7;
        this.heavyWindupIndicator.scale.setScalar(scale);
        (this.heavyWindupIndicator.material as THREE.MeshBasicMaterial).opacity =
          0.4 + progress * 0.4;
      }

      // Check if windup complete
      if (this.heavyAttackTimer <= 0) {
        // Strike!
        this.isHeavyWindup = false;
        this.isHeavyStriking = true;
        this.heavyAttackTimer = 0.15; // brief strike flash duration

        // Remove windup indicator
        this.removeWindupIndicator();

        // Spawn strike arc
        this.spawnSwingArc(HEAVY_ATTACK_ARC, HEAVY_ATTACK_RANGE, 0.4, '#FF4422');

        // Spawn particle burst at strike point
        const strikePos = this.player.position.clone()
          .add(this.getAttackDirection().multiplyScalar(HEAVY_ATTACK_RANGE));
        strikePos.y = 1.0;
        this.spawnParticleBurst(strikePos);

        console.log(`Heavy Attack — ${HEAVY_ATTACK_DAMAGE} dmg`);
      }
    } else if (this.isHeavyStriking) {
      // Brief strike flash phase
      if (this.heavyAttackTimer <= 0) {
        this.isHeavyStriking = false;
        this.player.canMove = true;
        this.player.canAct = true;

        // Reset combo on heavy attack
        this.lightComboStep = 0;
        this.comboWindowTimer = 0;
      }
    }
  }

  // --- Lock-On ---

  private processLockOnInput(): void {
    if (this.lockOnCancelRequested && this.isLockedOn) {
      this.cancelLockOn();
    } else if (this.lockOnToggleRequested) {
      if (this.isLockedOn) {
        this.cancelLockOn();
      } else {
        this.enableLockOn();
      }
    }
  }

  private enableLockOn(): void {
    this.isLockedOn = true;
    this.lockOnPulseTimer = 0;

    // Create reticle: torus ring
    const torusGeo = new THREE.TorusGeometry(0.3, 0.05, 8, 16);
    const torusMat = new THREE.MeshStandardMaterial({
      color: '#00FFFF',
      emissive: '#00CCFF',
      emissiveIntensity: 1.5,
      roughness: 0.2,
      transparent: true,
      opacity: 0.9,
      depthTest: true,
      depthWrite: false,
    });
    this.lockOnReticle = new THREE.Mesh(torusGeo, torusMat);
    this.lockOnReticle.renderOrder = 999;
    this.scene.add(this.lockOnReticle);

    console.log('Lock-on enabled');
  }

  private cancelLockOn(): void {
    this.isLockedOn = false;
    if (this.lockOnReticle) {
      this.scene.remove(this.lockOnReticle);
      this.lockOnReticle.geometry.dispose();
      (this.lockOnReticle.material as THREE.Material).dispose();
      this.lockOnReticle = null;
    }
    console.log('Lock-on cancelled');
  }

  private updateLockOnReticle(dt: number): void {
    if (!this.lockOnReticle) return;

    // Position 5m in front of player at chest height
    const forward = this.getDefaultForward();
    const reticlePos = this.player.position.clone()
      .add(forward.multiplyScalar(5));
    reticlePos.y = 1.5;
    this.lockOnReticle.position.copy(reticlePos);

    // Pulse scale: 1.0 → 1.1 → 1.0 over 1s
    this.lockOnPulseTimer += dt;
    const pulseCycle = this.lockOnPulseTimer % 1.0;
    // Use sine for smooth pulse
    const scale = 1.0 + Math.sin(pulseCycle * Math.PI * 2) * 0.1;
    this.lockOnReticle.scale.setScalar(1.0 + (scale - 1.0) * 0.5);
    // Actually, implement the spec: 1.0 → 1.1 → 1.0 loop
    const pingPong = pulseCycle < 0.5
      ? pulseCycle * 2        // 0→1 over 0.5s
      : (1 - pulseCycle) * 2; // 1→0 over 0.5s
    const targetScale = 1.0 + pingPong * 0.1;
    this.lockOnReticle.scale.setScalar(targetScale);

    // Make it face the camera
    this.lockOnReticle.lookAt(this.player.camera.position);
  }

  // --- Visual Effects ---

  private spawnSwingArc(arcDegrees: number, range: number, duration: number, color: string): void {
    const forward = this.getAttackDirection();
    const halfArc = (arcDegrees / 2) * (Math.PI / 180);
    const segments = 20;

    // Build triangle-fan geometry: origin + arc points
    const vertices: number[] = [];
    // Center vertex (relative to mesh origin)
    vertices.push(0, 0, 0);

    for (let i = 0; i <= segments; i++) {
      const angle = -halfArc + (arcDegrees * Math.PI / 180) * (i / segments);
      const x = Math.sin(angle) * range;
      const z = Math.cos(angle) * range;
      vertices.push(x, 0, z);
    }

    const indices: number[] = [];
    for (let i = 0; i < segments; i++) {
      indices.push(0, i + 1, i + 2);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const arcMesh = new THREE.Mesh(geo, mat);
    arcMesh.renderOrder = 998;

    // Position the arc: the arc geometry is built on XZ plane centered at origin.
    // Place it at the player's position, offset slightly forward, at waist height.
    const arcPos = this.player.position.clone();
    arcPos.y = 1.0;
    arcMesh.position.copy(arcPos);

    // Rotate the arc to face the attack direction
    const angle = Math.atan2(forward.x, forward.z);
    arcMesh.rotation.y = angle;

    this.scene.add(arcMesh);

    this.effects.push({
      mesh: arcMesh,
      remainingLife: duration,
      totalLife: duration,
    });
  }

  private spawnWindupIndicator(): void {
    const geo = new THREE.SphereGeometry(0.15, 8, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: '#FF4422',
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });
    this.heavyWindupIndicator = new THREE.Mesh(geo, mat);

    // Place at player's right side (roughly where an arm would be)
    const pos = this.player.position.clone();
    pos.y = 1.3;
    const right = new THREE.Vector3(1, 0, 0)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.cameraYaw);
    pos.add(right.multiplyScalar(0.5));
    this.heavyWindupIndicator.position.copy(pos);

    this.scene.add(this.heavyWindupIndicator);
  }

  private removeWindupIndicator(): void {
    if (this.heavyWindupIndicator) {
      this.scene.remove(this.heavyWindupIndicator);
      this.heavyWindupIndicator.geometry.dispose();
      (this.heavyWindupIndicator.material as THREE.Material).dispose();
      this.heavyWindupIndicator = null;
    }
  }

  private spawnParticleBurst(position: THREE.Vector3): void {
    const particleCount = 6 + Math.floor(Math.random() * 3); // 5-8
    for (let i = 0; i < particleCount; i++) {
      const geo = new THREE.SphereGeometry(0.08, 4, 3);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.08 + Math.random() * 0.08, 1, 0.5 + Math.random() * 0.4),
        transparent: true,
        opacity: 1,
        depthWrite: false,
      });
      const particle = new THREE.Mesh(geo, mat);
      particle.position.copy(position);

      // Random velocity
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        Math.random() * 3 + 1,
        (Math.random() - 0.5) * 4,
      );
      particle.userData['velocity'] = vel;

      this.scene.add(particle);
      this.effects.push({
        mesh: particle,
        remainingLife: 0.5 + Math.random() * 0.3,
        totalLife: 0.5,
      });
    }
  }

  private updateEffects(dt: number): void {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      effect.remainingLife -= dt;

      if (effect.remainingLife <= 0) {
        // Remove
        this.scene.remove(effect.mesh);
        if (effect.mesh instanceof THREE.Mesh) {
          effect.mesh.geometry.dispose();
          (effect.mesh.material as THREE.Material).dispose();
        }
        this.effects.splice(i, 1);
        continue;
      }

      // Fade out: opacity based on remaining life
      const lifeRatio = effect.remainingLife / effect.totalLife;
      if (effect.mesh instanceof THREE.Mesh) {
        const mat = effect.mesh.material as THREE.MeshBasicMaterial;
        if (mat.transparent && effect.totalLife > 0.3) {
          // Swing arcs: fade proportional
          mat.opacity = 0.7 * lifeRatio;
        }
      }

      // Apply velocity to particles
      if (effect.mesh.userData['velocity']) {
        const vel = effect.mesh.userData['velocity'] as THREE.Vector3;
        effect.mesh.position.x += vel.x * dt;
        effect.mesh.position.y += vel.y * dt;
        effect.mesh.position.z += vel.z * dt;
        // Gravity on particles
        vel.y -= 6 * dt;
        // Fade particles
        if (effect.mesh instanceof THREE.Mesh) {
          const mat = effect.mesh.material as THREE.MeshBasicMaterial;
          mat.opacity = Math.max(0, lifeRatio);
        }
      }
    }
  }

  // --- Helpers ---

  private getDefaultForward(): THREE.Vector3 {
    return new THREE.Vector3(0, 0, -1)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), this.player.cameraYaw);
  }

  /** Get the world-space forward direction based on current facing */
  private getPlayerForward(): THREE.Vector3 {
    return this.getAttackDirection();
  }

  dispose(): void {
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('keydown', this.onKeyDown);
    this.cancelLockOn();
    this.removeWindupIndicator();
    // Clean up all effects
    for (const effect of this.effects) {
      this.scene.remove(effect.mesh);
      if (effect.mesh instanceof THREE.Mesh) {
        effect.mesh.geometry.dispose();
        (effect.mesh.material as THREE.Material).dispose();
      }
    }
    this.effects = [];
  }
}
