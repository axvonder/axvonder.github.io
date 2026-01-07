import { GAME_WIDTH, GAME_HEIGHT, CONFIG } from './constants.js';
import { Input } from './input.js';
import { UI } from './ui.js';
import { Player } from './player.js';
import { Spawner } from './spawner.js';
import { circlesOverlap } from './collision.js';
import { createWorld, drawWorld } from './world.js';

const canvas = document.getElementById('gameCanvas');
if (!canvas) throw new Error('Missing #gameCanvas in game.html');

const ctx = canvas.getContext('2d', { alpha: false });
if (!ctx) throw new Error('Canvas 2D context not available.');

const assetBase = new URL('../assets/', import.meta.url);
const assetUrl = (path) => new URL(path, assetBase).toString();

function applyHiDpi() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.floor(GAME_WIDTH * dpr);
  canvas.height = Math.floor(GAME_HEIGHT * dpr);
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
}
applyHiDpi();
window.addEventListener('resize', applyHiDpi);

const ui = new UI();
const input = new Input(canvas);
let world = null;

let state = 'menu';
let player;
let enemies = [];
let projectiles = [];
let spawner;
let score = 0;
let survivedSeconds = 0;
let assets = null;
let camera = { x: 0, y: 0 };
let bestRun = { kills: 0, time: 0, level: 1 };

const formatStatValue = (value) => {
  const abs = Math.abs(value);
  const decimals = abs < 1 ? 2 : 1;
  const factor = 10 ** decimals;
  const rounded = Math.round(value * factor) / factor;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(decimals);
};

const formatStatUnit = (value, unit) => `${formatStatValue(value)}${unit}`;

function buildStatsData() {
  const normal = CONFIG.spells.normal;
  const mega = CONFIG.spells.mega;

  return {
    player: [
      { label: 'Level', value: formatStatValue(player.level) },
      { label: 'HP Max', value: formatStatValue(player.maxHp) },
      { label: 'Mana Max', value: formatStatValue(player.maxMana) },
      { label: 'Mana Regen', value: formatStatUnit(player.manaRegen, '/s') },
      { label: 'Move Speed', value: formatStatUnit(player.speed, ' px/s') },
      { label: 'Fire Cooldown', value: formatStatUnit(player.fireCooldownBase, 's') },
      { label: 'Heal Cooldown', value: formatStatUnit(player.healCooldownBase, 's') },
      { label: 'Heal Mana Cost', value: formatStatValue(CONFIG.player.healManaCost || 0) },
      { label: 'Damage', value: formatStatValue(player.damage) },
      { label: 'Heal Amount', value: formatStatValue(player.healAmount) }
    ],
    normal: [
      { label: 'Damage', value: formatStatValue(player.damage * normal.damageMult) },
      { label: 'Mana Cost', value: formatStatValue(normal.manaCost) },
      { label: 'Cast Time', value: `${formatStatValue(normal.castTimeMult)}x` },
      { label: 'AoE Radius', value: formatStatUnit(normal.aoeRadius, ' px') }
    ],
    mega: [
      { label: 'Damage', value: formatStatValue(player.damage * mega.damageMult) },
      { label: 'Mana Cost', value: formatStatValue(mega.manaCost) },
      { label: 'Cast Time', value: `${formatStatValue(mega.castTimeMult)}x` },
      { label: 'AoE Radius', value: formatStatUnit(mega.aoeRadius, ' px') },
      { label: 'Projectile Scale', value: `${formatStatValue(mega.projectileScale)}x` }
    ]
  };
}

// Simple loadImage helper
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

// Load all assets
function loadAssets() {
  const slimeFiles = [
    { key: 'slime1_walk', file: 'Slime1_Walk_with_shadow.png', folder: 'slime1' },
    { key: 'slime1_attack', file: 'Slime1_Attack_with_shadow.png', folder: 'slime1' },
    { key: 'slime1_hurt', file: 'Slime1_Hurt_with_shadow.png', folder: 'slime1' },
    { key: 'slime1_death', file: 'Slime1_Death_with_shadow.png', folder: 'slime1' },
    { key: 'slime2_walk', file: 'Slime2_Walk_with_shadow.png', folder: 'slime2' },
    { key: 'slime2_attack', file: 'Slime2_Attack_with_shadow.png', folder: 'slime2' },
    { key: 'slime2_hurt', file: 'Slime2_Hurt_with_shadow.png', folder: 'slime2' },
    { key: 'slime2_death', file: 'Slime2_Death_with_shadow.png', folder: 'slime2' },
    { key: 'slime3_walk', file: 'Slime3_Walk_with_shadow.png', folder: 'slime3' },
    { key: 'slime3_attack', file: 'Slime3_Attack_with_shadow.png', folder: 'slime3' },
    { key: 'slime3_hurt', file: 'Slime3_Hurt_with_shadow.png', folder: 'slime3' },
    { key: 'slime3_death', file: 'Slime3_Death_with_shadow.png', folder: 'slime3' },
  ];

  const environmentFiles = [
    'Beige_green_mushroom1.png',
    'Beige_green_mushroom2.png',
    'Beige_green_mushroom3.png',
    'Blue-green_balls_tree1.png',
    'Blue-green_balls_tree2.png',
    'Blue-green_balls_tree3.png',
    'Chanterelles1.png',
    'Chanterelles2.png',
    'Chanterelles3.png',
    'Curved_tree1.png',
    'Curved_tree2.png',
    'Curved_tree3.png',
    'Ent_man.png',
    'Ent_woman.png',
    'Light_balls_tree1.png',
    'Light_balls_tree2.png',
    'Light_balls_tree3.png',
    'Living gazebo1.png',
    'Living gazebo2.png',
    'Luminous_tree1.png',
    'Luminous_tree2.png',
    'Luminous_tree3.png',
    'Luminous_tree4.png',
    'Mega_tree1.png',
    'Mega_tree2.png',
    'Swirling tree1.png',
    'Swirling tree2.png',
    'Swirling tree3.png',
    'Tree_idol_deer.png',
    'Tree_idol_dragon.png',
    'Tree_idol_human.png',
    'Tree_idol_wolf.png',
    'White-red_mushroom1.png',
    'White-red_mushroom2.png',
    'White-red_mushroom3.png',
    'White_tree1.png',
    'White_tree2.png',
    'Willow1.png',
    'Willow2.png',
    'Willow3.png'
  ];

  const promises = [
    loadImage(assetUrl('mage_idle.png')).then(img => ({ key: 'mage_idle', img })),
    loadImage(assetUrl('mage_walk.png')).then(img => ({ key: 'mage_walk', img })),
    loadImage(assetUrl('mage_run.png')).then(img => ({ key: 'mage_run', img })),
    loadImage(assetUrl('mage_attack.png')).then(img => ({ key: 'mage_attack', img })),
    loadImage(assetUrl('mage_heal.png')).then(img => ({ key: 'mage_heal', img })),
    loadImage(assetUrl('mage_hurt.png')).then(img => ({ key: 'mage_hurt', img })),
    loadImage(assetUrl('mage_dead.png')).then(img => ({ key: 'mage_dead', img })),
    loadImage(assetUrl('projectile_bolt.png')).then(img => ({ key: 'projectile_bolt', img })),
    loadImage(assetUrl('terrain/forest_tiles.png')).then(img => ({ key: 'forest_tiles', img })),
    ...environmentFiles.map(file =>
      loadImage(assetUrl(`environment/${file}`)).then(img => ({ key: `env:${file}`, img }))
    ),
    ...slimeFiles.map(entry =>
      loadImage(assetUrl(`enemies/${entry.folder}/${entry.file}`)).then(img => ({ key: entry.key, img }))
    )
  ];

  return Promise.all(promises).then(results => {
    assets = {};
    results.forEach(r => assets[r.key] = r.img);
    assets.env = environmentFiles.map(file => assets[`env:${file}`]).filter(Boolean);
    assets.ground = assets.forest_tiles || null;
    assets.enemies = {
      slime1: {
        walk: assets.slime1_walk,
        attack: assets.slime1_attack,
        hurt: assets.slime1_hurt,
        death: assets.slime1_death
      },
      slime2: {
        walk: assets.slime2_walk,
        attack: assets.slime2_attack,
        hurt: assets.slime2_hurt,
        death: assets.slime2_death
      },
      slime3: {
        walk: assets.slime3_walk,
        attack: assets.slime3_attack,
        hurt: assets.slime3_hurt,
        death: assets.slime3_death
      }
    };
  });
}

function resetGame() {
  world = createWorld(assets);
  player = new Player(assets, GAME_WIDTH * 0.5, GAME_HEIGHT * 0.5);
  enemies = [];
  projectiles = [];
  spawner = new Spawner(assets);
  spawner.reset();
  score = 0;
  survivedSeconds = 0;
  ui.setHud({
    hp: player.hp,
    maxHp: player.maxHp,
    mana: player.mana,
    maxMana: player.maxMana,
    xp: player.xp,
    xpToNext: player.xpToNext,
    level: player.level,
    score
  });
}

function setState(next, data) {
  state = next;
  if (state === 'menu') {
    input.setActive(false);
    ui.showPlay();
    ui.hideStats();
  } else if (state === 'running') {
    input.setActive(true);
    ui.hidePlay();
    ui.hideGameOver();
    ui.hidePause();
    ui.hideStats();
  } else if (state === 'gameover') {
    input.setActive(false);
    ui.showGameOver({ score, survivedSeconds, level: player.level, bestRun });
    ui.hideStats();
  } else if (state === 'paused') {
    input.setActive(false);
    ui.showPause();
    ui.hideStats();
  } else if (state === 'stats') {
    input.setActive(false);
    ui.hidePlay();
    ui.hideGameOver();
    ui.hidePause();
    ui.showStats(data);
  }
}

function start() {
  resetGame();
  setState('running');
  if (canvas.focus) canvas.focus();
}

function restart() {
  resetGame();
  setState('running');
  if (canvas.focus) canvas.focus();
}

ui.onPlay(start);
ui.onRestart(restart);
ui.onResume(() => setState('running'));
ui.onStats(() => {
  if (state === 'running') setState('stats', buildStatsData());
});
ui.onCloseStats(() => {
  if (state === 'stats') setState('running');
});

window.addEventListener('keydown', (e) => {
  if (state === 'menu' && e.code === 'Enter') start();
  if (state === 'gameover' && (e.code === 'Enter' || e.code === 'KeyR')) restart();
  if (e.code === 'Escape') {
    if (state === 'stats') setState('running');
    else if (state === 'running') setState('paused');
    else if (state === 'paused') setState('running');
  }
  if (e.code === 'KeyC') {
    if (state === 'running') setState('stats', buildStatsData());
    else if (state === 'stats') setState('running');
  }
});

function update(dt) {
  survivedSeconds += dt;
  player.update(dt, input, world);

  // Clear just-pressed keys after player update
  input.clearJustPressed();

  updateCamera();

  // Shooting
  const pointerShot = input.consumePointerShot();
  let shotDir = null;
  let shotType = 'normal';
  if (pointerShot) {
    const worldX = camera.x + pointerShot.x;
    const worldY = camera.y + pointerShot.y;
    shotDir = { x: worldX - player.x, y: worldY - player.y };
    shotType = pointerShot.type || 'normal';
  }

  if (shotDir && player.canShoot()) {
    const len = Math.hypot(shotDir.x, shotDir.y);
    if (len > 0) {
      const dirNorm = { x: shotDir.x / len, y: shotDir.y / len };
      player.queueShot(dirNorm, shotType);
    }
  }

  const fired = player.consumeProjectile();
  if (fired) projectiles.push(fired);

  spawner.update(dt, enemies, player, score, world);

  for (const e of enemies) e.update(dt, player, world);
  for (const p of projectiles) p.update(dt);

  // Collisions...
  const applyDamage = (enemy, damage) => {
    enemy.takeDamage(damage);
    if (enemy.dying && !enemy.scored) {
      score += 1;
      const xpValue = typeof enemy.xpValue === 'number'
        ? enemy.xpValue
        : CONFIG.progression.xpPerKill;
      player.gainXp(xpValue);
      enemy.scored = true;
    }
  };

  for (const p of projectiles) {
    if (p.dead) continue;
    let hitEnemy = null;
    for (const e of enemies) {
      if (e.dead || e.dying) continue;
      if (circlesOverlap(p, e)) {
        hitEnemy = e;
        break;
      }
    }
    if (hitEnemy) {
      applyDamage(hitEnemy, p.damage);
      if (p.aoeRadius > 0) {
        const r2 = p.aoeRadius * p.aoeRadius;
        const cx = p.x;
        const cy = p.y;
        for (const e of enemies) {
          if (e === hitEnemy || e.dead || e.dying) continue;
          const dx = e.x - cx;
          const dy = e.y - cy;
          if (dx * dx + dy * dy <= r2) {
            applyDamage(e, p.damage);
          }
        }
      }
      p.dead = true;
    }
  }

  let contactDamage = 0;
  for (const e of enemies) {
    if (e.dead || e.dying) continue;
    if (circlesOverlap(e, player)) {
      contactDamage += e.contactDamage || CONFIG.enemy.contactDamage;
    }
  }
  if (contactDamage > 0) {
    player.takeDamage(contactDamage);
  }

  projectiles = projectiles.filter(p => !p.dead);
  enemies = enemies.filter(e => !e.dead);

  ui.setHud({
    hp: player.hp,
    maxHp: player.maxHp,
    mana: player.mana,
    maxMana: player.maxMana,
    xp: player.xp,
    xpToNext: player.xpToNext,
    level: player.level,
    score,
    manaFlash: player.noManaFlash > 0
  });

  if (player.hp <= 0) {
    updateBestRun();
    setState('gameover');
  }
}

function render() {
  drawWorld(ctx, world, camera);

  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  for (const p of projectiles) p.draw(ctx);
  for (const e of enemies) e.draw(ctx);

  if (player) {
    player.draw(ctx);
  }

  ctx.restore();

  if (state === 'running') {
    const ptr = input.getPointer();
    if (ptr.has) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = '#fbf8f1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ptr.x, ptr.y, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function updateCamera() {
  if (!world || !player) return;
  const maxX = Math.max(0, world.width - GAME_WIDTH);
  const maxY = Math.max(0, world.height - GAME_HEIGHT);
  camera.x = Math.max(0, Math.min(player.x - GAME_WIDTH * 0.5, maxX));
  camera.y = Math.max(0, Math.min(player.y - GAME_HEIGHT * 0.5, maxY));
}

function loadBestRun() {
  const raw = localStorage.getItem('mage_best_run');
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    bestRun = {
      kills: Number(data.kills) || 0,
      time: Number(data.time) || 0,
      level: Number(data.level) || 1
    };
  } catch {
    bestRun = { kills: 0, time: 0, level: 1 };
  }
}

function updateBestRun() {
  const time = Number(survivedSeconds.toFixed(1));
  const betterKills = score > bestRun.kills;
  const betterTime = time > bestRun.time;
  const betterLevel = player.level > bestRun.level;
  if (betterKills || betterTime || betterLevel) {
    bestRun = {
      kills: Math.max(bestRun.kills, score),
      time: Math.max(bestRun.time, time),
      level: Math.max(bestRun.level, player.level)
    };
    localStorage.setItem('mage_best_run', JSON.stringify(bestRun));
    ui.setBestRun(bestRun);
  }
}

// Loading screen + start
let loading = true;

function drawLoading() {
  ctx.fillStyle = '#0b0c0f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fbf8f1';
  ctx.font = '30px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Loading assets...', GAME_WIDTH / 2, GAME_HEIGHT / 2);
}

function loadingFrame() {
  if (loading) {
    drawLoading();
    requestAnimationFrame(loadingFrame);
  }
}

requestAnimationFrame(loadingFrame);

loadAssets().then(() => {
  loading = false;
  loadBestRun();
  ui.setBestRun(bestRun);

  resetGame();
  setState('menu');
  updateCamera();

  let lastTs = 0;
  function gameFrame(ts) {
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;

    if (state === 'running') update(dt);
    render();

    requestAnimationFrame(gameFrame);
  }

  requestAnimationFrame(gameFrame);
}).catch(err => {
  console.error(err);
  ctx.fillStyle = '#ff0000';
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Failed to load assets :(', GAME_WIDTH / 2, GAME_HEIGHT / 2);
});
