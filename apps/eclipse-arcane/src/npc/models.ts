/**
 * Placeholder NPC models built from primitives.
 *
 * These are stand-ins until the character art exists, but each one is shaped to
 * be recognisable at gameplay distance (silhouette, palette, signature props).
 */

import * as THREE from 'three';

const LEATHER = '#6B4A2F';
const LEATHER_DARK = '#4A3320';
const SKIN = '#E8B78F';
const HAIR = '#3B2A1E';
const WOOD = '#8B7355';

/**
 * Captain Renn — mid-30s guard in worn leather armour, arms crossed, longsword
 * leaning on a wooden watch post (spec Section 1.4).
 */
export function buildCaptainRennModel(): THREE.Group {
  const group = new THREE.Group();

  const leatherMat = new THREE.MeshStandardMaterial({ color: LEATHER, roughness: 0.75 });
  const leatherDarkMat = new THREE.MeshStandardMaterial({ color: LEATHER_DARK, roughness: 0.8 });
  const skinMat = new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.6 });
  const hairMat = new THREE.MeshStandardMaterial({ color: HAIR, roughness: 0.85 });

  // Legs
  const legGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.8, 8);
  for (const x of [-0.16, 0.16]) {
    const leg = new THREE.Mesh(legGeo, leatherDarkMat);
    leg.position.set(x, 0.4, 0);
    leg.castShadow = true;
    group.add(leg);
  }

  // Torso: leather chestpiece
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.32, 1.0, 10), leatherMat);
  torso.position.y = 1.25;
  torso.castShadow = true;
  group.add(torso);

  // Guard insignia: stylised tree with roots forming a shield
  const insignia = new THREE.Group();
  const shield = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.26, 0.04),
    new THREE.MeshStandardMaterial({ color: '#2E7D32', roughness: 0.5 }),
  );
  insignia.add(shield);
  const insigniaTree = new THREE.Mesh(
    new THREE.ConeGeometry(0.09, 0.16, 6),
    new THREE.MeshStandardMaterial({ color: '#A5D6A7', roughness: 0.5 }),
  );
  insigniaTree.position.set(0, 0.04, 0.03);
  insignia.add(insigniaTree);
  insignia.position.set(0, 1.35, 0.33);
  group.add(insignia);

  // Crossed arms
  const armGeo = new THREE.BoxGeometry(0.52, 0.15, 0.15);
  const armLeft = new THREE.Mesh(armGeo, leatherMat);
  armLeft.position.set(-0.02, 1.44, 0.3);
  armLeft.rotation.z = 0.25;
  armLeft.castShadow = true;
  group.add(armLeft);

  const armRight = new THREE.Mesh(armGeo, leatherMat);
  armRight.position.set(0.02, 1.36, 0.28);
  armRight.rotation.z = -0.25;
  armRight.castShadow = true;
  group.add(armRight);

  // Shoulders
  const shoulderGeo = new THREE.SphereGeometry(0.17, 8, 6);
  for (const x of [-0.36, 0.36]) {
    const pad = new THREE.Mesh(shoulderGeo, leatherDarkMat);
    pad.position.set(x, 1.7, 0);
    pad.castShadow = true;
    group.add(pad);
  }

  // Head + hair + scar
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), skinMat);
  head.position.y = 1.98;
  head.castShadow = true;
  group.add(head);

  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.44), hairMat);
  hair.position.set(0, 2.14, -0.02);
  group.add(hair);

  const scar = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.16, 0.02),
    new THREE.MeshStandardMaterial({ color: '#B07A6A', roughness: 0.7 }),
  );
  scar.position.set(-0.14, 1.96, 0.19);
  scar.rotation.z = 0.3;
  group.add(scar);

  // --- Watch post and longsword resting against it ---
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.13, 2.6, 6),
    new THREE.MeshStandardMaterial({ color: WOOD, roughness: 0.9 }),
  );
  post.position.set(-0.85, 1.3, -0.25);
  post.castShadow = true;
  group.add(post);

  const sword = new THREE.Group();
  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 1.15, 0.02),
    new THREE.MeshStandardMaterial({ color: '#C8CDD4', roughness: 0.35, metalness: 0.6 }),
  );
  blade.position.y = 0.75;
  sword.add(blade);
  const guard = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.05, 0.05),
    new THREE.MeshStandardMaterial({ color: '#8B6F3F', metalness: 0.4, roughness: 0.5 }),
  );
  guard.position.y = 0.17;
  sword.add(guard);
  const grip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.22, 6),
    new THREE.MeshStandardMaterial({ color: '#5A3A22', roughness: 0.8 }),
  );
  grip.position.y = 0.05;
  sword.add(grip);
  sword.position.set(-0.78, 0.05, -0.12);
  sword.rotation.z = 0.25;
  sword.rotation.x = 0.08;
  group.add(sword);

  return group;
}
