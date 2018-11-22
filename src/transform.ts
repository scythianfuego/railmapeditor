import { GridTools } from "./transform";
import * as Honeycomb from "honeycomb-grid";
import { Hex, Grid, GridFactory } from "honeycomb-grid";
import store, { copy } from "./store";

type HexParams = { size: number };
export type GridTools = GridFactory<Hex<HexParams>>;
export type Hex = Honeycomb.Hex<HexParams>;
export type Grid = Grid;

// handles world to screen transformations and back
class Transform {
  public HEX_SIZE = 50 / Math.sqrt(3);
  public CELLS_X = 7;
  public CELLS_Y = 5;
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
  public clamp = (v: number, min: number, max: number) =>
    v > max ? max : v < min ? min : v;
  public rotate = (v: number, min: number, max: number) =>
    v > max ? min : v < min ? max : v;
  public ratioX = (x: number) =>
    this.clamp((x - this.panX) / (this.gridWidth * this.zoom), 0, 1);
  public ratioY = (y: number) =>
    this.clamp((y - this.panY) / (this.gridHeight * this.zoom), 0, 1);

  private gridTools: GridTools = null;
  public grid: Grid = null;

  constructor() {
    store.subscribe(state => copy(state, this, ["zoom", "panX", "panY"]));
  }

  createGrid() {
    const hexParams: HexParams = { size: this.HEX_SIZE };
    const Hex: Honeycomb.HexFactory<HexParams> = Honeycomb.extendHex(hexParams);

    this.gridTools = Honeycomb.defineGrid(Hex);
    this.grid = this.gridTools.rectangle({
      width: this.CELLS_X,
      height: this.CELLS_Y
    });
    return [this.grid, this.gridTools];
  }

  pointToHex(x: number, y: number) {
    const { wx, wy } = this;
    return this.grid.get(this.gridTools.pointToHex(wx(x), wy(y)));
  }
}

export default new Transform();

// const bounds = event.target.getBoundingClientRect();
// const x = event.clientX - bounds.left;
// const y = event.clientY - bounds.top;
// return this.grid.get(this.gridTools.pointToHex(wx(x), wy(y)));
