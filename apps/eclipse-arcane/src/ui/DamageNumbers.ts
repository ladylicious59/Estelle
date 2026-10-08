import * as THREE from 'three';

interface FloatingNumber {
  element: HTMLDivElement;
  position: THREE.Vector3;
  elapsed: number;
}

/** Lightweight DOM damage indicators projected from world space into the HUD. */
export class DamageNumbers {
  private static camera: THREE.Camera | null = null;
  private static container: HTMLDivElement | null = null;
  private static numbers: FloatingNumber[] = [];
  private static readonly DURATION = 0.8;

  static initialize(camera: THREE.Camera): void {
    this.camera = camera;
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'damage-numbers';
      this.container.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:15;';
      document.getElementById('app')?.appendChild(this.container);
    }
  }

  static show(position: THREE.Vector3, amount: number, isHeavy: boolean, color?: string): void {
    if (!this.container || !this.camera) return;
    const element = document.createElement('div');
    element.textContent = `${Math.round(amount)}`;
    const textColor = color ?? (isHeavy ? '#FFCC00' : '#FF3333');
    element.style.cssText = `position:absolute;transform:translate(-50%,-50%);font:bold 700 22px 'Segoe UI',sans-serif;color:${textColor};text-shadow:0 2px 4px #160606, 0 0 8px rgba(0,0,0,.8);will-change:left,top,opacity;`;
    this.container.appendChild(element);
    this.numbers.push({ element, position: position.clone(), elapsed: 0 });
  }

  static update(deltaTime: number): void {
    if (!this.camera) return;
    const projected = new THREE.Vector3();
    for (let i = this.numbers.length - 1; i >= 0; i--) {
      const number = this.numbers[i];
      number.elapsed += Math.min(deltaTime, 0.1);
      const progress = Math.min(number.elapsed / this.DURATION, 1);
      const worldPosition = number.position.clone();
      worldPosition.y += progress * 1.5;
      projected.copy(worldPosition).project(this.camera);
      const visible = projected.z >= -1 && projected.z <= 1;
      number.element.style.left = `${(projected.x * 0.5 + 0.5) * window.innerWidth}px`;
      number.element.style.top = `${(-projected.y * 0.5 + 0.5) * window.innerHeight}px`;
      number.element.style.opacity = visible ? `${1 - progress}` : '0';
      number.element.style.transform = `translate(-50%,-50%) scale(${1 + progress * 0.15})`;
      if (progress >= 1) {
        number.element.remove();
        this.numbers.splice(i, 1);
      }
    }
  }

  static dispose(): void {
    for (const number of this.numbers) number.element.remove();
    this.numbers = [];
    this.container?.remove();
    this.container = null;
    this.camera = null;
  }
}
