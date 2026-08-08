import * as THREE from 'three';
import { Player } from '../player/Player';
import { Village } from '../world/Village';
import { Goblin } from '../enemies/Goblin';
import { DamageNumbers } from '../ui/DamageNumbers';

export class Game {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private player: Player;
  private village: Village;
  private clock: THREE.Clock;
  private animFrameId: number = 0;
  private goblins: Goblin[] = [];

  // UI elements
  private staminaBar: HTMLElement;
  private staminaFill: HTMLElement;
  private stateLabel: HTMLElement;
  private hpBar: HTMLElement;
  private hpFill: HTMLElement;
  private hpLabel: HTMLElement;
  private manaFill: HTMLElement;
  private manaLabel: HTMLElement;
  private combatIndicator: HTMLElement;

  constructor() {
    // Scene
    this.scene = new THREE.Scene();

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    const app = document.getElementById('app');
    if (app) {
      app.appendChild(this.renderer.domElement);
    }

    // Clock
    this.clock = new THREE.Clock();

    // Build world
    this.village = new Village(this.scene);

    // Build player
    this.player = new Player(this.scene);
    this.player.position.set(0, 0, -22); // spawn near Player's House

    // Spawn goblins
    this.spawnGoblins();

    // Pass goblins to combat + magic controllers
    this.player.combatController.setGoblins(this.goblins);
    this.player.fireMagic.setGoblins(this.goblins);

    // UI
    this.staminaBar = document.getElementById('stamina-bar')!;
    this.staminaFill = document.getElementById('stamina-fill')!;
    this.stateLabel = document.getElementById('state-label')!;
    this.hpBar = document.getElementById('hp-bar')!;
    this.hpFill = document.getElementById('hp-fill')!;
    this.hpLabel = document.getElementById('hp-label')!;
    this.manaFill = document.getElementById('mana-fill')!;
    this.manaLabel = document.getElementById('mana-label')!;
    this.combatIndicator = document.getElementById('combat-indicator')!;
    DamageNumbers.initialize(this.player.camera);

    // Player state logging
    this.player.setOnStateChange((oldState, newState) => {
      this.updateStateLabel();
    });

    // Dev hook: expose the game for console debugging (e.g. `window.__game.player.position`)
    (window as unknown as Record<string, unknown>).__game = this;

    // Resize handler
    window.addEventListener('resize', this.onResize);
  }

  private onResize = (): void => {
    this.player.camera.aspect = window.innerWidth / window.innerHeight;
    this.player.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  start(): void {
    const animate = (): void => {
      this.animFrameId = requestAnimationFrame(animate);

      const deltaTime = this.clock.getDelta();

      // Update player
      this.player.update(deltaTime);

      // Update village (smoke animations)
      this.village.update(deltaTime);

      // Update goblins
      for (const goblin of this.goblins) {
        goblin.update(deltaTime);
      }

      // Update UI and floating combat feedback
      this.updateUI();
      DamageNumbers.update(deltaTime);

      // Render from player camera
      this.renderer.render(this.scene, this.player.camera);
    };

    animate();
  }

  private updateUI(): void {
    // Stamina bar
    const pct = this.player.getStaminaPercent();
    this.staminaFill.style.width = `${pct * 100}%`;

    if (pct < 0.25) {
      this.staminaFill.style.backgroundColor = '#FF4444';
      this.staminaFill.classList.add('flashing');
    } else if (pct < 0.5) {
      this.staminaFill.style.backgroundColor = '#FFAA00';
      this.staminaFill.classList.remove('flashing');
    } else {
      this.staminaFill.style.backgroundColor = '#FFD700';
      this.staminaFill.classList.remove('flashing');
    }

    // Update state label (combat takes priority)
    this.updateStateLabel();
    if (this.combatIndicator) {
      const inCombat = this.goblins.some((goblin) => goblin.isAlive && (goblin.state === 'chase' || goblin.state === 'attack'));
      this.combatIndicator.classList.toggle('combat-active', inCombat);
    }

    // HP bar
    if (this.hpFill) {
      const hpPct = this.player.hp / this.player.maxHp;
      this.hpFill.style.width = `${hpPct * 100}%`;
      if (hpPct < 0.25) {
        this.hpFill.style.backgroundColor = '#FF4444';
      } else if (hpPct < 0.5) {
        this.hpFill.style.backgroundColor = '#FFAA00';
      } else {
        this.hpFill.style.backgroundColor = '#44CC44';
      }
    }
    if (this.hpLabel) {
      this.hpLabel.textContent = `${this.player.hp}/${this.player.maxHp}`;
    }

    // Mana bar
    if (this.manaFill) {
      const manaPct = this.player.getManaPercent();
      this.manaFill.style.width = `${manaPct * 100}%`;
      if (manaPct < 0.25) {
        this.manaFill.style.backgroundColor = '#3344CC';
      } else {
        this.manaFill.style.backgroundColor = '#4488FF';
      }
    }
    if (this.manaLabel) {
      this.manaLabel.textContent = `MP: ${Math.floor(this.player.mana)}/${this.player.maxMana}`;
    }

    // Spell cooldown indicators
    for (const spell of this.player.fireMagic.getSpellStatuses()) {
      const statusEl = document.getElementById(`spell-status-${spell.id}`);
      const slotEl = document.getElementById(`spell-slot-${spell.id}`);
      if (!statusEl || !slotEl) continue;
      if (spell.cooldown > 0) {
        statusEl.textContent = `${spell.cooldown.toFixed(1)}s`;
        slotEl.classList.add('on-cooldown');
      } else {
        statusEl.textContent = '✓';
        slotEl.classList.remove('on-cooldown');
      }
    }
  }

  private updateStateLabel(): void {
    if (!this.stateLabel) return;
    const combatLabel = this.player.combatController.getCombatStateLabel();
    if (combatLabel !== 'IDLE') {
      this.stateLabel.textContent = combatLabel;
    } else {
      this.stateLabel.textContent = this.player.state.toUpperCase();
    }
  }

  private spawnGoblins(): void {
    // Goblin 1: near north path, patrol state with 2 waypoints
    const goblin1 = new Goblin(
      this.player,
      this.scene,
      new THREE.Vector3(15, 0, -15),
      'patrol',
      [
        new THREE.Vector3(15, 0, -15),
        new THREE.Vector3(18, 0, -10),
        new THREE.Vector3(12, 0, -8),
      ],
    );
    this.goblins.push(goblin1);

    // Goblin 2: near east forest edge, idle state
    const goblin2 = new Goblin(
      this.player,
      this.scene,
      new THREE.Vector3(-12, 0, -8),
      'idle',
    );
    this.goblins.push(goblin2);

    // Goblin 3: near village square, patrol state with 2 waypoints
    const goblin3 = new Goblin(
      this.player,
      this.scene,
      new THREE.Vector3(8, 0, 10),
      'patrol',
      [
        new THREE.Vector3(8, 0, 10),
        new THREE.Vector3(12, 0, 8),
      ],
    );
    this.goblins.push(goblin3);
  }

  dispose(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    DamageNumbers.dispose();
    this.player.dispose();
    for (const goblin of this.goblins) {
      goblin.dispose();
    }
    this.goblins = [];
    window.removeEventListener('resize', this.onResize);
  }
}
