// Internal resolution for game logic and rendering (CSS scales the canvas).
export const GAME_WIDTH = 768;
export const GAME_HEIGHT = 432;

// Tunables (keep small and obvious for the skeleton).
export const CONFIG = {
  progression: {
    xpPerKill: 4,
    xpToNextBase: 28,
    xpGrowth: 1.35,
    hpPerLevel: 1,
    damagePerLevel: 0.3,
    manaPerLevel: 4,
    manaRegenPerLevel: 0.25,
    healBase: 3,
    healPerLevel: 1,
    fireCooldownMultiplier: 0.98,
    minFireCooldown: 0.14,
    healCooldownMultiplier: 0.97,
    minHealCooldown: 1.5,
  },
  worldSize: {
    width: GAME_WIDTH * 5,
    height: GAME_HEIGHT * 5,
  },
  player: {
    radius: 12,
    speed: 150,          // px/s
    maxHp: 8,
    maxMana: 40,
    manaRegen: 3.75,     // mana per second
    healManaCost: 10,
    fireCooldown: 0.22,  // seconds between shots
    iFrameTime: 0.7,     // invulnerability after taking contact damage
  },
  spells: {
    normal: {
      manaCost: 6,
      damageMult: 1,
      castTimeMult: 0.85,
      projectileScale: 1,
      aoeRadius: 0,
      tint: null
    },
    mega: {
      manaCost: 12,
      damageMult: 2,
      castTimeMult: 1.7,
      projectileScale: 2,
      aoeRadius: 70,
      tint: 'red'
    }
  },
  projectile: {
    radius: 4,
    speed: 520,          // px/s
    ttl: 1.4,            // seconds
    damage: 1,
  },
  enemy: {
    radius: 12,
    speed: 85,           // px/s
    contactDamage: 1,
    spriteScale: 0.9,
    types: {
      slime1: { hp: 2, contactDamage: 0.7, xpValue: 4 },
      slime2: { hp: 14, contactDamage: 2.2, xpValue: 18 },
      slime3: { hp: 6, contactDamage: 1.4, xpValue: 9 },
    },
  },
  spawner: {
    minInterval: 1.85,
    maxInterval: 3.8,
    maxEnemies: Infinity,
  },
  world: {
    // Kept intentionally tiny for the first pass.
    treeCount: 0,
    treeRadiusMin: 18,
    treeRadiusMax: 30,
    clearingRadius: 80,
    padding: 36,
    envCountMin: 35,
    envCountMax: 55,
    envSizeMin: 80,
    envSizeMax: 190,
    envMinSpacing: 18,
    envCollisionScale: 0.38,
    groundTileSize: 32,
    borderTreeSize: 64,
    borderTreeCollisionScale: 0.45,
    spawnInset: 72,
  },
};
