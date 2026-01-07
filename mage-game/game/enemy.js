import { GAME_WIDTH, GAME_HEIGHT, CONFIG } from './constants.js';
import { dist2, normalize } from './utils.js';
import { clampCircleToBounds, resolveCircleVsCircle } from './collision.js';

export class Enemy{
  constructor(x, y, type = 'slime1', assets = null){
    this.x = x;
    this.y = y;
    this.type = type;
    this.assets = assets && assets.enemies ? assets.enemies[type] : null;

    this.r = CONFIG.enemy.radius;
    this.speed = CONFIG.enemy.speed;

    const typeConfig = CONFIG.enemy.types[this.type] || CONFIG.enemy.types.slime1;
    this.maxHp = typeConfig.hp;
    this.hp = this.maxHp;
    this.contactDamage = typeof typeConfig.contactDamage === 'number'
      ? typeConfig.contactDamage
      : CONFIG.enemy.contactDamage;
    this.xpValue = typeof typeConfig.xpValue === 'number'
      ? typeConfig.xpValue
      : CONFIG.progression.xpPerKill;

    this.dead = false;
    this.dying = false;
    this.scored = false;

    this.state = 'walk'; // walk, attack, hurt, death
    this.facingRow = 0;
    this.frame = 0;
    this.animTime = 0;
    this.animSpeed = 0.12;
    this.animSpeedMultipliers = {
      walk: 0.6667,
      attack: 1,
      hurt: 1,
      death: 0.5
    };
    this.lastDir = { x: 0, y: 1 };
    this._hitFlash = 0;

    this.rows = 4;
    this.frames = this._buildFrames();
    this.scale = CONFIG.enemy.spriteScale;
  }

  takeDamage(amount){
    this.hp = Math.max(0, this.hp - amount);
    this._hitFlash = 0.12;
    if(this.hp <= 0) {
      this.state = 'death';
      this.frame = 0;
      this.animTime = 0;
      this.dying = true;
    } else {
      this.state = 'hurt';
      this.frame = 0;
      this.animTime = 0;
    }
  }

  update(dt, player, world){
    if(this.dead) return;
    if(this._hitFlash > 0) this._hitFlash -= dt;

    const dx = player.x - this.x;
    const dy = player.y - this.y;

    const dir = normalize(dx, dy);
    if (dir.x !== 0 || dir.y !== 0) {
      this.lastDir = dir;
    }
    this.facingRow = this._directionRow(this.lastDir.x, this.lastDir.y);

    if (!this.dying && this.state !== 'hurt') {
      const close = dist2(this.x, this.y, player.x, player.y) < (this.r + player.r + 6) ** 2;
      const nextState = close ? 'attack' : 'walk';
      if (this.state !== nextState) {
        this.state = nextState;
        this.frame = 0;
        this.animTime = 0;
      }

      this.x += dir.x * this.speed * dt;
      this.y += dir.y * this.speed * dt;

      // Collide with obstacles.
      for(const t of world.obstacles){
        resolveCircleVsCircle(this, { x: t.x, y: t.y, r: t.r });
      }

      // Keep inside bounds.
      const boundW = world && world.width ? world.width : GAME_WIDTH;
      const boundH = world && world.height ? world.height : GAME_HEIGHT;
      clampCircleToBounds(this, boundW, boundH);
    }

    this._advanceAnim(dt);
  }

  draw(ctx){
    if(this.dead) return;

    if (!this.assets || !this.frames.walk) {
      this._drawFallback(ctx);
      return;
    }

    const anim = this.frames[this.state] || this.frames.walk;
    const img = anim.img;
    const sx = this.frame * anim.frameW;
    const sy = this.facingRow * anim.frameH;
    const w = anim.frameW * this.scale;
    const h = anim.frameH * this.scale;
    const dx = Math.floor(this.x - w * 0.5);
    const dy = Math.floor(this.y - h * 0.5);

    ctx.save();

    if(this._hitFlash > 0){
      ctx.globalAlpha = 0.75;
    }

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      img,
      sx, sy, anim.frameW, anim.frameH,
      dx, dy, Math.floor(w), Math.floor(h)
    );

    // HP pips (very minimal).
    if(this.hp < this.maxHp){
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#fbf8f1';
      const w = this.r * 1.2;
      const h = 4;
      const x0 = this.x - w * 0.5;
      const y0 = this.y + this.r + 6;
      ctx.fillRect(x0, y0, w * (this.hp / this.maxHp), h);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  _advanceAnim(dt) {
    const anim = this.frames[this.state] || this.frames.walk;
    if (!anim) return;

    const speed = this.animSpeed * (this.animSpeedMultipliers[this.state] || 1);
    this.animTime += dt;
    if (this.animTime < speed) return;
    this.animTime = 0;

    this.frame += 1;
    if (this.state === 'death') {
      if (this.frame >= anim.frameCount) {
        this.dead = true;
        this.frame = anim.frameCount - 1;
      }
      return;
    }

    if (this.state === 'hurt') {
      if (this.frame >= anim.frameCount) {
        this.state = 'walk';
        this.frame = 0;
      }
      return;
    }

    if (this.frame >= anim.frameCount) {
      this.frame = 0;
    }
  }

  _buildFrames() {
    if (!this.assets) return {};

    const build = (img) => {
      if (!img) return null;
      const rows = img.height % this.rows === 0 ? this.rows : 1;
      const frameH = Math.floor(img.height / rows);
      const frameW = frameH;
      const frameCount = Math.max(1, Math.floor(img.width / frameW));
      return { img, frameW, frameH, frameCount, rows };
    };

    return {
      walk: build(this.assets.walk),
      attack: build(this.assets.attack),
      hurt: build(this.assets.hurt),
      death: build(this.assets.death)
    };
  }

  _directionRow(x, y) {
    const ax = Math.abs(x);
    const ay = Math.abs(y);
    if (ax > ay) {
      return x > 0 ? 3 : 2;
    }
    return y > 0 ? 0 : 1;
  }

  _drawFallback(ctx) {
    ctx.save();

    if(this._hitFlash > 0){
      ctx.globalAlpha = 0.75;
    }

    // Slime body.
    ctx.fillStyle = '#2d6158';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.stroke();

    // Eyes.
    ctx.fillStyle = '#0b0c0f';
    const ex = this.r * 0.35;
    const ey = this.r * 0.15;
    ctx.beginPath();
    ctx.arc(this.x - ex, this.y - ey, Math.max(2, this.r * 0.14), 0, Math.PI * 2);
    ctx.arc(this.x + ex, this.y - ey, Math.max(2, this.r * 0.14), 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
