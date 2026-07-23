import * as THREE from 'three';
import { Player } from '../player/Player';
import { Village } from '../world/Village';

export class Game {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private player: Player;
  private village: Village;
  private clock: THREE.Clock;
  private animFrameId: number = 0;

  // UI elements
  private staminaBar: HTMLElement;
  private staminaFill: HTMLElement;
  private stateLabel: HTMLElement;

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

    // UI
    this.staminaBar = document.getElementById('stamina-bar')!;
    this.staminaFill = document.getElementById('stamina-fill')!;
    this.stateLabel = document.getElementById('state-label')!;

    // Player state logging
    this.player.setOnStateChange((oldState, newState) => {
      if (this.stateLabel) {
        this.stateLabel.textContent = newState.toUpperCase();
      }
    });

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

      // Update UI
      this.updateUI();

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
  }

  dispose(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.player.dispose();
    window.removeEventListener('resize', this.onResize);
  }
}
