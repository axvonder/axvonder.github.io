import { GAME_WIDTH, GAME_HEIGHT, CONFIG } from './constants.js';
import { normalize, length } from './utils.js';
import { clampCircleToBounds, resolveCircleVsCircle } from './collision.js';
import { Projectile } from './projectile.js';

export class Player {
  constructor(assets, x = GAME_WIDTH / 2, y = GAME_HEIGHT / 2) {
    this.assets = assets; // Passed from main.js: { mage_idle, mage_walk, ... }

    this.r = CONFIG.player.radius;
    this.maxHp = CONFIG.player.maxHp;
    this.maxMana = CONFIG.player.maxMana;
    this.manaRegen = CONFIG.player.manaRegen;
    this.reset(x, y);
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.hp = this.maxHp;
    this.mana = this.maxMana;
    this.speed = CONFIG.player.speed;
    this.lastDir = { x: 1, y: 0 };
    this.fireCooldown = 0;
    this.healCooldown = 0;
    this.iFrame = 0;
    this._tookHitFlash = 0;
    this.noManaFlash = 0;
    this.levelUpFlash = 0;
    this.levelUpFlashDuration = 0.9;

    this.level = 1;
    this.xp = 0;
    this.xpToNext = this._xpRequired(this.level);
    this.damage = CONFIG.projectile.damage;
    const healBase = typeof CONFIG.progression.healBase === 'number'
      ? CONFIG.progression.healBase
      : this.maxHp;
    this.healAmount = healBase;
    this.fireCooldownBase = CONFIG.player.fireCooldown;
    this.healCooldownBase = 3;

    // Animation state
    this.state = 'idle'; // idle, walk, run, attack, heal, hurt, dead
    this.facing = 1;     // 1 = right, -1 = left
    this.frame = 0;
    this.animTime = 0;
    this.animSpeed = 0.1; // seconds per frame
    this.frameCounts = {
      idle: 8,   // 1024 ÷ 128 = 8
      walk: 7,   // 896 ÷ 128 = 7
      run: 8,    // 1024 ÷ 128 = 8
      attack: 16, // 2048 ÷ 128 = 16
      heal: 7,   // 896 ÷ 128 = 7
      hurt: 4,   // 512 ÷ 128 = 4
      dead: 4    // 512 ÷ 128 = 4
    };

    this.pendingShot = null;
    this.pendingShotType = null;
    this.pendingProjectile = null;
    this.attackCastTimeMult = 1;
    this.attackFrameStep = 1;
    this.attackType = 'normal';
    this.attackReleaseFrac = 0.5;
    this.attackReleaseOffset = 0;
    this.attackEndSkip = 0;
    this.useAimAtRelease = false;

    this.frameCounts.attack = this.getFrameCount(this.assets.mage_attack, this.frameCounts.attack);
    this.frameCounts.hurt = this.getFrameCount(this.assets.mage_hurt, this.frameCounts.hurt);
  }

  _xpRequired(level) {
    const base = CONFIG.progression.xpToNextBase;
    const growth = CONFIG.progression.xpGrowth;
    return Math.floor(base * Math.pow(growth, level - 1));
  }

  _getSpellConfig(type) {
    const spells = CONFIG.spells || {};
    if (type === 'mega' && spells.mega) return spells.mega;
    return spells.normal || spells.mega;
  }

  gainXp(amount) {
    this.xp += amount;
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.levelUp();
    }
  }

  levelUp() {
    this.level += 1;
    this.maxHp += CONFIG.progression.hpPerLevel;
    this.damage += CONFIG.progression.damagePerLevel;
    const manaPerLevel = typeof CONFIG.progression.manaPerLevel === 'number'
      ? CONFIG.progression.manaPerLevel
      : 0;
    const manaRegenPerLevel = typeof CONFIG.progression.manaRegenPerLevel === 'number'
      ? CONFIG.progression.manaRegenPerLevel
      : 0;
    this.maxMana += manaPerLevel;
    this.manaRegen += manaRegenPerLevel;
    this.healAmount += CONFIG.progression.healPerLevel;
    this.fireCooldownBase = Math.max(
      CONFIG.progression.minFireCooldown,
      this.fireCooldownBase * CONFIG.progression.fireCooldownMultiplier
    );
    this.healCooldownBase = Math.max(
      CONFIG.progression.minHealCooldown,
      this.healCooldownBase * CONFIG.progression.healCooldownMultiplier
    );

    this.hp = this.maxHp;
    this.mana = this.maxMana;
    this.xpToNext = this._xpRequired(this.level);
    this.levelUpFlash = this.levelUpFlashDuration;
  }

  getFrameCount(img, fallback) {
    if (!img || !img.height) return fallback;
    const count = Math.floor(img.width / img.height);
    return Math.max(1, count || fallback);
  }

  _getCamera(world) {
    const boundW = world && world.width ? world.width : GAME_WIDTH;
    const boundH = world && world.height ? world.height : GAME_HEIGHT;
    const maxX = Math.max(0, boundW - GAME_WIDTH);
    const maxY = Math.max(0, boundH - GAME_HEIGHT);
    return {
      x: Math.max(0, Math.min(this.x - GAME_WIDTH * 0.5, maxX)),
      y: Math.max(0, Math.min(this.y - GAME_HEIGHT * 0.5, maxY))
    };
  }

  update(dt, input, world) {
    if (this.state === 'dead') return;

    // Cooldowns
    if (this.fireCooldown > 0) this.fireCooldown -= dt;
    if (this.healCooldown > 0) this.healCooldown -= dt;
    if (this.iFrame > 0) this.iFrame -= dt;
    if (this._tookHitFlash > 0) this._tookHitFlash -= dt;
    if (this.noManaFlash > 0) this.noManaFlash = Math.max(0, this.noManaFlash - dt);
    if (this.levelUpFlash > 0) this.levelUpFlash = Math.max(0, this.levelUpFlash - dt);
    this.mana = Math.min(this.maxMana, this.mana + this.manaRegen * dt);

    // Movement
    const mv = input.getMoveVector();
    const mvLen = length(mv.x, mv.y);
    let moving = mvLen > 0;

    if (moving) {
      this.lastDir = normalize(mv.x, mv.y);
      this.facing = this.lastDir.x !== 0 ? Math.sign(this.lastDir.x) : this.facing;

      const isRunning = input.keysDown.has('ShiftLeft') || input.keysDown.has('ShiftRight');
      const currentSpeed = isRunning ? this.speed * 2 : this.speed;

      this.x += mv.x * currentSpeed * dt;
      this.y += mv.y * currentSpeed * dt;

      if (this.state !== 'attack' && this.state !== 'heal') {
        this.state = isRunning ? 'run' : 'walk';
      }
    } else if (this.state !== 'attack' && this.state !== 'heal') {
      this.state = 'idle';
    }

    // Collide with obstacles
    for (const t of world.obstacles) {
      resolveCircleVsCircle(this, { x: t.x, y: t.y, r: t.r });
    }
    const boundW = world && world.width ? world.width : GAME_WIDTH;
    const boundH = world && world.height ? world.height : GAME_HEIGHT;
    clampCircleToBounds(this, boundW, boundH);

    // Attack (handled externally in main.js, but we track animation)
    // Heal (H key)
    if (input.keysJustPressed.has('KeyH') && this.healCooldown <= 0 && this.state !== 'dead') {
      const healManaCost = typeof CONFIG.player.healManaCost === 'number'
        ? CONFIG.player.healManaCost
        : 0;
      if (this.mana < healManaCost) {
        this.noManaFlash = 0.25;
      } else {
        this.mana = Math.max(0, this.mana - healManaCost);
        this.state = 'heal';
        this.frame = 0;
        this.animTime = 0;
        this.hp = Math.min(this.maxHp, this.hp + this.healAmount);
        this.healCooldown = this.healCooldownBase;
      }
    }

    // Animation timing
    const frames = this.frameCounts[this.state] || 6;
    // Faster animation for attack (3.5x speed for smoother look)
    const attackSpeed = this.animSpeed * 0.25 * 0.9 * 1.35 * 1.3;
    const speed = this.state === 'attack'
      ? attackSpeed * (this.attackCastTimeMult || 1)
      : this.animSpeed;
    this.animTime += dt;
    if (this.animTime >= speed) {
      this.animTime = 0;

      if (this.state === 'hurt') {
        this.frame += 1;
        if (this.frame >= frames) {
          const isRunning = input.keysDown.has('ShiftLeft') || input.keysDown.has('ShiftRight');
          this.state = moving ? (isRunning ? 'run' : 'walk') : 'idle';
          this.frame = 0;
        }
      } else if (this.state === 'attack') {
        const step = this.attackFrameStep || 1;
        this.frame += step;

        const endFrame = Math.max(1, frames - (this.attackEndSkip || 0));
        const baseRelease = Math.floor(frames * (this.attackReleaseFrac || 0.5));
        const releaseFrame = Math.max(
          0,
          Math.min(
            endFrame - 1,
            baseRelease + (this.attackReleaseOffset || 0)
          )
        );
        if (this.pendingShot && this.frame >= releaseFrame) {
          let shotDir = this.pendingShot;
          if (this.pendingShotType === 'mega' && this.useAimAtRelease) {
            const ptr = input.getPointer();
            if (ptr && ptr.has) {
              const cam = this._getCamera(world);
              const worldX = cam.x + ptr.x;
              const worldY = cam.y + ptr.y;
              shotDir = { x: worldX - this.x, y: worldY - this.y };
            }
          }
          const proj = this.shoot(shotDir, this.pendingShotType);
          if (proj) this.pendingProjectile = proj;
          this.pendingShot = null;
          this.pendingShotType = null;
        }

        if (this.frame >= endFrame) {
          const isRunning = input.keysDown.has('ShiftLeft') || input.keysDown.has('ShiftRight');
          this.state = moving ? (isRunning ? 'run' : 'walk') : 'idle';
          this.frame = 0;
          this.attackCastTimeMult = 1;
          this.attackFrameStep = 1;
          this.attackType = 'normal';
          this.attackReleaseFrac = 0.5;
          this.attackReleaseOffset = 0;
          this.attackEndSkip = 0;
          this.useAimAtRelease = false;
        }
      } else {
        this.frame = (this.frame + 1) % frames;

        // End attack/heal animation when loop completes
        if (this.state === 'heal' && this.frame === 0) {
          const isRunning = input.keysDown.has('ShiftLeft') || input.keysDown.has('ShiftRight');
          this.state = moving ? (isRunning ? 'run' : 'walk') : 'idle';
          this.frame = 0;
        }
      }
    }

    if (this.hp <= 0 && this.state !== 'dead') {
      this.state = 'dead';
      this.frame = 0;
    }
  }

  startAttack(castTimeMult = 1) {
    if (this.fireCooldown > 0 || this.state === 'dead') return false;
    this.state = 'attack';
    this.frame = 0;
    this.animTime = 0;
    this.attackCastTimeMult = castTimeMult;
    return true;
  }

  canShoot() {
    return this.fireCooldown <= 0;
  }

  queueShot(dir, type = 'normal') {
    if (this.pendingShot) return false;
    if (this.fireCooldown > 0 || this.state === 'dead') return false;
    const nd = normalize(dir.x, dir.y);
    if (nd.x === 0 && nd.y === 0) return false;
    const spell = this._getSpellConfig(type);
    if (!spell) return false;
    if (this.mana < spell.manaCost) {
      this.noManaFlash = 0.25;
      return false;
    }
    if (!this.startAttack(spell.castTimeMult)) return false;
    this.attackType = type;
    const isMega = type === 'mega';
    this.attackFrameStep = 1;
    this.attackReleaseFrac = isMega ? 0.6 : 0.45;
    this.attackReleaseOffset = isMega ? 2 : -2;
    this.attackEndSkip = isMega ? 0 : 6;
    this.useAimAtRelease = isMega;
    this.mana = Math.max(0, this.mana - spell.manaCost);
    this.lastDir = nd;
    if (nd.x !== 0) this.facing = Math.sign(nd.x);
    this.pendingShot = { x: nd.x, y: nd.y };
    this.pendingShotType = type;
    return true;
  }

  shoot(dir, type = 'normal') {
    if (this.fireCooldown > 0) return null;
    const nd = normalize(dir.x, dir.y);
    if (nd.x === 0 && nd.y === 0) return null;

    const shotType = type || dir.type || 'normal';
    const spell = this._getSpellConfig(shotType);
    const damageMult = spell ? spell.damageMult : 1;
    const projectileScale = spell ? spell.projectileScale : 1;
    const aoeRadius = spell ? spell.aoeRadius : 0;
    const tint = spell ? spell.tint : null;

    const sx = this.x + nd.x * (this.r + 10);
    const sy = this.y + nd.y * (this.r + 10);
    const speed = CONFIG.projectile.speed;
    const vx = nd.x * speed;
    const vy = nd.y * speed;

    this.fireCooldown = this.fireCooldownBase;
    return new Projectile(this.assets.projectile_bolt, sx, sy, vx, vy, {
      damage: this.damage * damageMult,
      scale: projectileScale,
      radius: CONFIG.projectile.radius * projectileScale,
      aoeRadius,
      tint
    });
  }

  consumeProjectile() {
    const p = this.pendingProjectile;
    this.pendingProjectile = null;
    return p;
  }

  takeDamage(amount) {
    if (this.iFrame > 0 || this.state === 'dead') return;
    this.hp = Math.max(0, this.hp - amount);
    this.iFrame = CONFIG.player.iFrameTime;
    this._tookHitFlash = 0.15;
    this.pendingShot = null;
    this.pendingShotType = null;
    this.pendingProjectile = null;
    this.attackCastTimeMult = 1;
    this.attackFrameStep = 1;
    this.attackType = 'normal';
    this.attackReleaseFrac = 0.5;
    this.attackReleaseOffset = 0;
    this.attackEndSkip = 0;
    this.useAimAtRelease = false;
    if (this.hp > 0) {
      this.state = 'hurt';
      this.frame = 0;
      this.animTime = 0;
    }
  }

  draw(ctx) {
    const imgMap = {
      idle: this.assets.mage_idle,
      walk: this.assets.mage_walk,
      run: this.assets.mage_run,
      attack: this.assets.mage_attack,
      heal: this.assets.mage_heal,
      hurt: this.assets.mage_hurt,
      dead: this.assets.mage_dead
    };

    let img = imgMap[this.state] || this.assets.mage_idle;
    if (!img) return; // Safety check

    const totalFrames = this.frameCounts[this.state];
    const frameW = Math.floor(img.width / totalFrames);
    const frameH = img.height;
    const scale = 0.8;
    const w = frameW * scale;
    const h = frameH * scale;

    ctx.save();
    
    // Reset any lingering filters/compositing from other draws
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
    
    ctx.translate(Math.floor(this.x), Math.floor(this.y));

    if (this.levelUpFlash > 0) {
      const t = this.levelUpFlash / this.levelUpFlashDuration;
      const pulse = 1 + (1 - t) * 0.5;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.85 * t;
      ctx.strokeStyle = 'rgba(255, 232, 170, 0.95)';
      ctx.lineWidth = 4 + (1 - t) * 3;
      ctx.shadowColor = 'rgba(255, 232, 170, 0.9)';
      ctx.shadowBlur = 26;
      ctx.beginPath();
      ctx.arc(0, -6, (this.r + 14) * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.28 * t;
      ctx.fillStyle = 'rgba(120, 255, 220, 0.6)';
      ctx.beginPath();
      ctx.arc(0, -6, (this.r + 6) * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Flash red on hit
    if (this._tookHitFlash > 0) {
      ctx.globalAlpha = 0.7 + 0.3 * Math.sin(this._tookHitFlash * 50);
      ctx.filter = 'brightness(1.8) hue-rotate(0deg)';
    }

    // Flip if facing left
    if (this.facing < 0) {
      ctx.scale(-1, 1);
    }

    // Draw sprite centered, slightly above ground
    const sx = this.frame * frameW;
    const sy = 0;
    const dx = Math.floor(-w / 2);
    const dy = Math.floor(-h + 10);
    
    ctx.drawImage(
      img,
      sx, sy, frameW, frameH,
      dx, dy, Math.floor(w), Math.floor(h)
    );

    ctx.restore();
  }
}
