import { GAME_WIDTH, GAME_HEIGHT, CONFIG } from './constants.js';
import { clamp, dist2, mulberry32, randRange, randInt } from './utils.js';
import { Enemy } from './enemy.js';

export class Spawner{
  constructor(assets){
    this.assets = assets;
    this.rng = mulberry32(0xBADC0DE);
    this.timer = 0;
    this.slime1SinceElite = 0;
    this.slime1SinceBoss = 0;
  }

  reset(){
    this.timer = 0.6;
    this.slime1SinceElite = 0;
    this.slime1SinceBoss = 0;
  }

  update(dt, enemies, player, score, world){
    if(enemies.length >= CONFIG.spawner.maxEnemies) return;

    this.timer -= dt;
    if(this.timer > 0) return;

    // Scale spawn rate slightly with score.
    const t = clamp(score / 28, 0, 1);
    const minI = CONFIG.spawner.minInterval;
    const maxI = CONFIG.spawner.maxInterval;
    const base = maxI + (minI - maxI) * t;

    // Jitter.
    this.timer = randRange(this.rng, base * 0.85, base * 1.15);

    const enemy = this._spawnOne(player, world);
    if(enemy) enemies.push(enemy);
  }

  _spawnOne(player, world){
    const r = CONFIG.enemy.radius;
    const margin = 6;
    const w = world ? world.width : GAME_WIDTH;
    const h = world ? world.height : GAME_HEIGHT;
    const inset = CONFIG.world.spawnInset || 0;

    for(let attempt = 0; attempt < 12; attempt++){
      const side = randInt(this.rng, 0, 3);
      let x = 0;
      let y = 0;

      if(side === 0){ // left
        x = r + margin + inset;
        y = randRange(this.rng, r + margin + inset, h - r - margin - inset);
      }else if(side === 1){ // right
        x = w - r - margin - inset;
        y = randRange(this.rng, r + margin + inset, h - r - margin - inset);
      }else if(side === 2){ // top
        x = randRange(this.rng, r + margin + inset, w - r - margin - inset);
        y = r + margin + inset;
      }else{ // bottom
        x = randRange(this.rng, r + margin + inset, w - r - margin - inset);
        y = h - r - margin - inset;
      }

      // Do not spawn on top of the player.
      const safe = 140;
      if(dist2(x, y, player.x, player.y) < safe * safe) continue;

      return new Enemy(x, y, this._pickType(), this.assets);
    }

    return null;
  }

  _pickType() {
    if (this.slime1SinceBoss >= 25) {
      this.slime1SinceBoss = 0;
      return 'slime2';
    }

    if (this.slime1SinceElite >= 10) {
      this.slime1SinceElite = 0;
      return 'slime3';
    }

    this.slime1SinceElite += 1;
    this.slime1SinceBoss += 1;
    return 'slime1';
  }
}
