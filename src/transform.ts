import { GridTools, HexParams } from "./interfaces/types";
import * as Honeycomb from "honeycomb-grid";
import { Grid, Point, Hex, HexFactory } from "./interfaces/types";
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

  private gridTools: GridTools = null;
  public grid: Grid = null;

  public corners: Map<string, Point[]> = null;

  constructor() {
    store.subscribe(state => copy(state, this, ["zoom", "panX", "panY"]));
  }

  createGrid() {
    const hexParams: HexParams = { size: this.HEX_SIZE };
    const hexFactory: HexFactory = Honeycomb.extendHex(hexParams);

    this.gridTools = Honeycomb.defineGrid(hexFactory);
    this.grid = this.gridTools.rectangle({
      width: this.CELLS_X,
      height: this.CELLS_Y
    });

    const cornerArray = hexFactory().corners();
    this.corners = new Map();
    this.grid.forEach((hex: Hex) => {
      const point = hex.toPoint();
      const cornerValues = cornerArray.map(corner => corner.add(point));
      const key = `${hex.x},${hex.y}`;
      this.corners.set(key, cornerValues);
    });

    return [this.grid, this.gridTools];
  }

  getCorners = (hex: Hex) => {
    const key = `${hex.x},${hex.y}`;
    return this.corners.get(key);
  };

  pointToHex(x: number, y: number): Hex {
    const { wx, wy } = this;
    return this.grid.get(this.gridTools.pointToHex(wx(x), wy(y)));
  }

  getTriangleCorners(hex: Hex) {
    // triangle corners are: 0 - right, 1 - left, 2 - top
    return this.getCorners(hex).filter((v, i) => i % 2 === 1);
  }
}

export default new Transform();

// const bounds = event.target.getBoundingClientRect();
// const x = event.clientX - bounds.left;
// const y = event.clientY - bounds.top;
// return this.grid.get(this.gridTools.pointToHex(wx(x), wy(y)));
