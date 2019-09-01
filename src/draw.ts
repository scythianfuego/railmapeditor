import storeInstance, { copy } from "./store";
import ts from "./transform";
import { Tool } from "./interfaces/types";
import Model from "./model";
import IRail from "./interfaces/IRail";
import IHintLine from "./interfaces/IHintLine";
import IState from "./interfaces/IState";
import { Listener, Store } from "unistore";
import IGameObject from "./interfaces/IGameObject";
import IKeyValue from "./interfaces/IKeyValue";
import IHints from "./interfaces/IHints";

const TAU = 2 * Math.PI;
const hex2rgba = (hex: string) => {
  const [r, g, b, a] = hex.match(/\w\w/g).map(x => parseInt(x, 16));
  return `rgba(${r},${g},${b},${a ? a * 0.00392156862745098 : 1})`;
};

const colors = {
  background: "#000",
  gridBackground: "#553835"
};

const { sx, sy, wx, wy, scale, pixels } = ts;

export default class Draw {
  private ctx: CanvasRenderingContext2D;

  private atlas: HTMLImageElement;
  private textureData: any;

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
  private state: IState = null;
  private hints: IHints;
  private tool: Tool;
  private selectionMode: any;
  private cursorType: any;
  private mouse: any;
  private zoom: number;
  private panX: number;
  private panY: number;
  private snapPoint: number[];
  private layers: IKeyValue;

  private labelCache: [number, number, string][] = [];

  constructor(private canvas: HTMLCanvasElement, private model: Model) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.model = model;
    this.ctx.translate(0.5, 0.5);

    // moveable and zoomable parts of canvas
    //(state: K, action?: Action<K>) => void;
    const subscribeListener: Listener<IState> = (state: IState) => {
      copy(state, this, [
        "hints",
        "tool",
        "selectionMode",
        "zoom",
        "panX",
        "panY",
        "cursorType",
        "layers",
        "mouse",
        "snapPoint"
      ]);
      this.canvas.style.cursor = state.mouse.pan ? "grabbing" : "pointer";
    };

    storeInstance.subscribe(subscribeListener);

    const image = new Image();
    image.src = `assets/textures.png`;
    image.onload = () => (this.atlas = image);

    fetch("assets/textures.json")
      .then(response => response.json())
      .then(obj => {
        this.textureData = obj;
      });
  }

  private getColor(type: number, selected: boolean) {
    if (selected) {
      return "red";
    }
    if (!this.layers.colors) {
      return "#ccc";
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

    this.model.forEach((obj: IRail) => this.object(obj));
    this.model.gameobjects.forEach((obj: IGameObject) => this.gameObject(obj));
    this.cursor();
    this.labelCache.forEach(([x, y, what]) => this.text(x, y, what));
    this.connections();
    this.selectionFrame();
    this.helpline();
  }

  private cursor() {
    if (this.cursorType === 0) {
      this.tool && this.object(this.tool(this.snapPoint));
    }
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

    const yStep = Math.sqrt(3) * 0.25;
    const xStep = 0.5;

    this.ctx.translate(-0.5, -0.5);
    for (let i = 0; i < gridWidth * 2; i++) {
      for (let j = 0; j < gridHeight * 2; j++) {
        const r = j % 2 === 0 ? 0 : 0.25;
        const x = i * xStep + r;
        const y = j * yStep;

        this.ctx.fillStyle = "#999";
        this.ctx.fillRect(Math.floor(sx(x)) - 1, Math.floor(sy(y)) - 1, 1, 1);
      }
    }
    this.ctx.translate(0.5, 0.5);

    // const [mx, my] = this.mouse.coords;
    // this.ctx.fillStyle = "red";
    // let x = wx(mx);
    // let y = wy(my);
    // y = Math.round(y / yStep) * yStep;
    // const yIsOdd = Math.round(y / yStep) % 2;
    // x = Math.round(x / xStep) * xStep;
    // x += yIsOdd ? xStep * 0.5 : 0;

    const [x, y] = this.snapPoint;
    this.ctx.fillStyle = "red";
    this.ctx.beginPath();
    this.ctx.arc(sx(x), sy(y), 3, 0, 6.28);
    this.ctx.fill();
  }

  private gameObject(obj: IGameObject) {
    type Frame = { x: number; y: number; w: number; h: number };

    const { ctx } = this;
    let { x, y, texture, rotation, points, outline } = obj; // refactor object frame out

    if (obj.type === "signal") {
      texture = "signalred.png";
    }

    const draw = (frame: Frame, width: number, height: number, alpha = 1) => {
      if (frame) {
        ctx.globalAlpha = alpha;
        const { x, y, w, h } = frame;
        ctx.drawImage(this.atlas, x, y, w, h, 0, 0, width, height);
        ctx.globalAlpha = 1;
      }
    };

    const data = this.textureData.frames[texture] || null;
    const frame: Frame = data ? data.frame : null;

    const px = 50; // pixels per unit
    let width = 64;
    let height = 64;
    if (frame) {
      width = frame.w;
      height = frame.h;

      const ow = Number(obj.width) || 0;
      const oh = Number(obj.height) || 0;
      if (ow !== 0) {
        width = ow;
        height = frame && oh !== 0 ? oh : (width * frame.h) / frame.w;
      }
    }

    const selected = obj === this.model.selectedGameObject;
    ctx.strokeStyle = selected ? "#ff0000" : "#ccc";
    const cx = sx(x); // image center
    const cy = sy(y);
    const w = scale(width) / px;
    const h = scale(height) / px;

    // scale and rotate
    ctx.save();
    ctx.translate(cx, cy);
    rotation && ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-w * 0.5, -h * 0.5);

    // texture
    this.layers.textures &&
      frame &&
      !points &&
      draw(frame, w, h, obj.alpha || 1);

    // object box
    if (this.layers.objects) {
      if (!points) {
        ctx.beginPath();
        !selected && ctx.setLineDash([1, 3]);
        ctx.strokeRect(0, 0, w, h);
        // ctx.moveTo(0, 0);
        // ctx.lineTo(w, h);
        // ctx.moveTo(0, h);
        // ctx.lineTo(w, 0);
        ctx.stroke();
        !selected && ctx.setLineDash([]);
      } else {
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.5, scale(1.28 * 0.5), 0, TAU);
        ctx.stroke();
      }
    }
    ctx.restore();

    if (this.layers.objects && texture) {
      const desc = `${texture.replace(".png", "")}`;
      ctx.font = "12px Arial";
      ctx.fillStyle = "#ffffff";
      this.screen.fillText(desc, x, y - pixels(12));
      ctx.lineWidth = 1;
    }

    if (obj.points) {
      const pdata = this.model.gameobjectpoints.get(obj.points);
      const isRope = obj.type === "rope";
      const isPoly = obj.type === "polygon";
      const doPoly = isPoly && this.layers.polygons;
      const doRope = isRope && this.layers.ropes;
      const doBoth = doPoly || doRope;

      const drawPoints = () => {
        for (let i = 0; i < pdata.length; i++) {
          this.point(pdata[i].x, pdata[i].y, selected ? "red" : "cyan");
        }
      };

      const fillPolygon = () => {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.beginPath();
        this.screen.moveTo(pdata[0].x, pdata[0].y);
        for (let i = 1; i < pdata.length; i++) {
          this.screen.lineTo(pdata[i].x, pdata[i].y);
        }
        ctx.fill();
      };

      const drawRope = () => {
        ctx.strokeStyle = selected ? "magenta" : "black";
        ctx.beginPath();
        this.screen.moveTo(pdata[0].x, pdata[0].y);
        for (let i = 1; i < pdata.length; i++) {
          this.screen.lineTo(pdata[i].x, pdata[i].y);
        }
        ctx.stroke();
      };

      doPoly && fillPolygon();
      doRope && drawRope();
      doBoth && drawPoints();
    }
  }

  private point(x: number, y: number, style?: string, size?: number) {
    this.ctx.lineWidth = 1;
    this.ctx.fillStyle = style ? style : "cyan";
    this.ctx.beginPath();
    this.ctx.arc(sx(x), sy(y), size ? size : 3, 0, TAU);
    this.ctx.fill();
  }

  private arc(obj: IRail) {
    const { x, y, radius, a1, a2, type, meta } = obj;
    const color = this.getColor(type, meta && meta.selected);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = this.layers.thick ? scale(0.5) : 2;
    this.ctx.beginPath();
    this.screen.arc(x, y, radius, a1, a2);
    this.ctx.stroke();

    const midx = x + radius * Math.cos((a1 + a2) / 2);
    const midy = y + radius * Math.sin((a1 + a2) / 2);
    obj.meta &&
      this.layers.blocks &&
      this.label(midx, midy, obj.meta.block.toString());

    obj.meta &&
      this.layers.ids &&
      this.label(midx, midy, obj.meta.id.toString());
  }

  private arcPath(obj: IRail, color?: string) {
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

  private line(obj: IRail) {
    const { sx, sy, ex, ey, type, meta } = obj;
    const color = this.getColor(type, meta && meta.selected);
    this.ctx.lineWidth = this.layers.thick ? scale(0.5) : 2;
    this.ctx.beginPath();
    this.ctx.strokeStyle = color;
    this.screen.moveTo(sx, sy);
    this.screen.lineTo(ex, ey);
    this.ctx.stroke();

    const midx = (sx + ex) * 0.5;
    const midy = (sy + ey) * 0.5;
    obj.meta &&
      this.layers.blocks &&
      this.label(midx, midy, obj.meta.block.toString());

    obj.meta &&
      this.layers.ids &&
      this.label(midx, midy, obj.meta.id.toString());
  }

  private linePath(obj: IRail, color?: string) {
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

  private object(obj: IRail) {
    this.ctx.save();
    obj.radius ? this.arc(obj) : this.line(obj);
    this.ctx.restore();
  }

  private objectPath(obj: IRail, color?: string) {
    this.ctx.save();
    obj.radius ? this.arcPath(obj, color) : this.linePath(obj, color);
    this.ctx.restore();
  }

  private pathLabel(path: IRail, what: string) {
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
    if (!this.mouse.down) {
      return;
    }
    const [sx, sy] = this.mouse.selection;
    const [ex, ey] = this.mouse.coords;
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
