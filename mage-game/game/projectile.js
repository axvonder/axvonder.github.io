import { GAME_WIDTH, GAME_HEIGHT, CONFIG } from './constants.js';

export class Projectile{
  constructor(asset, x, y, vx, vy, options = {}){
    const opts = typeof options === 'number' ? { damage: options } : options;
    const scale = typeof opts.scale === 'number' ? opts.scale : 1;
    const radius = typeof opts.radius === 'number'
      ? opts.radius
      : CONFIG.projectile.radius * scale;

    this.asset = asset;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;

    this.r = radius;
    this.damage = typeof opts.damage === 'number' ? opts.damage : CONFIG.projectile.damage;
    this.scale = scale;
    this.aoeRadius = typeof opts.aoeRadius === 'number' ? opts.aoeRadius : 0;
    this.tint = opts.tint || null;

    this.life = CONFIG.projectile.ttl;
    this.dead = false;
    
    // Animation
    this.frame = 0;
    this.animTime = 0;
    this.animSpeed = 0.08; // faster animation for projectile
    if (this.asset) {
      const h = this.asset.height || 16;
      const w = this.asset.width || h;
      let frameW = h;
      let frameCount = Math.max(1, Math.floor(w / frameW));
      if (w % frameW !== 0) {
        frameCount = 6;
        frameW = Math.floor(w / frameCount);
      }
      this.frameW = frameW;
      this.frameH = h;
      this.frameCount = Math.max(1, frameCount);
    } else {
      this.frameW = 16;
      this.frameH = 16;
      this.frameCount = 1;
    }
  }

  update(dt){
    if(this.dead) return;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.life -= dt;
    if(this.life <= 0) this.dead = true;
    
    // Animate frames
    this.animTime += dt;
    if (this.animTime >= this.animSpeed) {
      this.frame = (this.frame + 1) % this.frameCount;
      this.animTime = 0;
    }

    // Cull if fully out of bounds (with margin).
    const m = 32;
    const worldW = CONFIG.worldSize ? CONFIG.worldSize.width : GAME_WIDTH;
    const worldH = CONFIG.worldSize ? CONFIG.worldSize.height : GAME_HEIGHT;
    if(
      this.x < -m || this.x > worldW + m ||
      this.y < -m || this.y > worldH + m
    ){
      this.dead = true;
    }
  }

  draw(ctx){
    if(this.dead) return;

    if (!this.asset) return;

    ctx.save();

    const angle = Math.atan2(this.vy, this.vx);
    ctx.translate(this.x, this.y);
    ctx.rotate(angle);
    ctx.imageSmoothingEnabled = false;

    const scale = 0.68 * this.scale;
    const w = this.frameW * scale;
    const h = this.frameH * scale;
    const sx = this.frame * this.frameW;
    const sy = 0;
    const dx = Math.floor(-w * 0.5);
    const dy = Math.floor(-h * 0.5);

    if (this.tint === 'purple') {
      ctx.filter = 'hue-rotate(240deg) saturate(1.8) brightness(1.1)';
    } else if (this.tint === 'red') {
      ctx.filter = 'hue-rotate(120deg) saturate(2) brightness(1.1)';
    } else {
      ctx.filter = 'none';
    }

    ctx.drawImage(
      this.asset,
      sx, sy, this.frameW, this.frameH,
      dx, dy, Math.floor(w), Math.floor(h)
    );

    ctx.restore();
  }
}
