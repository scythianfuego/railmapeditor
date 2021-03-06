import store, { copy } from "./store";

// handles world to screen transformations and back
class Transform {
  public HEX_SIZE = 1 / Math.sqrt(3);
  public CELLS_X = 70;
  public CELLS_Y = 50;
  public zoom = 0;
  public panX = 0;
  public panY = 0;

  public gridWidth = (this.CELLS_X + 0.5) * this.HEX_SIZE * Math.sqrt(3);
  public gridHeight = this.CELLS_Y * this.HEX_SIZE * 1.5;
  public sx = (x: number) => x * this.zoom + this.panX;
  public sy = (y: number) => y * this.zoom + this.panY;
  public wx = (x: number) => (x - this.panX) / this.zoom;
  public wy = (y: number) => (y - this.panY) / this.zoom;
  public scale = (v: number) => v * this.zoom;
  public pixels = (v: number) => v / this.zoom;
  public clamp = (v: number, min: number, max: number) =>
    v > max ? max : v < min ? min : v;
  public rotate = (v: number, min: number, max: number) =>
    v > max ? min : v < min ? max : v;
  public ratioX = (x: number) =>
    this.clamp((x - this.panX) / (this.gridWidth * this.zoom), 0, 1);
  public ratioY = (y: number) =>
    this.clamp((y - this.panY) / (this.gridHeight * this.zoom), 0, 1);

  private hf = (x: number) => (x * 76283 + 43633) | 0;
  public hash = () =>
    (this.hf(this.zoom) + this.hf(this.panX) + this.hf(this.panY)) | 0;

  constructor() {
    store.subscribe(state => copy(state, this, ["zoom", "panX", "panY"]));
  }

  snap(coords: number[]) {
    const yStep = Math.sqrt(3) * 0.25;
    const xStep = 0.5;

    const [mx, my] = coords;
    let x = this.wx(mx);
    let y = this.wy(my);
    y = Math.round(y / yStep) * yStep;
    const yIsOdd = Math.round(y / yStep) % 2;
    x = Math.round(x / xStep) * xStep;
    x += yIsOdd ? xStep * 0.5 : 0;
    return [x, y];
  }
}

export default new Transform();
