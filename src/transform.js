import store, { copy } from "./store";

// handles world to screen transformations and back
class Transform {
  constructor() {
    const state = store.getState();
    store.subscribe(state => copy(state, this, ["zoom", "panX", "panY"]));

    this.sx = x => (x + this.panX) * this.zoom;
    this.sy = y => (y + this.panY) * this.zoom;
    this.wx = x => x / this.zoom - this.panX;
    this.wy = y => y / this.zoom - this.panY;
    this.scale = v => v * this.zoom;
  }
}

export default new Transform();
