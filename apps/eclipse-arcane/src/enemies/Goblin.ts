import * as THREE from 'three';
import { Player } from '../player/Player';
import { DamageNumbers } from '../ui/DamageNumbers';

export type GoblinState = 'idle' | 'patrol' | 'chase' | 'attack' | 'hurt' | 'death';

const GOBLIN_HP = 60;
const GOBLIN_WALK_SPEED = 2.0;
const GOBLIN_RUN_SPEED = 5.0;
const GOBLIN_DETECTION_RANGE = 15.0;
const GOBLIN_ATTACK_RANGE = 3.0;
const GOBLIN_XP = 25;
const GOBLIN_LEASH_RANGE = 20.0;

const STAB_DAMAGE = 10;
const STAB_TELEGRAPH = 0.3;
const STAB_DURATION = 0.4;
const WILD_SWING_DAMAGE = 18;
const WILD_SWING_TELEGRAPH = 0.4;
const WILD_SWING_DURATION = 0.6;
const ATTACK_COOLDOWN = 1.0;
const HURT_DURATION = 0.2;
const HURT_KNOCKBACK = 0.3;
const DEATH_FALL_DURATION = 0.5;
const DEATH_FADE_DURATION = 1.0;

export class Goblin {
  public mesh: THREE.Group;
  public state: GoblinState = 'idle';
  public hp: number = GOBLIN_HP;
  public maxHp: number = GOBLIN_HP;
  public xpValue: number = GOBLIN_XP;

  private player: Player;
  private scene: THREE.Scene;
  private position: THREE.Vector3;
  private hpBar!: THREE.Group;
  private hpFill!: THREE.Mesh;
  private hpBarBackground!: THREE.Mesh;

  // Body parts for animation
  private bodyParts: {
    body: THREE.Mesh;
    head: THREE.Mesh;
    leftArm: THREE.Mesh;
    rightArm: THREE.Mesh;
    leftLeg: THREE.Mesh;
    rightLeg: THREE.Mesh;
  };

  // Original materials for flash effect
  private originalMaterials: Map<THREE.Mesh, THREE.Material | THREE.Material[]> = new Map();

  // Patrol waypoints
  private waypoints: THREE.Vector3[] = [];
  private currentWaypointIndex: number = 0;

  // Attack state machine
  private attackPhase: 'telegraph' | 'strike' | 'cooldown' | 'none' = 'none';
  private attackTimer: number = 0;
  private attackType: 'stab' | 'wild_swing' = 'stab';
  private attackDamage: number = 0;
  private attackHitChecked: boolean = false;
  private attackCooldownTimer: number = 0;

  // Hurt
  private hurtTimer: number = 0;
  private hurtDirection: THREE.Vector3 = new THREE.Vector3();

  // Death
  private deathTimer: number = 0;
  private deathFalling: boolean = false;

  // Idle bob
  private bobTimer: number = 0;

  // Alive flag
  private alive: boolean = true;

  constructor(
    player: Player,
    scene: THREE.Scene,
    spawnPos: THREE.Vector3,
    initialState: GoblinState = 'idle',
    waypoints?: THREE.Vector3[],
  ) {
    this.player = player;
    this.scene = scene;
    this.position = spawnPos.clone();
    this.state = initialState;

    if (waypoints) {
      this.waypoints = waypoints;
    }

    this.mesh = new THREE.Group();
    this.bodyParts = this.buildModel();
    this.createHealthBar();
    this.mesh.position.copy(this.position);
    scene.add(this.mesh);

    console.log(`Goblin spawned at (${spawnPos.x.toFixed(1)}, ${spawnPos.y.toFixed(1)}, ${spawnPos.z.toFixed(1)}) — state: ${initialState}`);
  }

  private buildModel(): {
    body: THREE.Mesh;
    head: THREE.Mesh;
    leftArm: THREE.Mesh;
    rightArm: THREE.Mesh;
    leftLeg: THREE.Mesh;
    rightLeg: THREE.Mesh;
  } {
    // Body: cylinder
    const bodyGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.0, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: '#4a7c2e', roughness: 0.7 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.5;
    body.castShadow = true;
    this.mesh.add(body);

    // Head: sphere
    const headGeo = new THREE.SphereGeometry(0.3, 8, 6);
    const headMat = new THREE.MeshStandardMaterial({ color: '#3a6520', roughness: 0.6 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.15;
    head.castShadow = true;
    this.mesh.add(head);

    // Eyes: two small white spheres
    const eyeGeo = new THREE.SphereGeometry(0.06, 4, 4);
    const eyeMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', emissive: '#FF0000', emissiveIntensity: 0.5 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.1, 1.2, -0.25);
    this.mesh.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.1, 1.2, -0.25);
    this.mesh.add(rightEye);

    // Arms: thin boxes
    const armGeo = new THREE.BoxGeometry(0.1, 0.5, 0.3);
    const armMat = new THREE.MeshStandardMaterial({ color: '#4a7c2e', roughness: 0.7 });

    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.position.set(-0.55, 0.8, 0);
    leftArm.castShadow = true;
    this.mesh.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.position.set(0.55, 0.8, 0);
    rightArm.castShadow = true;
    this.mesh.add(rightArm);

    // Legs: short boxes
    const legGeo = new THREE.BoxGeometry(0.2, 0.4, 0.2);
    const legMat = new THREE.MeshStandardMaterial({ color: '#3a5518', roughness: 0.8 });

    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.2, 0.2, 0);
    leftLeg.castShadow = true;
    this.mesh.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.2, 0.2, 0);
    rightLeg.castShadow = true;
    this.mesh.add(rightLeg);

    return { body, head, leftArm, rightArm, leftLeg, rightLeg };
  }

  private createHealthBar(): void {
    this.hpBar = new THREE.Group();
    this.hpBar.position.set(0, 1.65, 0);
    this.hpBar.renderOrder = 1000;

    const backgroundGeo = new THREE.PlaneGeometry(1, 0.1);
    const backgroundMat = new THREE.MeshBasicMaterial({ color: '#220909', transparent: true, opacity: 0.9, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
    this.hpBarBackground = new THREE.Mesh(backgroundGeo, backgroundMat);
    this.hpBarBackground.renderOrder = 1000;
    this.hpBar.add(this.hpBarBackground);

    const fillGeo = new THREE.PlaneGeometry(1, 0.1);
    const fillMat = new THREE.MeshBasicMaterial({ color: '#44CC44', transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
    this.hpFill = new THREE.Mesh(fillGeo, fillMat);
    this.hpFill.position.z = -0.006;
    this.hpFill.renderOrder = 1001;
    this.hpBar.add(this.hpFill);
    this.mesh.add(this.hpBar);
  }

  private updateHealthBar(): void {
    const ratio = Math.max(0, Math.min(1, this.hp / this.maxHp));
    this.hpBar.visible = ratio < 1 && (this.alive || this.state === 'death');
    this.hpFill.scale.x = ratio;
    this.hpFill.position.x = -(1 - ratio) * 0.5;
    const color = ratio < 0.25 ? '#FF3333' : ratio < 0.5 ? '#FFCC00' : '#44CC44';
    (this.hpFill.material as THREE.MeshBasicMaterial).color.set(color);
    if (this.player.camera) this.hpBar.lookAt(this.player.camera.position);
  }

  /** Get the goblin's world position */
  get positionVec(): THREE.Vector3 {
    return this.position;
  }

  /** Whether the goblin is alive */
  get isAlive(): boolean {
    return this.alive;
  }

  /** Whether the goblin is currently in an attack that can deal damage */
  get isAttacking(): boolean {
    return this.state === 'attack' && this.attackPhase === 'strike';
  }

  /** Distance to player (2D XZ plane) */
  private distanceToPlayer(): number {
    const dx = this.position.x - this.player.position.x;
    const dz = this.position.z - this.player.position.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  /** Direction from goblin to player (normalized, XZ plane) */
  private directionToPlayer(): THREE.Vector3 {
    const dir = new THREE.Vector3(
      this.player.position.x - this.position.x,
      0,
      this.player.position.z - this.position.z,
    );
    if (dir.length() < 0.001) return new THREE.Vector3(1, 0, 0);
    return dir.normalize();
  }

  /** Apply damage from player attack */
  takeDamage(amount: number, hitDirection?: THREE.Vector3): void {
    if (!this.alive) return;
    if (this.state === 'death') return;

    this.hp -= amount;
    console.log(`Goblin took ${amount} damage! HP: ${this.hp}/${this.maxHp}`);

    if (this.hp <= 0) {
      this.hp = 0;
      this.enterDeath();
      return;
    }

    // Enter hurt state
    this.state = 'hurt';
    this.hurtTimer = HURT_DURATION;
    this.attackPhase = 'none';
    this.attackTimer = 0;

    if (hitDirection) {
      this.hurtDirection.copy(hitDirection);
    } else {
      this.hurtDirection.copy(this.directionToPlayer().multiplyScalar(-1));
    }

    // Flash red
    this.flashRed();
  }

  /** Flash all body parts red */
  private flashRed(): void {
    const allMeshes = [
      this.bodyParts.body,
      this.bodyParts.head,
      this.bodyParts.leftArm,
      this.bodyParts.rightArm,
      this.bodyParts.leftLeg,
      this.bodyParts.rightLeg,
    ];

    for (const mesh of allMeshes) {
      if (!this.originalMaterials.has(mesh)) {
        this.originalMaterials.set(mesh, mesh.material);
      }
      const redMat = new THREE.MeshStandardMaterial({
        color: '#FF0000',
        roughness: 0.5,
        emissive: '#FF0000',
        emissiveIntensity: 0.5,
      });
      mesh.material = redMat;
    }
  }

  /** Restore original materials */
  private restoreMaterials(): void {
    const allMeshes = [
      this.bodyParts.body,
      this.bodyParts.head,
      this.bodyParts.leftArm,
      this.bodyParts.rightArm,
      this.bodyParts.leftLeg,
      this.bodyParts.rightLeg,
    ];

    for (const mesh of allMeshes) {
      const orig = this.originalMaterials.get(mesh);
      if (orig) {
        mesh.material = orig;
      }
    }
    this.originalMaterials.clear();
  }

  /** Enter death state */
  private enterDeath(): void {
    this.state = 'death';
    this.alive = false;
    this.deathTimer = DEATH_FALL_DURATION;
    this.deathFalling = true;
    this.attackPhase = 'none';
    console.log('Goblin defeated! +25 XP');
  }

  /** Check if player is within this goblin's attack range and arc */
  private isPlayerInAttackArc(): boolean {
    const dist = this.distanceToPlayer();
    if (dist > GOBLIN_ATTACK_RANGE) return false;

    // Direction goblin is facing (toward player during chase/attack)
    const facing = this.directionToPlayer();
    const toPlayer = new THREE.Vector3(
      this.player.position.x - this.position.x,
      0,
      this.player.position.z - this.position.z,
    ).normalize();

    const dot = facing.dot(toPlayer);
    // Within 60-degree arc
    return dot > 0.5; // cos(60°) ≈ 0.5
  }

  update(deltaTime: number): void {
    if (!this.alive && this.state !== 'death') return;

    const dt = Math.min(deltaTime, 0.1);

    switch (this.state) {
      case 'idle':
        this.updateIdle(dt);
        break;
      case 'patrol':
        this.updatePatrol(dt);
        break;
      case 'chase':
        this.updateChase(dt);
        break;
      case 'attack':
        this.updateAttack(dt);
        break;
      case 'hurt':
        this.updateHurt(dt);
        break;
      case 'death':
        this.updateDeath(dt);
        break;
    }

    // Sync mesh position and update billboard UI every frame
    this.mesh.position.copy(this.position);
    this.updateHealthBar();
  }

  private updateIdle(dt: number): void {
    // Bob in place
    this.bobTimer += dt;
    const bobOffset = Math.sin(this.bobTimer * 3) * 0.05;
    this.mesh.position.y = this.position.y + bobOffset;

    // Check detection range
    if (this.distanceToPlayer() <= GOBLIN_DETECTION_RANGE) {
      this.state = 'chase';
      console.log('Goblin detected player — chasing!');
    }
  }

  private updatePatrol(dt: number): void {
    if (this.waypoints.length === 0) {
      // No waypoints, just idle
      this.state = 'idle';
      return;
    }

    const target = this.waypoints[this.currentWaypointIndex];
    const dx = target.x - this.position.x;
    const dz = target.z - this.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 0.3) {
      // Reached waypoint, move to next
      this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.waypoints.length;
    } else {
      // Move toward waypoint
      const dir = new THREE.Vector3(dx, 0, dz).normalize();
      this.position.x += dir.x * GOBLIN_WALK_SPEED * dt;
      this.position.z += dir.z * GOBLIN_WALK_SPEED * dt;
    }

    // Face movement direction
    this.faceDirection(new THREE.Vector3(dx, 0, dz).normalize());

    // Bob
    this.bobTimer += dt;
    const bobOffset = Math.sin(this.bobTimer * 2) * 0.04;

    // Check detection range
    if (this.distanceToPlayer() <= GOBLIN_DETECTION_RANGE) {
      this.state = 'chase';
      console.log('Goblin detected player — chasing!');
    }
  }

  private updateChase(dt: number): void {
    const dist = this.distanceToPlayer();

    // Check if player is too far (leash)
    if (dist > GOBLIN_LEASH_RANGE) {
      if (this.waypoints.length > 0) {
        this.state = 'patrol';
      } else {
        this.state = 'idle';
      }
      console.log('Goblin lost interest — returning');
      return;
    }

    // If within attack range, attack
    if (dist <= GOBLIN_ATTACK_RANGE) {
      this.state = 'attack';
      this.startAttack();
      return;
    }

    // Run toward player
    const dir = this.directionToPlayer();
    this.position.x += dir.x * GOBLIN_RUN_SPEED * dt;
    this.position.z += dir.z * GOBLIN_RUN_SPEED * dt;

    // Face player
    this.faceDirection(dir);
  }

  private startAttack(): void {
    // Randomly choose attack type
    this.attackType = Math.random() < 0.5 ? 'stab' : 'wild_swing';

    if (this.attackType === 'stab') {
      this.attackDamage = STAB_DAMAGE;
      this.attackTimer = STAB_TELEGRAPH;
      console.log('Goblin prepares Stab attack (10 dmg)');
    } else {
      this.attackDamage = WILD_SWING_DAMAGE;
      this.attackTimer = WILD_SWING_TELEGRAPH;
      console.log('Goblin prepares Wild Swing attack (18 dmg)');
    }

    this.attackPhase = 'telegraph';
    this.attackHitChecked = false;
  }

  private updateAttack(dt: number): void {
    // Handle attack cooldown after strike
    if (this.attackPhase === 'cooldown') {
      this.attackCooldownTimer -= dt;
      if (this.attackCooldownTimer <= 0) {
        // Check if player still in range
        if (this.distanceToPlayer() <= GOBLIN_ATTACK_RANGE) {
          this.startAttack();
        } else {
          this.state = 'chase';
          console.log('Goblin resumes chase after attack');
        }
      }
      return;
    }

    this.attackTimer -= dt;

    if (this.attackPhase === 'telegraph') {
      // Telegraph animation: raise arms
      if (this.attackType === 'stab') {
        // Raise right arm
        this.bodyParts.rightArm.position.y = 0.8 + (1 - this.attackTimer / STAB_TELEGRAPH) * 0.3;
        this.bodyParts.rightArm.rotation.z = -(1 - this.attackTimer / STAB_TELEGRAPH) * 0.8;
      } else {
        // Spin windup: rotate body slightly
        const progress = 1 - this.attackTimer / WILD_SWING_TELEGRAPH;
        this.mesh.rotation.y = progress * 0.5;
        this.bodyParts.leftArm.position.y = 0.8 + progress * 0.2;
      }

      if (this.attackTimer <= 0) {
        // Telegraph complete, start strike
        this.attackPhase = 'strike';
        this.attackTimer = this.attackType === 'stab' ? STAB_DURATION : WILD_SWING_DURATION;
        console.log(`Goblin strikes! (${this.attackType})`);
      }
    } else if (this.attackPhase === 'strike') {
      const totalDuration = this.attackType === 'stab' ? STAB_DURATION : WILD_SWING_DURATION;
      const progress = 1 - this.attackTimer / totalDuration;

      // Check hit at mid-frame (~50%)
      if (!this.attackHitChecked && this.attackTimer <= totalDuration * 0.5) {
        this.attackHitChecked = true;
        this.checkHitOnPlayer();
      }

      if (this.attackType === 'stab') {
        // Lunge forward
        const lungeAmount = Math.sin(progress * Math.PI) * 1.0;
        const dir = this.directionToPlayer();
        this.position.x += dir.x * lungeAmount * dt * 3;
        this.position.z += dir.z * lungeAmount * dt * 3;
      } else {
        // Wide swing: rotate the mesh
        this.mesh.rotation.y = Math.sin(progress * Math.PI) * 1.2;
      }

      if (this.attackTimer <= 0) {
        // Strike complete, enter cooldown
        this.attackPhase = 'cooldown';
        this.attackCooldownTimer = ATTACK_COOLDOWN;

        // Reset arm/body positions
        this.bodyParts.rightArm.position.y = 0.8;
        this.bodyParts.rightArm.rotation.z = 0;
        this.bodyParts.leftArm.position.y = 0.8;
        this.mesh.rotation.y = 0;
      }
    }
  }

  /** Check if goblin's attack hits the player */
  private checkHitOnPlayer(): void {
    if (!this.player.isAlive()) return;
    if (this.player.isPlayerInvulnerable()) {
      console.log('Goblin attack missed — player is invulnerable (dodge i-frames)');
      return;
    }

    if (this.isPlayerInAttackArc()) {
      this.player.takeDamage(this.attackDamage);
      DamageNumbers.show(this.player.position.clone().add(new THREE.Vector3(0, 1.8, 0)), this.attackDamage, false);
      console.log(`Goblin ${this.attackType} hits player for ${this.attackDamage} damage!`);
      // Trigger screen flash
      this.triggerScreenFlash();
    }
  }

  /** Trigger a red screen flash overlay */
  private triggerScreenFlash(): void {
    const overlay = document.getElementById('damage-flash');
    if (!overlay) return;
    
    overlay.classList.remove('flash-active');
    void overlay.offsetWidth; // Force reflow
    overlay.classList.add('flash-active');
    
    // Remove after 0.15s
    setTimeout(() => {
      overlay.classList.remove('flash-active');
    }, 150);
  }

  private updateHurt(dt: number): void {
    this.hurtTimer -= dt;

    // Knockback
    const knockbackSpeed = HURT_KNOCKBACK / HURT_DURATION;
    this.position.x += this.hurtDirection.x * knockbackSpeed * dt;
    this.position.z += this.hurtDirection.z * knockbackSpeed * dt;

    if (this.hurtTimer <= 0) {
      // Restore materials
      this.restoreMaterials();

      // Return to chase or attack based on distance
      const dist = this.distanceToPlayer();
      if (dist <= GOBLIN_ATTACK_RANGE) {
        this.state = 'attack';
        this.startAttack();
      } else if (dist <= GOBLIN_DETECTION_RANGE) {
        this.state = 'chase';
      } else {
        if (this.waypoints.length > 0) {
          this.state = 'patrol';
        } else {
          this.state = 'idle';
        }
      }
    }
  }

  private updateDeath(dt: number): void {
    if (this.deathFalling) {
      this.deathTimer -= dt;
      const progress = 1 - this.deathTimer / DEATH_FALL_DURATION;
      // Rotate 90 degrees on X axis (fall over)
      this.mesh.rotation.x = progress * (Math.PI / 2);

      if (this.deathTimer <= 0) {
        this.deathFalling = false;
        this.deathTimer = DEATH_FADE_DURATION;
      }
    } else {
      this.deathTimer -= dt;
      // Fade opacity over time
      const opacity = Math.max(0, this.deathTimer / DEATH_FADE_DURATION);
      this.setMeshOpacity(opacity);

      if (this.deathTimer <= 0) {
        // Remove from scene
        this.scene.remove(this.mesh);
        this.disposeMesh();
      }
    }
  }

  /** Set opacity on all mesh materials */
  private setMeshOpacity(opacity: number): void {
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.Material) {
        child.material.transparent = true;
        child.material.opacity = opacity;
      }
    });
  }

  /** Face a direction (rotation on Y axis) */
  private faceDirection(dir: THREE.Vector3): void {
    if (dir.length() < 0.001) return;
    const angle = Math.atan2(dir.x, dir.z);
    this.mesh.rotation.y = angle;
  }

  /** Clean up mesh resources */
  private disposeMesh(): void {
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });
  }

  /** Full cleanup */
  dispose(): void {
    if (this.mesh.parent) {
      this.scene.remove(this.mesh);
    }
    this.disposeMesh();
  }
}
