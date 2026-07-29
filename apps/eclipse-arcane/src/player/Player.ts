import * as THREE from 'three';
import {
  PLAYER_WALK_SPEED, PLAYER_RUN_SPEED, PLAYER_SPRINT_SPEED,
  PLAYER_JUMP_VELOCITY, PLAYER_HEIGHT,
  STAMINA_MAX, STAMINA_SPRINT_COST, STAMINA_DODGE_COST,
  STAMINA_REGEN_RATE, STAMINA_REGEN_DELAY, STAMINA_EXHAUST_DELAY,
  DODGE_DISTANCE, DODGE_DURATION, DODGE_IFRAMES, DODGE_COOLDOWN,
  GRAVITY, JUMP_HEIGHT,
  CAMERA_DEFAULT_OFFSET, CAMERA_ZOOM_MIN, CAMERA_ZOOM_MAX, CAMERA_LERP_FACTOR,
} from '../utils/constants';
import { CombatController } from '../combat/CombatController';

export type PlayerState = 'idle' | 'walk' | 'run' | 'sprint' | 'jump' | 'dodge';

export class Player {
  // Three.js objects
  public model: THREE.Group;
  public mesh: THREE.Group;

  // Physics state
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;
  private isGrounded: boolean = true;
  private verticalVelocity: number = 0;

  // Movement
  private moveDirection: THREE.Vector3 = new THREE.Vector3();
  private inputVector: THREE.Vector2 = new THREE.Vector2();

  // State
  public state: PlayerState = 'idle';
  private previousState: PlayerState = 'idle';

  // Combat integration
  public canMove: boolean = true;
  public canAct: boolean = true;
  public combatController: CombatController;

  // Stamina
  public stamina: number = STAMINA_MAX;
  private staminaRegenTimer: number = 0;
  private isExhausted: boolean = false;

  // Dodge
  private isDodging: boolean = false;
  private dodgeTimer: number = 0;
  private dodgeDirection: THREE.Vector3 = new THREE.Vector3();
  private dodgeCooldownTimer: number = 0;
  private isInvulnerable: boolean = false;

  // Double-tap detection
  private lastTapDirection: string = '';
  private lastTapTime: number = 0;
  private readonly DOUBLE_TAP_THRESHOLD = 0.3;

  // Camera
  public camera: THREE.PerspectiveCamera;
  private cameraTarget: THREE.Vector3 = new THREE.Vector3();
  private cameraDistance: number = 8;
  public cameraYaw: number = 0; // horizontal angle in radians
  private cameraPitch: number = 0.4; // slight downward angle
  private isOrbiting: boolean = false;
  private isRightMouseDown: boolean = false;

  // Input state
  private keys: Set<string> = new Set();

  // Callbacks
  private onStateChange: ((oldState: PlayerState, newState: PlayerState) => void) | null = null;

  constructor(scene: THREE.Scene) {
    this.position = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3();

    // Build player model
    this.model = new THREE.Group();
    this.mesh = this.buildPlayerModel();
    this.model.add(this.mesh);
    this.model.position.copy(this.position);
    scene.add(this.model);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    this.resetCameraPosition();

    // Combat controller
    this.combatController = new CombatController(this, scene);

    // Input listeners
    this.setupInput();

    // Resize handler
    window.addEventListener('resize', this.onResize);
  }

  private buildPlayerModel(): THREE.Group {
    const group = new THREE.Group();

    // Body: cylinder (tunic)
    const bodyGeo = new THREE.CylinderGeometry(0.35, 0.4, 1.2, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: '#4A90D9', roughness: 0.6 }); // blue tunic
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.9;
    body.castShadow = true;
    group.add(body);

    // Head: sphere
    const headGeo = new THREE.SphereGeometry(0.25, 8, 6);
    const headMat = new THREE.MeshStandardMaterial({ color: '#F5D0B0', roughness: 0.5 }); // skin
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.75;
    head.castShadow = true;
    group.add(head);

    // Eclipse Core: small glowing orb on chest
    const coreGeo = new THREE.SphereGeometry(0.15, 8, 6);
    const coreMat = new THREE.MeshStandardMaterial({
      color: '#FF8C42',
      emissive: '#FF6600',
      emissiveIntensity: 0.8,
      roughness: 0.2,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.set(0, 1.25, 0.35);
    group.add(core);

    // Legs: two small cylinders
    const legGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.5, 6);
    const legMat = new THREE.MeshStandardMaterial({ color: '#3A3A3A', roughness: 0.7 }); // dark pants

    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.15, 0.25, 0);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.15, 0.25, 0);
    group.add(rightLeg);

    return group;
  }

  private setupInput(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);

      // Double-tap detection for dodge
      const dirKey = this.getDirectionFromKey(e.code);
      if (dirKey) {
        const now = performance.now() / 1000;
        if (this.lastTapDirection === dirKey && (now - this.lastTapTime) < this.DOUBLE_TAP_THRESHOLD) {
          this.startDodge(dirKey);
          this.lastTapDirection = '';
        } else {
          this.lastTapDirection = dirKey;
          this.lastTapTime = now;
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    // Camera orbit: right-click drag
    window.addEventListener('mousedown', (e) => {
      if (e.button === 2) {
        this.isRightMouseDown = true;
        this.isOrbiting = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) {
        this.isRightMouseDown = false;
        this.isOrbiting = false;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isOrbiting) {
        const sensitivity = 0.005;
        this.cameraYaw -= e.movementX * sensitivity;
        this.cameraPitch -= e.movementY * sensitivity;
        this.cameraPitch = Math.max(-0.2, Math.min(1.2, this.cameraPitch)); // clamp
      }
    });

    // Scroll to zoom
    window.addEventListener('wheel', (e) => {
      this.cameraDistance += e.deltaY * 0.01;
      this.cameraDistance = Math.max(CAMERA_ZOOM_MIN, Math.min(CAMERA_ZOOM_MAX, this.cameraDistance));
    });

    // Prevent context menu on right-click
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private getDirectionFromKey(code: string): string {
    const map: Record<string, string> = {
      'KeyW': 'forward',
      'ArrowUp': 'forward',
      'KeyS': 'backward',
      'ArrowDown': 'backward',
      'KeyA': 'left',
      'ArrowLeft': 'left',
      'KeyD': 'right',
      'ArrowRight': 'right',
    };
    return map[code] || '';
  }

  private getCurrentMovementDirection(): string {
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) return 'forward';
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) return 'backward';
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) return 'left';
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) return 'right';
    return 'forward'; // default
  }

  private startDodge(direction: string): void {
    if (this.isDodging) return;
    if (!this.canAct) return;
    if (this.dodgeCooldownTimer > 0) return;
    if (this.stamina < STAMINA_DODGE_COST) return;

    this.isDodging = true;
    this.dodgeTimer = DODGE_DURATION;
    this.isInvulnerable = true;
    this.stamina -= STAMINA_DODGE_COST;
    this.staminaRegenTimer = STAMINA_REGEN_DELAY;
    this.dodgeCooldownTimer = DODGE_COOLDOWN;

    if (this.stamina <= 0) {
      this.isExhausted = true;
    }

    // Set dodge direction based on input in world space
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);

    switch (direction) {
      case 'forward':
        this.dodgeDirection.copy(forward);
        break;
      case 'backward':
        this.dodgeDirection.copy(forward).multiplyScalar(-1);
        break;
      case 'left':
        this.dodgeDirection.copy(right).multiplyScalar(-1);
        break;
      case 'right':
        this.dodgeDirection.copy(right);
        break;
      default:
        this.dodgeDirection.copy(forward);
    }
    this.dodgeDirection.y = 0;
    this.dodgeDirection.normalize();

    this.setState('dodge');
  }

  public update(deltaTime: number): void {
    // Clamp delta to avoid huge jumps
    const dt = Math.min(deltaTime, 0.1);

    // Update combat controller
    this.combatController.update(dt);

    if (this.isDodging) {
      this.updateDodge(dt);
    } else if (this.canMove) {
      this.updateMovement(dt);
    }

    // Stamina regen
    if (this.staminaRegenTimer > 0) {
      this.staminaRegenTimer -= dt;
    } else if (!this.isExhausted && this.stamina < STAMINA_MAX) {
      this.stamina = Math.min(STAMINA_MAX, this.stamina + STAMINA_REGEN_RATE * dt);
    }

    // Exhaustion recovery
    if (this.isExhausted && this.staminaRegenTimer <= 0 && this.stamina >= 5) {
      this.isExhausted = false;
    }

    // Dodge cooldown
    if (this.dodgeCooldownTimer > 0) {
      this.dodgeCooldownTimer -= dt;
    }

    // Update model position
    this.model.position.copy(this.position);

    // Update camera
    this.updateCamera(dt);
  }

  private updateMovement(dt: number): void {
    // Read input
    this.inputVector.set(0, 0);
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) this.inputVector.y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) this.inputVector.y += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) this.inputVector.x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) this.inputVector.x += 1;

    const isMoving = this.inputVector.length() > 0.01;

    // Normalize input
    if (isMoving) {
      this.inputVector.normalize();
    }

    // Determine speed
    const isShift = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    let speed = PLAYER_WALK_SPEED;

    if (isMoving) {
      if (isShift && !this.isExhausted && this.stamina > 10) {
        speed = PLAYER_SPRINT_SPEED;
        this.stamina -= STAMINA_SPRINT_COST * dt;
        this.staminaRegenTimer = STAMINA_REGEN_DELAY;
        if (this.stamina <= 0) {
          this.stamina = 0;
          this.isExhausted = true;
        }
      } else {
        speed = PLAYER_RUN_SPEED;
      }
    }

    // Calculate world-space movement from camera-relative input
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);
    forward.y = 0;
    right.y = 0;

    this.moveDirection.set(0, 0, 0);
    if (isMoving) {
      this.moveDirection.add(forward.clone().multiplyScalar(this.inputVector.y));
      this.moveDirection.add(right.clone().multiplyScalar(this.inputVector.x));
      this.moveDirection.normalize();
      this.moveDirection.multiplyScalar(speed * (this.isExhausted ? 0.5 : 1.0));
    }

    // Apply horizontal movement
    this.position.x += this.moveDirection.x * dt;
    this.position.z += this.moveDirection.z * dt;

    // Clamp to world bounds
    const halfWorld = 40;
    this.position.x = Math.max(-halfWorld, Math.min(halfWorld, this.position.x));
    this.position.z = Math.max(-halfWorld, Math.min(halfWorld, this.position.z));

    // Gravity and jumping
    const isJumpKey = this.keys.has('Space');
    if (isJumpKey && this.isGrounded && !this.isExhausted) {
      this.verticalVelocity = PLAYER_JUMP_VELOCITY;
      this.isGrounded = false;
    }

    if (!this.isGrounded) {
      this.verticalVelocity -= GRAVITY * dt;
    }

    this.position.y += this.verticalVelocity * dt;

    // Ground check (simple: y=0 is ground)
    if (this.position.y <= 0) {
      this.position.y = 0;
      this.verticalVelocity = 0;
      this.isGrounded = true;
    }

    // Determine state
    if (!this.isGrounded) {
      this.setState('jump');
    } else if (!isMoving) {
      this.setState('idle');
    } else if (speed >= PLAYER_SPRINT_SPEED && isShift) {
      this.setState('sprint');
    } else if (speed >= PLAYER_RUN_SPEED) {
      this.setState('run');
    } else {
      this.setState('walk');
    }
  }

  private updateDodge(dt: number): void {
    this.dodgeTimer -= dt;

    if (this.dodgeTimer <= 0) {
      // Dodge complete
      this.isDodging = false;
      this.isInvulnerable = false;
    } else {
      // Calculate dodge progress
      const progress = 1 - (this.dodgeTimer / DODGE_DURATION);
      const dodgeSpeed = DODGE_DISTANCE / DODGE_DURATION;

      // I-frames check
      if (progress * DODGE_DURATION > DODGE_IFRAMES) {
        this.isInvulnerable = false;
      }

      // Move in dodge direction
      this.position.x += this.dodgeDirection.x * dodgeSpeed * dt;
      this.position.z += this.dodgeDirection.z * dodgeSpeed * dt;

      // Clamp world bounds
      const halfWorld = 40;
      this.position.x = Math.max(-halfWorld, Math.min(halfWorld, this.position.x));
      this.position.z = Math.max(-halfWorld, Math.min(halfWorld, this.position.z));

      // Ground level during dodge
      this.position.y = Math.max(0, this.position.y);
    }
  }

  private setState(newState: PlayerState): void {
    if (this.state !== newState) {
      this.previousState = this.state;
      this.state = newState;
      console.log(`Player state: ${this.previousState} → ${newState}`);
      if (this.onStateChange) {
        this.onStateChange(this.previousState, newState);
      }
    }
  }

  private resetCameraPosition(): void {
    this.cameraYaw = 0;
    this.cameraPitch = 0.4;
    this.cameraDistance = CAMERA_DEFAULT_OFFSET.z * -1; // 8
  }

  private updateCamera(dt: number): void {
    // Calculate desired camera position in spherical coords around player
    const targetY = this.position.y + 2.0; // look at upper body

    const camX = this.position.x + Math.sin(this.cameraYaw) * this.cameraDistance * Math.cos(this.cameraPitch);
    const camY = this.position.y + Math.sin(this.cameraPitch) * this.cameraDistance;
    const camZ = this.position.z + Math.cos(this.cameraYaw) * this.cameraDistance * Math.cos(this.cameraPitch);

    // Prevent camera going below ground
    const groundClampedY = Math.max(this.position.y + 0.5, camY);

    const desiredPos = new THREE.Vector3(camX, groundClampedY, camZ);
    const desiredTarget = new THREE.Vector3(this.position.x, targetY, this.position.z);

    // Smooth follow
    this.camera.position.lerp(desiredPos, CAMERA_LERP_FACTOR);
    this.cameraTarget.lerp(desiredTarget, CAMERA_LERP_FACTOR * 2);
    this.camera.lookAt(this.cameraTarget);
  }

  public getStaminaPercent(): number {
    return this.stamina / STAMINA_MAX;
  }

  public isPlayerInvulnerable(): boolean {
    return this.isInvulnerable;
  }

  public setOnStateChange(cb: (oldState: PlayerState, newState: PlayerState) => void): void {
    this.onStateChange = cb;
  }

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  };

  public dispose(): void {
    this.combatController.dispose();
    window.removeEventListener('resize', this.onResize);
  }
}
