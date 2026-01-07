import { GAME_WIDTH, GAME_HEIGHT, CONFIG } from './constants.js';
import { dist2, mulberry32, randRange, randInt } from './utils.js';

export function createWorld(assets){
  const seed = Math.floor(Math.random() * 0xffffffff);
  const rng = mulberry32(seed);
  const obstacles = [];

  const {
    treeCount,
    treeRadiusMin,
    treeRadiusMax,
    clearingRadius,
    padding,
    envCountMin,
    envCountMax,
    envSizeMin,
    envSizeMax,
    envMinSpacing,
    envCollisionScale,
    groundTileSize,
    borderTreeSize,
    borderTreeCollisionScale
  } = CONFIG.world;
  const worldW = CONFIG.worldSize.width;
  const worldH = CONFIG.worldSize.height;
  const cx = worldW * 0.5;
  const cy = worldH * 0.5;

  const maxTries = treeCount * 60;
  let tries = 0;

  while(obstacles.length < treeCount && tries < maxTries){
    tries++;

    const r = randRange(rng, treeRadiusMin, treeRadiusMax);
    const x = randRange(rng, padding + r, worldW - padding - r);
    const y = randRange(rng, padding + r, worldH - padding - r);

    // Keep a clearing around the player start.
    if(dist2(x, y, cx, cy) < (clearingRadius + r) * (clearingRadius + r)) continue;

    // Avoid overlapping trees too tightly.
    let ok = true;
    for(const o of obstacles){
      const rr = r + o.r + 10;
      if(dist2(x, y, o.x, o.y) < rr * rr){
        ok = false;
        break;
      }
    }
    if(!ok) continue;

    obstacles.push({ x, y, r });
  }

  const envImages = assets && Array.isArray(assets.env) ? assets.env : [];
  const envObjects = [];
  if (envImages.length) {
    const total = randInt(rng, envCountMin, envCountMax);
    for (let i = 0; i < total; i++) {
      const img = envImages[randInt(rng, 0, envImages.length - 1)];
      if (!img) continue;

      const maxDim = Math.max(img.width || 1, img.height || 1);
      const target = randRange(rng, envSizeMin, envSizeMax);
      const scale = target / maxDim;
      const w = img.width * scale;
      const h = img.height * scale;
      const r = Math.max(w, h) * envCollisionScale;

      let placed = false;
      for (let attempt = 0; attempt < 16; attempt++) {
        const x = randRange(rng, padding + w * 0.5, worldW - padding - w * 0.5);
        const y = randRange(rng, padding + h * 0.5, worldH - padding - h * 0.5);

        const clear = clearingRadius + Math.max(w, h) * 0.5 + 10;
        if (dist2(x, y, cx, cy) < clear * clear) continue;

        let ok = true;
        for (const o of obstacles) {
          const rr = r + o.r + envMinSpacing;
          if (dist2(x, y, o.x, o.y) < rr * rr) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;

        envObjects.push({ x, y, w, h, img });
        obstacles.push({ x, y, r });
        placed = true;
        break;
      }

      if (!placed) {
        const x = randRange(rng, padding + w * 0.5, worldW - padding - w * 0.5);
        const y = randRange(rng, padding + h * 0.5, worldH - padding - h * 0.5);
        envObjects.push({ x, y, w, h, img });
        obstacles.push({ x, y, r });
      }
    }
  }

  const groundImg = assets && assets.ground ? assets.ground : null;
  const groundTiles = [];
  const borderTrees = [];

  if (groundImg) {
    const grassBase = [{ sx: 0, sy: 0 }];
    const grassClumps = [
      { sx: 32, sy: 0 }, { sx: 64, sy: 0 }, { sx: 96, sy: 0 },
      { sx: 0, sy: 32 }, { sx: 32, sy: 32 }, { sx: 64, sy: 32 }, { sx: 96, sy: 32 },
      { sx: 0, sy: 64 }, { sx: 32, sy: 64 }, { sx: 64, sy: 64 }, { sx: 96, sy: 64 }, { sx: 128, sy: 64 }
    ];

    const borderTree = { sx: 0, sy: 192, size: borderTreeSize };

    for (let y = 0; y < worldH; y += groundTileSize) {
      for (let x = 0; x < worldW; x += groundTileSize) {
        const useClump = randInt(rng, 0, 9) < 3;
        const src = useClump
          ? grassClumps[randInt(rng, 0, grassClumps.length - 1)]
          : grassBase[0];
        groundTiles.push({ x, y, sx: src.sx, sy: src.sy });
      }
    }

    const treeR = borderTreeSize * borderTreeCollisionScale;
    const step = Math.floor(borderTreeSize * 0.9);

    for (let x = 0; x <= worldW - borderTreeSize; x += step) {
      borderTrees.push({ x, y: 0, ...borderTree });
      borderTrees.push({ x, y: worldH - borderTreeSize, ...borderTree });
    }
    for (let y = step; y <= worldH - borderTreeSize - step; y += step) {
      borderTrees.push({ x: 0, y, ...borderTree });
      borderTrees.push({ x: worldW - borderTreeSize, y, ...borderTree });
    }

    for (const t of borderTrees) {
      obstacles.push({
        x: t.x + borderTreeSize * 0.5,
        y: t.y + borderTreeSize * 0.5,
        r: treeR
      });
    }

  }

  return {
    obstacles,
    envObjects,
    ground: groundImg ? { img: groundImg, tiles: groundTiles, size: groundTileSize } : null,
    border: borderTrees,
    seed,
    width: worldW,
    height: worldH
  };
}

export function drawWorld(ctx, world, camera){
  // Ground.
  const g = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  g.addColorStop(0, '#1c3327');
  g.addColorStop(1, '#14251d');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // Clearing glow.
  const cx = GAME_WIDTH * 0.5;
  const cy = GAME_HEIGHT * 0.5;
  const rg = ctx.createRadialGradient(cx, cy, 30, cx, cy, 260);
  rg.addColorStop(0, 'rgba(58, 90, 68, 0.55)');
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  if (camera) {
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
  }

  if (world.ground) {
    const { img, tiles, size } = world.ground;
    const camX = camera ? camera.x : 0;
    const camY = camera ? camera.y : 0;
    const maxX = camX + GAME_WIDTH;
    const maxY = camY + GAME_HEIGHT;
    for (const t of tiles) {
      if (t.x + size < camX || t.y + size < camY || t.x > maxX || t.y > maxY) {
        continue;
      }
      ctx.drawImage(img, t.sx, t.sy, size, size, t.x, t.y, size, size);
    }
  }

  if (world.border && world.border.length) {
    const img = world.ground ? world.ground.img : null;
    if (img) {
      for (const t of world.border) {
        ctx.drawImage(img, t.sx, t.sy, t.size, t.size, t.x, t.y, t.size, t.size);
      }
    }
  }

  // Environment props.
  for (const o of world.envObjects || []) {
    const dx = Math.floor(o.x - o.w * 0.5);
    const dy = Math.floor(o.y - o.h * 0.5);
    ctx.drawImage(o.img, dx, dy, Math.floor(o.w), Math.floor(o.h));
  }

  if (camera) ctx.restore();

  // Subtle border frame (helps visually on bright monitors).
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, GAME_WIDTH - 2, GAME_HEIGHT - 2);
}
