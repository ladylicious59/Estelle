import * as THREE from 'three';
import { WORLD_SIZE } from '../utils/constants';

export class Village {
  public group: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    this.buildTerrain();
    this.buildBuildings();
    this.buildPaths();
    this.buildProps();
    this.buildNpCs();
    this.buildBoundaries();
    this.buildLighting();
    this.buildFog(scene);
    scene.add(this.group);
  }

  private buildTerrain(): void {
    // Main ground: large flat plane
    const groundGeo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, 40, 40);
    // Modify vertices for terrain variation
    const positions = groundGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 2]; // z in world

      // Shallow valley in center, gentle hills at edges
      const distFromCenter = Math.sqrt(x * x + y * y);
      const edgeFactor = Math.max(0, (distFromCenter - 15) / 25); // 0 at center, 1 at edges

      // Hills at edges (1-3 units)
      let height = edgeFactor * 2.5;

      // Extra hills in corners
      const cornerFactor = Math.abs(x) * Math.abs(y) / (40 * 40);
      height += cornerFactor * 1.5;

      // Slight depression in village center (-0.3)
      if (distFromCenter < 15) {
        height -= 0.3 * (1 - distFromCenter / 15);
      }

      // Small bumps for natural feel
      height += Math.sin(x * 0.3) * Math.cos(y * 0.3) * 0.2;

      positions[i + 2] = height; // modify Y (the plane is XY in geometry, then rotated)
    }
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      color: '#4a7c3f', // grass green
      roughness: 0.9,
      flatShading: false,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.group.add(ground);
  }

  private buildBuildings(): void {
    // --- Player's House (south) ---
    this.createBuilding(0, 0, -25, 3, 3, 3, '#8B6914', '#A0522D', false);

    // --- Greta's Forge (east) ---
    this.createBuilding(18, 0, -5, 4, 4, 3.5, '#555555', '#444444', true);

    // --- Milo's Wares (center) ---
    this.createBuilding(0, 0, 4, 3, 4, 3, '#5B8FA8', '#4A7A90', false);

    // --- Elder Miren's Shrine (west) ---
    const shrine = this.createBuilding(-18, 0, -5, 3, 3, 4, '#F5F0E8', '#E8DCC8', false);
    // Glowing rune on door
    const runeGeo = new THREE.PlaneGeometry(0.6, 0.6);
    const runeMat = new THREE.MeshBasicMaterial({
      color: '#FFD700',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const rune = new THREE.Mesh(runeGeo, runeMat);
    rune.position.set(-18, 1.5, -5 + 1.55);
    this.group.add(rune);

    // --- Captain Renn's Post (north) ---
    this.createBuilding(0, 0, 22, 3, 3, 3, '#8B6914', '#7A5A10', false);
    // Flag post
    const flagPoleGeo = new THREE.CylinderGeometry(0.08, 0.08, 5, 6);
    const flagPoleMat = new THREE.MeshStandardMaterial({ color: '#8B7355' });
    const flagPole = new THREE.Mesh(flagPoleGeo, flagPoleMat);
    flagPole.position.set(2, 2.5, 22);
    this.group.add(flagPole);
    // Flag
    const flagGeo = new THREE.PlaneGeometry(1.5, 0.8);
    const flagMat = new THREE.MeshStandardMaterial({
      color: '#CC3333',
      side: THREE.DoubleSide,
    });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(2.7, 4.7, 22);
    flag.rotation.y = Math.PI / 4;
    this.group.add(flag);
  }

  private createBuilding(
    x: number, baseY: number, z: number,
    width: number, depth: number, height: number,
    wallColor: string, roofColor: string,
    hasChimney: boolean
  ): THREE.Group {
    const buildingGroup = new THREE.Group();

    // Walls
    const wallGeo = new THREE.BoxGeometry(width, height, depth);
    const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.7 });
    const walls = new THREE.Mesh(wallGeo, wallMat);
    walls.position.y = height / 2;
    walls.castShadow = true;
    walls.receiveShadow = true;
    buildingGroup.add(walls);

    // Roof: pyramid shape using cone
    const roofGeo = new THREE.ConeGeometry(Math.max(width, depth) * 0.75, height * 0.5, 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.6 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = height + height * 0.25;
    roof.rotation.y = Math.PI / 4; // rotate to align with box
    roof.castShadow = true;
    buildingGroup.add(roof);

    // Chimney with smoke for forge
    if (hasChimney) {
      const chimneyGeo = new THREE.BoxGeometry(0.5, 1.5, 0.5);
      const chimneyMat = new THREE.MeshStandardMaterial({ color: '#666666' });
      const chimney = new THREE.Mesh(chimneyGeo, chimneyMat);
      chimney.position.set(width * 0.25, height + 0.75, -depth * 0.2);
      buildingGroup.add(chimney);

      // Smoke particles
      this.addSmokeParticles(x + width * 0.25, height + 1.5, z - depth * 0.2);
    }

    buildingGroup.position.set(x, baseY, z);
    this.group.add(buildingGroup);
    return buildingGroup;
  }

  private addSmokeParticles(x: number, y: number, z: number): void {
    const smokeGroup = new THREE.Group();
    smokeGroup.position.set(x, y, z);

    for (let i = 0; i < 8; i++) {
      const puffGeo = new THREE.SphereGeometry(0.1 + Math.random() * 0.15, 4, 4);
      const puffMat = new THREE.MeshBasicMaterial({
        color: '#888888',
        transparent: true,
        opacity: 0.4 + Math.random() * 0.3,
      });
      const puff = new THREE.Mesh(puffGeo, puffMat);
      puff.position.set(
        (Math.random() - 0.5) * 0.3,
        Math.random() * 0.8,
        (Math.random() - 0.5) * 0.3
      );
      puff.userData = {
        baseY: puff.position.y,
        speed: 0.3 + Math.random() * 0.5,
        offset: Math.random() * Math.PI * 2,
      };
      smokeGroup.add(puff);
    }

    // Store for animation
    smokeGroup.userData = { isSmoke: true };
    this.group.add(smokeGroup);
  }

  private buildPaths(): void {
    const pathMat = new THREE.MeshStandardMaterial({ color: '#8B7355', roughness: 0.9 });
    const pathY = 0.06;

    // Main road north-south through village center
    this.addPathSegment(0, pathY, -25, 2, 47, pathMat); // from south to north
    // Cross path east-west
    this.addPathSegment(-18, pathY, -5, 36, 2, pathMat);
    // Connection to Player's House
    this.addPathSegment(0, pathY, -13, 2, 12, pathMat);
    // Connection to Captain Renn
    this.addPathSegment(0, pathY, 10, 2, 12, pathMat);

    // Village square: larger dirt area in center
    const squareGeo = new THREE.PlaneGeometry(10, 8);
    const square = new THREE.Mesh(squareGeo, pathMat);
    square.rotation.x = -Math.PI / 2;
    square.position.set(0, pathY, 0);
    this.group.add(square);
  }

  private addPathSegment(
    x: number, y: number, z: number,
    width: number, length: number,
    material: THREE.Material
  ): void {
    const geo = new THREE.PlaneGeometry(width, length);
    const path = new THREE.Mesh(geo, material);
    path.rotation.x = -Math.PI / 2;
    path.position.set(x, y, z);
    this.group.add(path);
  }

  private buildProps(): void {
    // Central well
    this.createWell(0, 0, -2);

    // Quest board near Captain Renn
    this.createQuestBoard(3, 0, 18);

    // Scattered barrels and crates
    this.createBarrel(-16, 0, -8);
    this.createBarrel(-15, 0, -7);
    this.createCrate(16, 0, -8);
    this.createCrate(17, 0, -7);
    this.createBarrel(2, 0, -10);

    // Pine trees (3-4)
    this.createPineTree(-30, 0, -20);
    this.createPineTree(-28, 0, 18);
    this.createPineTree(25, 0, -22);
    this.createPineTree(28, 0, 20);
    this.createPineTree(-25, 0, 30);
    this.createPineTree(30, 0, -30);

    // Small creek along west edge
    this.createCreek(-35, 0.02, 0, 3, 60);
  }

  private createWell(x: number, y: number, z: number): void {
    const group = new THREE.Group();

    // Well base
    const baseGeo = new THREE.CylinderGeometry(1, 1.1, 1.5, 12);
    const baseMat = new THREE.MeshStandardMaterial({ color: '#8B8378', roughness: 0.8 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.75;
    base.castShadow = true;
    group.add(base);

    // Roof supports
    for (let i = 0; i < 2; i++) {
      const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 6);
      const post = new THREE.Mesh(postGeo, baseMat);
      post.position.set(i === 0 ? -0.6 : 0.6, 1.8, 0);
      group.add(post);
    }

    // Roof
    const roofGeo = new THREE.ConeGeometry(1.2, 0.6, 8);
    const roofMat = new THREE.MeshStandardMaterial({ color: '#6B3A2A' });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 2.5;
    roof.castShadow = true;
    group.add(roof);

    group.position.set(x, y, z);
    this.group.add(group);
  }

  private createQuestBoard(x: number, y: number, z: number): void {
    const group = new THREE.Group();

    // Posts
    for (let i = 0; i < 2; i++) {
      const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.5, 6);
      const postMat = new THREE.MeshStandardMaterial({ color: '#8B7355' });
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(i === 0 ? -0.5 : 0.5, 1.25, 0);
      post.castShadow = true;
      group.add(post);
    }

    // Board
    const boardGeo = new THREE.BoxGeometry(1.5, 1, 0.05);
    const boardMat = new THREE.MeshStandardMaterial({ color: '#D2B48C' });
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.y = 2.2;
    board.castShadow = true;
    group.add(board);

    group.position.set(x, y, z);
    this.group.add(group);
  }

  private createBarrel(x: number, y: number, z: number): void {
    const barrelGeo = new THREE.CylinderGeometry(0.3, 0.25, 0.8, 8);
    const barrelMat = new THREE.MeshStandardMaterial({ color: '#8B6914', roughness: 0.7 });
    const barrel = new THREE.Mesh(barrelGeo, barrelMat);
    barrel.position.set(x, y + 0.4, z);
    barrel.castShadow = true;
    this.group.add(barrel);
  }

  private createCrate(x: number, y: number, z: number): void {
    const size = 0.5 + Math.random() * 0.3;
    const crateGeo = new THREE.BoxGeometry(size, size, size);
    const crateMat = new THREE.MeshStandardMaterial({ color: '#A0825A', roughness: 0.7 });
    const crate = new THREE.Mesh(crateGeo, crateMat);
    crate.position.set(x, y + size / 2, z);
    crate.castShadow = true;
    this.group.add(crate);
  }

  private createPineTree(x: number, y: number, z: number): void {
    const group = new THREE.Group();

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 2.5, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#5D4037', roughness: 0.8 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.25;
    trunk.castShadow = true;
    group.add(trunk);

    // Foliage layers (3 cones)
    const foliageMat = new THREE.MeshStandardMaterial({ color: '#2E7D32', roughness: 0.7 });
    for (let i = 0; i < 3; i++) {
      const radius = 1.2 - i * 0.25;
      const foliageGeo = new THREE.ConeGeometry(radius, 1.5, 8);
      const foliage = new THREE.Mesh(foliageGeo, foliageMat);
      foliage.position.y = 2.0 + i * 1.0;
      foliage.castShadow = true;
      group.add(foliage);
    }

    group.position.set(x, y, z);
    this.group.add(group);
  }

  private createCreek(x: number, y: number, z: number, width: number, length: number): void {
    const creekGeo = new THREE.PlaneGeometry(width, length);
    const creekMat = new THREE.MeshStandardMaterial({
      color: '#4488CC',
      roughness: 0.2,
      metalness: 0.3,
      transparent: true,
      opacity: 0.7,
    });
    const creek = new THREE.Mesh(creekGeo, creekMat);
    creek.rotation.x = -Math.PI / 2;
    creek.position.set(x, y, z);
    this.group.add(creek);
  }

  private buildNpCs(): void {
    // Placeholder markers for the NPCs that don't have dialogue yet.
    // Captain Renn is a real, talkable NPC (see src/npc/) placed by Game.ts,
    // so he is intentionally not marked here.
    this.createNpcMarker(18, 0, -5, '#FF6B6B', 'Greta — Blacksmith'); // Greta at forge
    this.createNpcMarker(0, 0, 0, '#4ECDC4', 'Milo — Merchant'); // Milo in center
    this.createNpcMarker(-18, 0, -5, '#FFE66D', 'Elder Miren — Healer'); // Elder at shrine
    this.createNpcMarker(-2, 0, -6, '#DDA0DD', 'Old Thom — Lore NPC'); // Thom near well
  }

  private createNpcMarker(x: number, y: number, z: number, color: string, label: string): void {
    const group = new THREE.Group();

    // Body cylinder
    const bodyGeo = new THREE.CylinderGeometry(0.25, 0.3, 1.0, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.5;
    group.add(body);

    // Head sphere
    const headGeo = new THREE.SphereGeometry(0.22, 8, 6);
    const headMat = new THREE.MeshStandardMaterial({ color: '#F5D0B0', roughness: 0.5 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.2;
    group.add(head);

    group.position.set(x, y, z);
    group.userData = { label };
    this.group.add(group);
    console.log(`NPC placed: ${label} at (${x}, ${y}, ${z})`);
  }

  private buildBoundaries(): void {
    const halfWorld = WORLD_SIZE / 2;

    // Tree wall around the perimeter (simple tall boxes as tree trunks)
    const treeMat = new THREE.MeshStandardMaterial({ color: '#3E2723', roughness: 0.9 });
    const foliageMat = new THREE.MeshStandardMaterial({ color: '#1B5E20', roughness: 0.7 });

    const spacing = 5;
    for (let i = -halfWorld; i <= halfWorld; i += spacing) {
      // North edge
      this.addBoundaryTree(i, 0, -halfWorld, treeMat, foliageMat);
      // South edge
      this.addBoundaryTree(i, 0, halfWorld, treeMat, foliageMat);
      // West edge
      this.addBoundaryTree(-halfWorld, 0, i, treeMat, foliageMat);
      // East edge
      this.addBoundaryTree(halfWorld, 0, i, treeMat, foliageMat);
    }
  }

  private addBoundaryTree(
    x: number, y: number, z: number,
    trunkMat: THREE.Material, foliageMat: THREE.Material
  ): void {
    const group = new THREE.Group();

    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.2, 4, 6);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 2;
    group.add(trunk);

    const foliageGeo = new THREE.ConeGeometry(0.8, 2, 6);
    const foliage = new THREE.Mesh(foliageGeo, foliageMat);
    foliage.position.y = 4;
    group.add(foliage);

    group.position.set(x, y, z);
    this.group.add(group);
  }

  private buildLighting(): void {
    // Warm directional light (sunset feel)
    const sun = new THREE.DirectionalLight('#FFE4B5', 0.9);
    sun.position.set(20, 25, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 512;
    sun.shadow.mapSize.height = 512;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 80;
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -30;
    this.group.add(sun);

    // Ambient light
    const ambient = new THREE.AmbientLight('#FFEEDD', 0.3);
    this.group.add(ambient);

    // Hemisphere light for sky/ground color blending
    const hemi = new THREE.HemisphereLight('#87CEEB', '#4a7c3f', 0.2);
    this.group.add(hemi);
  }

  private buildFog(scene: THREE.Scene): void {
    scene.fog = new THREE.FogExp2('#FFE4B5', 0.002);
    scene.background = new THREE.Color('#D4A574'); // warm sky matching sunset
  }

  public update(deltaTime: number): void {
    // Animate smoke particles
    this.group.children.forEach((child) => {
      if (child.userData && child.userData.isSmoke) {
        (child as THREE.Group).children.forEach((puff) => {
          if (puff.userData && puff.userData.speed !== undefined) {
            const ud = puff.userData;
            puff.position.y = ud.baseY + Math.sin(performance.now() * 0.001 * ud.speed + ud.offset) * 0.3;
            const puffMesh = puff as THREE.Mesh;
            const puffMaterial = puffMesh.material as THREE.MeshBasicMaterial;
            puffMaterial.opacity =
              0.3 + Math.sin(performance.now() * 0.002 + ud.offset) * 0.2;
          }
        });
      }
    });
  }
}
