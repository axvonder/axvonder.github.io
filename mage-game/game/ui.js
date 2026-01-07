export class UI{
  constructor(){
    this.overlayPlay = document.getElementById('overlayPlay');
    this.overlayGameOver = document.getElementById('overlayGameOver');
    this.overlayPause = document.getElementById('overlayPause');
    this.overlayStats = document.getElementById('overlayStats');

    this.btnPlay = document.getElementById('btnPlay');
    this.btnRestart = document.getElementById('btnRestart');
    this.btnResume = document.getElementById('btnResume');
    this.btnStats = document.getElementById('btnStats');
    this.btnCloseStats = document.getElementById('btnCloseStats');

    this.hudHpFill = document.getElementById('hudHpFill');
    this.hudHpText = document.getElementById('hudHpText');
    this.hudManaFill = document.getElementById('hudManaFill');
    this.hudManaText = document.getElementById('hudManaText');
    this.hudManaOrb = document.getElementById('hudManaOrb');
    this.hudXpFill = document.getElementById('hudXpFill');
    this.hudXpText = document.getElementById('hudXpText');
    this.hudLevel = document.getElementById('hudLevel');
    this.hudKills = document.getElementById('hudKills');
    this.statsBody = document.getElementById('statsBody');

    this.gameOverKills = document.getElementById('gameOverKills');
    this.gameOverTime = document.getElementById('gameOverTime');
    this.gameOverLevel = document.getElementById('gameOverLevel');
    this.gameOverBest = document.getElementById('gameOverBest');
    this.playBest = document.getElementById('playBest');

    if(
      !this.overlayPlay || !this.overlayGameOver || !this.overlayPause ||
      !this.overlayStats || !this.btnPlay || !this.btnRestart || !this.btnResume ||
      !this.btnStats || !this.btnCloseStats || !this.statsBody
    ){
      throw new Error('UI elements missing. Check game.html IDs.');
    }
  }

  onPlay(handler){
    this.btnPlay.addEventListener('click', handler);
  }

  onRestart(handler){
    this.btnRestart.addEventListener('click', handler);
  }

  onResume(handler){
    this.btnResume.addEventListener('click', handler);
  }

  onStats(handler){
    this.btnStats.addEventListener('click', handler);
  }

  onCloseStats(handler){
    this.btnCloseStats.addEventListener('click', handler);
  }

  showPlay(){
    this._setOverlay(this.overlayPlay, true);
    this._setOverlay(this.overlayGameOver, false);
    this._setOverlay(this.overlayPause, false);
    this._setOverlay(this.overlayStats, false);
    this.btnPlay.focus();
  }

  hidePlay(){
    this._setOverlay(this.overlayPlay, false);
  }

  showGameOver({ score, survivedSeconds, level, bestRun }){
    this.gameOverKills.textContent = score;
    this.gameOverTime.textContent = `${survivedSeconds.toFixed(1)}s`;
    this.gameOverLevel.textContent = level;
    if (bestRun) {
      this.gameOverBest.textContent = `Best: ${bestRun.kills} kills · ${bestRun.time.toFixed(1)}s · Lv ${bestRun.level}`;
    }
    this._setOverlay(this.overlayPlay, false);
    this._setOverlay(this.overlayGameOver, true);
    this._setOverlay(this.overlayPause, false);
    this._setOverlay(this.overlayStats, false);
    this.btnRestart.focus();
  }

  hideGameOver(){
    this._setOverlay(this.overlayGameOver, false);
  }

  showPause(){
    this._setOverlay(this.overlayPause, true);
    this._setOverlay(this.overlayGameOver, false);
    this._setOverlay(this.overlayStats, false);
    this.btnResume.focus();
  }

  hidePause(){
    this._setOverlay(this.overlayPause, false);
  }

  showStats(statsData){
    if (this.statsBody && statsData) {
      const renderSection = (title, rows) => {
        const items = rows.map(({ label, value }) => (
          `<div class="stats-row"><dt>${label}</dt><dd>${value}</dd></div>`
        )).join('');
        return `
          <section class="stats-block">
            <h3>${title}</h3>
            <dl class="stats-list">${items}</dl>
          </section>
        `;
      };

      this.statsBody.innerHTML = [
        renderSection('Player', statsData.player || []),
        renderSection('Normal Spell', statsData.normal || []),
        renderSection('Mega Spell', statsData.mega || [])
      ].join('');
    }

    this._setOverlay(this.overlayStats, true);
    this.btnCloseStats.focus();
  }

  hideStats(){
    this._setOverlay(this.overlayStats, false);
  }

  setHud({ hp, maxHp, mana, maxMana, xp, xpToNext, level, score, manaFlash }){
    const hpPct = maxHp > 0 ? (hp / maxHp) * 100 : 0;
    const manaPct = maxMana > 0 ? (mana / maxMana) * 100 : 0;
    const xpPct = xpToNext > 0 ? (xp / xpToNext) * 100 : 0;
    this.hudHpFill.style.height = `${hpPct}%`;
    this.hudManaFill.style.height = `${manaPct}%`;
    this.hudXpFill.style.width = `${xpPct}%`;
    this.hudHpText.textContent = `HP ${Math.floor(hp)}/${Math.round(maxHp)}`;
    this.hudManaText.textContent = `Mana ${Math.floor(mana)}/${Math.round(maxMana)}`;
    this.hudXpText.textContent = `XP ${xp}/${xpToNext}`;
    this.hudLevel.textContent = String(level);
    this.hudKills.textContent = String(score);
    if (this.hudManaOrb) {
      this.hudManaOrb.classList.toggle('hud-orb-flash', Boolean(manaFlash));
    }
  }

  setBestRun(bestRun){
    if (!this.playBest) return;
    if (!bestRun) {
      this.playBest.textContent = 'Best: —';
      return;
    }
    this.playBest.textContent = `Best: ${bestRun.kills} kills · ${bestRun.time.toFixed(1)}s · Lv ${bestRun.level}`;
  }

  _setOverlay(el, visible){
    el.classList.toggle('game-overlay-hidden', !visible);
    el.setAttribute('aria-hidden', String(!visible));
  }
}
