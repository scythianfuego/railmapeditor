import store, { copy } from "./store";

// handles world to screen transformations and back
class Transform {
  constructor() {
    const state = store.getState();
    store.subscribe(state => copy(state, this, ["zoom", "panX", "panY"]));

    this.sx = x => x * this.zoom + this.panX;
    this.sy = y => y * this.zoom + this.panY;
    this.wx = x => (x - this.panX) / this.zoom;
    this.wy = y => (y - this.panY) / this.zoom;
    this.scale = v => v * this.zoom;

    // constants
    this.HEX_SIZE = 50 / Math.sqrt(3);
    this.CELLS_X = 7;
    this.CELLS_Y = 5;

    this.gridWidth = (this.CELLS_X + 0.5) * this.HEX_SIZE * Math.sqrt(3);
    this.gridHeight = this.CELLS_Y * this.HEX_SIZE * 1.5;

    this.clamp = (v, min, max) => (v > max ? max : v < min ? min : v);
    this.rotate = (v, min, max) => (v > max ? min : v < min ? max : v);

    this.ratioX = x =>
      this.clamp((x - this.panX) / (this.gridWidth * this.zoom), 0, 1);

    this.ratioY = y =>
      this.clamp((y - this.panY) / (this.gridHeight * this.zoom), 0, 1);
  }
}

export default new Transform();
