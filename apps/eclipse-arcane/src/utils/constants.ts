// World
export const WORLD_SIZE = 80;
export const GROUND_SIZE = 100;

// Player movement (matches GDD Section 2)
export const PLAYER_WALK_SPEED = 3.0;
export const PLAYER_RUN_SPEED = 6.0;
export const PLAYER_SPRINT_SPEED = 9.0;
export const PLAYER_JUMP_VELOCITY = 8.0; // vertical impulse
export const PLAYER_HEIGHT = 1.8;

// Stamina
export const STAMINA_MAX = 100;
export const STAMINA_SPRINT_COST = 15; // per second
export const STAMINA_DODGE_COST = 20;
export const STAMINA_REGEN_RATE = 25; // per second
export const STAMINA_REGEN_DELAY = 1.0; // seconds after last use
export const STAMINA_EXHAUST_DELAY = 1.0; // seconds before regen after depleted

// Dodge
export const DODGE_DISTANCE = 4.0;
export const DODGE_DURATION = 0.4;
export const DODGE_IFRAMES = 0.25;
export const DODGE_COOLDOWN = 0.8;

// Jump
export const JUMP_HEIGHT = 2.0;
export const GRAVITY = 9.8;

// Camera
export const CAMERA_DEFAULT_OFFSET = { x: 0, y: 6, z: -8 };
export const CAMERA_ZOOM_MIN = 3;
export const CAMERA_ZOOM_MAX = 15;
export const CAMERA_LERP_FACTOR = 0.1;
