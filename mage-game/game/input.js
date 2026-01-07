import { GAME_WIDTH, GAME_HEIGHT } from './constants.js';
import { normalize } from './utils.js';

export class Input{
  constructor(canvas){
    this.canvas = canvas;

    this.active = false;

    this.keysDown = new Set();
    this.keysJustPressed = new Set();

    this.pointer = {
      x: GAME_WIDTH * 0.5,
      y: GAME_HEIGHT * 0.5,
      has: false,
    };

    this._queuedShot = null;

    this._preventCodes = new Set([
      'KeyW', 'KeyA', 'KeyS', 'KeyD',
      'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight',
    ]);

    this._onKeyDown = (e) => {
      // Track even when inactive so state is correct when resuming.
      if (!this.keysDown.has(e.code)) {
        this.keysJustPressed.add(e.code);
      }
      this.keysDown.add(e.code);

      if(this.active && this._preventCodes.has(e.code)){
        e.preventDefault();
      }
    };

    this._onKeyUp = (e) => {
      this.keysDown.delete(e.code);

      if(this.active && this._preventCodes.has(e.code)){
        e.preventDefault();
      }
    };
  this.keysJustPressed.clear();
    
    this._onBlur = () => {
      this.keysDown.clear();
    };

    window.addEventListener('keydown', this._onKeyDown, { passive: false });
    window.addEventListener('keyup', this._onKeyUp, { passive: false });
    window.addEventListener('blur', this._onBlur);

    // Pointer input targets the canvas only.
    canvas.addEventListener('pointermove', (e) => this._handlePointerMove(e));
    canvas.addEventListener('pointerdown', (e) => this._handlePointerDown(e));

    // Prevent context menu from stealing focus if right-click happens.
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  destroy(){
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
  }

  clearJustPressed(){
    this.keysJustPressed.clear();
  }

  setActive(active){
    this.active = active;
  }

  getMoveVector(){
    let x = 0;
    let y = 0;

    if(this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft')) x -= 1;
    if(this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) x += 1;
    if(this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp')) y -= 1;
    if(this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown')) y += 1;

    return normalize(x, y);
  }

  isShootHeld(){
    return false;
  }

  consumePointerShot(){
    const s = this._queuedShot;
    this._queuedShot = null;
    return s;
  }

  getPointer(){
    return this.pointer;
  }

  _handlePointerMove(e){
    const rect = this.canvas.getBoundingClientRect();
    if(rect.width === 0 || rect.height === 0) return;

    const x = ((e.clientX - rect.left) / rect.width) * GAME_WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * GAME_HEIGHT;

    this.pointer.x = x;
    this.pointer.y = y;
    this.pointer.has = true;
  }

  _handlePointerDown(e){
    if(!this.active) return;
    if(e.button !== 0 && e.button !== 2) return;

    this._handlePointerMove(e);
    const type = e.button === 2 ? 'mega' : 'normal';
    this._queuedShot = { x: this.pointer.x, y: this.pointer.y, type };
  }
}
