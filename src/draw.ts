import storeInstance, { copy } from "./store";
import ts, { Grid, Hex } from "./transform";
import Model from "./model";
import IRailObject from "./interfaces/IRailObject";
import IHintLine from "./interfaces/IHintLine";
import IState from "./interfaces/IState";
import { Listener, Store } from "unistore";

const TAU = 2 * Math.PI;
const hex2rgba = (hex: string) => {
  const [r, g, b, a] = hex.match(/\w\w/g).map(x => parseInt(x, 16));
  return `rgba(${r},${g},${b},${a ? a * 0.00392156862745098 : 1})`;
};

const colors = {
  background: "#000",
  gridBackground: "#553835"
};

const { sx, sy, scale, pixels, getCorners } = ts;

export default class Draw {
  private ctx: CanvasRenderingContext2D;
  private hexgrid: Grid;

  private screen = {
    moveTo: (x: number, y: number) => this.ctx.moveTo(sx(x), sy(y)),
    lineTo: (x: number, y: number) => this.ctx.lineTo(sx(x), sy(y)),
    arc: (
      x: number,
      y: number,
      radius: number,
      a1: number,
      a2: number,
      ccw: boolean = false
    ) => this.ctx.arc(sx(x), sy(y), scale(radius), a1, a2, ccw),
    circle: (x: number, y: number, radius: number) =>
      this.ctx.arc(sx(x), sy(y), radius, 0, TAU),
    fillText: (text: string, x: number, y: number, maxWidth?: number) =>
      this.ctx.fillText(text, sx(x), sy(y), maxWidth),
    fillRect: (x: number, y: number, w: number, h: number) =>
      this.ctx.fillRect(sx(x), sy(y), scale(w), scale(h)),
    strokeRect: (x: number, y: number, w: number, h: number) =>
      this.ctx.strokeRect(sx(x), sy(y), scale(w), scale(h)),
    roundRect: (x: number, y: number, w: number, h: number, r: number) => {
      r = w < r * 2 ? w * 0.5 : r;
      r = h < r * 2 ? h * 0.5 : r;
      // r = scale(r);
      // x = sx(x);
      // y = sy(y);
      // w = scale(w);
      // h = scale(h);
      this.ctx.beginPath();
      this.ctx.moveTo(x + r, y);
      this.ctx.arcTo(x + w, y, x + w, y + h, r);
      this.ctx.arcTo(x + w, y + h, x, y + h, r);
      this.ctx.arcTo(x, y + h, x, y, r);
      this.ctx.arcTo(x, y, x + w, y, r);
      this.ctx.closePath();
    }
  };

  // state variables, refactor
  private state: any = null;
  private hints: any;
  private tool: any;
  private selectionMode: any;
  private cursorCell: any;
  private zoom: any;
  private panX: any;
  private panY: any;

  private labelCache: [number, number, string][] = [];

  constructor(private canvas: HTMLCanvasElement, private model: Model) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.hexgrid = ts.grid;
    this.model = model;
    this.cursorCell = null;
    this.ctx.translate(0.5, 0.5);

    // moveable and zoomable parts of canvas
    //(state: K, action?: Action<K>) => void;
    const subscribeListener: Listener<IState> = (state: IState) => {
      copy(state, this, [
        "hints",
        "tool",
        "cursorCell",
        "selectionMode",
        "zoom",
        "panX",
        "panY"
      ]);
      this.state = state; // todo: refactor out mouse
      this.canvas.style.cursor = state.mouse.pan ? "grabbing" : "pointer";
    };

    storeInstance.subscribe(subscribeListener);
  }

  private getColor(type: number, selected: boolean) {
    if (this.selectionMode) {
      return selected ? "red" : "#ccc";
    }
    if (0x20 <= type && type <= 0x29) {
      return "yellow";
    }

    if (0x30 <= type && type <= 0x39) {
      return "#00ff2a";
    }

    if (0x40 <= type && type <= 0x49) {
      return "#00baff";
    }

    return "#ffa834";
  }

  private clear() {
    this.ctx.fillStyle = colors.background;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  public all() {
    this.labelCache = [];
    this.clear();
    this.grid();
    !this.selectionMode && this.cell(this.cursorCell, "#fff");

    this.connections();
    this.model.forEach((obj: IRailObject) => this.object(obj));
    this.cursor();
    this.labelCache.forEach(([x, y, what]) => this.text(x, y, what));
    this.selectionFrame();
    this.helpline();
  }

  private cursor() {
    this.tool && this.cursorCell && this.object(this.tool(this.cursorCell));
  }

  private cell(hex: Hex, style: string) {
    if (!hex) {
      return;
    }
    this.ctx.strokeStyle = style || "#000";
    const corners = getCorners(hex);
    const [firstCorner, ...otherCorners] = corners;

    this.ctx.beginPath();
    this.screen.moveTo(firstCorner.x, firstCorner.y); // move the "pen" to the first corner
    otherCorners.forEach(corner => this.screen.lineTo(corner.x, corner.y)); // draw lines to the other corners
    this.screen.lineTo(firstCorner.x, firstCorner.y); // finish at the first corner
    this.ctx.stroke();
  }

  private grid() {
    // todo: renew only when transform changed
    const { gridWidth, gridHeight } = ts;

    this.ctx.fillStyle = colors.gridBackground;
    this.screen.fillRect(0, 0, gridWidth, gridHeight);
    this.ctx.lineWidth = 1;
    this.ctx.font = "7px Arial";
    const n1px = pixels(-1);
    const p1px = pixels(1);
    this.screen.strokeRect(n1px, n1px, gridWidth + p1px, gridHeight + p1px);

    // hexes
    this.ctx.beginPath();
    ts.corners.forEach(corners => {
      this.ctx.strokeStyle = "#825651";
      // const corners = getCorners(hex);
      const [firstCorner, ...otherCorners] = corners;

      this.screen.moveTo(firstCorner.x, firstCorner.y); // move the "pen" to the first corner
      otherCorners.forEach(corner => this.screen.lineTo(corner.x, corner.y)); // draw lines to the other corners
      this.screen.lineTo(firstCorner.x, firstCorner.y); // finish at the first corner
    });
    this.ctx.stroke();

    // triangles
    this.ctx.strokeStyle = "#603f3c";
    this.ctx.beginPath();
    ts.corners.forEach(corners => {
      // const corners = getCorners(hex);
      this.screen.moveTo(corners[1].x, corners[1].y); // move the "pen" to the first corner
      [3, 5, 1].forEach(i => this.screen.lineTo(corners[i].x, corners[i].y));
    });
    this.ctx.stroke();
  }

  // private point(x: number, y: number, style: string, size: number) {
  //   this.ctx.lineWidth = 1;
  //   this.ctx.fillStyle = style ? style : "cyan";
  //   this.ctx.beginPath();
  //   this.ctx.arc(x, y, size ? size : 3, 0, TAU);
  //   this.ctx.fill();
  // }

  // private arrow(sx: number, sy: number, ex: number, ey: number) {
  //   this.ctx.strokeStyle = "#999";
  //   this.ctx.lineWidth = 1;
  //   this.ctx.beginPath();
  //   const h = 10; // length of head in pixels
  //   const a = Math.atan2(ey - sy, ex - sx);
  //   const a1 = Math.PI / 12;
  //   this.screen.moveTo(sx, sy);
  //   this.screen.lineTo(ex, ey);
  //   this.screen.lineTo(ex - h * Math.cos(a - a1), ey - h * Math.sin(a - a1));
  //   this.screen.moveTo(ex, ey);
  //   this.screen.lineTo(ex - h * Math.cos(a + a1), ey - h * Math.sin(a + a1));
  //   this.ctx.stroke();
  // }

  private arc(obj: IRailObject) {
    const { x, y, radius, a1, a2, type, meta } = obj;
    const color = this.getColor(type, meta && meta.selected);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.screen.arc(x, y, radius, a1, a2);
    this.ctx.stroke();

    const midx = x + radius * Math.cos((a1 + a2) / 2);
    const midy = y + radius * Math.sin((a1 + a2) / 2);
    obj.meta &&
      this.state.blocks &&
      this.label(midx, midy, obj.meta.block.toString());
  }

  private arcPath(obj: IRailObject, color?: string) {
    const { x, y, radius, a1, a2 } = obj;
    color = color || hex2rgba("#FFFFFF4C");
    this.ctx.strokeStyle = color;
    this.ctx.lineCap = "round";
    this.ctx.lineWidth = 12;
    this.ctx.beginPath();
    this.screen.arc(x, y, radius, a1, a2);
    this.ctx.stroke();
  }

  private label(x: number, y: number, what: string) {
    this.labelCache.push([x, y, what]);
  }

  private text(x: number, y: number, what: string) {
    this.ctx.font = "10px Arial";
    const w = this.ctx.measureText(what).width;
    const h = 10;
    const tx = sx(x) - w * 0.5;
    const ty = sy(y) + h * 0.5;
    const rectW = w + 10;
    const rectH = h + 10;
    const rectX = sx(x) - rectW * 0.5;
    const rectY = sy(y) - rectH * 0.5;

    this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    this.ctx.beginPath();
    // this.screen.circle(x, y, 10);
    this.screen.roundRect(rectX, rectY, rectW, rectH, 5);
    this.ctx.fill();

    this.ctx.fillStyle = "#fff";
    this.ctx.fillText(what, tx, ty);
  }

  private line(obj: IRailObject) {
    const { sx, sy, ex, ey, type, meta } = obj;
    const color = this.getColor(type, meta && meta.selected);
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.strokeStyle = color;
    this.screen.moveTo(sx, sy);
    this.screen.lineTo(ex, ey);
    this.ctx.stroke();

    const midx = (sx + ex) * 0.5;
    const midy = (sy + ey) * 0.5;
    obj.meta &&
      this.state.blocks &&
      this.label(midx, midy, obj.meta.block.toString());
  }

  private linePath(obj: IRailObject, color?: string) {
    const { sx, sy, ex, ey } = obj;
    color = color || hex2rgba("#FFFFFF4C");
    this.ctx.lineCap = "round";
    this.ctx.lineWidth = 12;
    this.ctx.beginPath();
    this.ctx.strokeStyle = color;
    this.screen.moveTo(sx, sy);
    this.screen.lineTo(ex, ey);
    this.ctx.stroke();
  }

  private object(obj: IRailObject) {
    this.ctx.save();
    obj.radius ? this.arc(obj) : this.line(obj);
    this.ctx.restore();
  }

  private objectPath(obj: IRailObject, color?: string) {
    this.ctx.save();
    obj.radius ? this.arcPath(obj, color) : this.linePath(obj, color);
    this.ctx.restore();
  }

  private pathLabel(path: IRailObject, what: string) {
    const x = 0.5 * (path.sx + path.ex);
    const y = 0.5 * (path.sy + path.ey);
    this.label(x, y, what);
  }

  private connections() {
    const c = this.model.connections;
    Object.values(c).forEach(v => {
      const { x, y, items } = v;
      const isSimple = items.length <= 2;

      let radius = isSimple ? 3 : 5;
      let color = isSimple ? "green" : "red";
      if (v === this.model.selectedConnection) {
        radius = 15;
        color = "rgba(0, 0, 0, 0.8)";

        // draw items - temp
        v.items.forEach(i => {
          const obj = this.model.get(i);
          this.objectPath(obj);
        });
      }

      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.screen.circle(x, y, radius);
      this.ctx.fill();
    });

    this.model.switches.forEach(v => {
      let path;
      path = this.model.get(v[0]);
      path && this.objectPath(path, hex2rgba("#0099004C"));
      path && this.pathLabel(path, "A1");
      path = this.model.get(v[1]);
      path && this.objectPath(path, hex2rgba("#FF00004C"));
      path && this.pathLabel(path, "A2");
      path = this.model.get(v[2]);
      path && this.objectPath(path, hex2rgba("#0099004C"));
      path && this.pathLabel(path, "B1");
      path = this.model.get(v[3]);
      path && this.objectPath(path, hex2rgba("#FF00004C"));
      path && this.pathLabel(path, "B2");
    });

    this.model.joins.forEach(v => {
      let path;
      path = this.model.get(v[0]);
      path && this.objectPath(path, hex2rgba("#9999994C"));
      path = this.model.get(v[1]);
      path && this.objectPath(path, hex2rgba("#9999994C"));
    });
  }

  private selectionFrame() {
    const { mouse } = this.state;
    if (!mouse.down) {
      // this.point(sx, sy, color);
      return;
    }
    const [sx, sy] = mouse.selection;
    const [ex, ey] = mouse.coords;
    this.ctx.strokeStyle = "#ccc";
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([3, 3]);
    this.ctx.strokeRect(sx, sy, ex - sx, ey - sy);
    this.ctx.setLineDash([]);
  }

  private helpline() {
    const hints = this.hints;
    if (!hints) {
      return;
    }

    let x = 0;
    let y = this.canvas.height - 20;
    let metrics;
    const normalFont = "14px monospace";
    const boldFont = "bold 14px monospace ";

    this.ctx.fillStyle = "#303030";
    this.ctx.fillRect(0, y, this.canvas.width, 20);

    // this.ctx
    hints.forEach((h: IHintLine) => {
      // tag
      this.ctx.font = boldFont;
      metrics = this.ctx.measureText(h.tag);
      this.ctx.fillStyle = "#444444";
      this.ctx.fillRect(x, y, metrics.width + 20, 20);
      this.ctx.fillStyle = "#ffaf00";
      x += 5;
      this.ctx.fillText(h.tag, x, y + 14);
      x += Math.floor(metrics.width + 10);

      // text
      metrics = this.ctx.measureText(h.text);
      if (h.active) {
        this.ctx.fillStyle = "#aaa";
        this.ctx.fillRect(x, y, metrics.width + 10, 20);
        this.ctx.fillStyle = "#000";
      } else if (h.selected) {
        this.ctx.fillStyle = "#835a00";
        this.ctx.fillRect(x, y, metrics.width + 10, 20);
        this.ctx.fillStyle = "#d5d5d5";
      } else {
        this.ctx.fillStyle = "#d5d5d5";
      }
      this.ctx.font = normalFont;
      x += 5;
      this.ctx.fillText(h.text, x, y + 14);
      x += Math.floor(metrics.width + 20);
    });
  }
}
