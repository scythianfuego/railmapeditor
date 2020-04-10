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

import * as PIXI from "pixi.js";
import TileMesh from "./PIXI/tilemesh";
type PIXIAtlas = {
  [key: string]: PIXI.Texture;
};

const TAU = 2 * Math.PI;
const hex2rgba = (hex: string) => {
  const [r, g, b, a] = hex.match(/\w\w/g).map(x => parseInt(x, 16));
  return `rgba(${r},${g},${b},${a ? a * 0.00392156862745098 : 1})`;
};

const colors = {
  background: "#000",
  gridBackground: "#553835"
};

const { sx, sy, scale, pixels } = ts;

const sprites: Map<any, any> = new Map();
const RAIL = "rails.png";

export default class Draw {
  private ctx: CanvasRenderingContext2D;

  private imgAtlas: HTMLImageElement;
  private textureData: any;

  private transformHash: number = 0;
  private gridCanvas: HTMLCanvasElement;
  private modelCanvas: HTMLCanvasElement;

  // pixi
  private atlas: PIXIAtlas;
  private pixiAppStage: PIXI.Container;
  private pixiGrid: PIXI.Graphics;
  private pixiCursor: PIXI.Graphics;
  private pixiSelectionFrame: PIXI.Graphics;

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
  private hints: IHints = [];
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

  constructor(
    private canvas: HTMLCanvasElement,
    private model: Model,
    private app: PIXI.Application,
    resources: Partial<Record<string, PIXI.LoaderResource>>
  ) {
    this.canvas = canvas;
    this.gridCanvas = document.createElement("canvas");
    this.gridCanvas.width = canvas.width;
    this.gridCanvas.height = canvas.height;

    this.modelCanvas = document.createElement("canvas");
    this.modelCanvas.width = canvas.width;
    this.modelCanvas.height = canvas.height;
    this.ctx = this.modelCanvas.getContext("2d");

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
    image.onload = () => (this.imgAtlas = image);

    fetch("assets/textures.json")
      .then(response => response.json())
      .then(obj => {
        this.textureData = obj;
      });

    // PIXI
    this.app = app;
    this.pixiAppStage = new PIXI.Container();
    this.app.stage.addChild(this.pixiAppStage);
    this.atlas = resources.atlas.textures;
    this.makePOT();
    this.makeHPOT();
  }

  private getTexture(name: string): PIXI.Texture {
    return this.atlas[name] || PIXI.Texture.WHITE;
  }

  private getColor(type: number, selected: boolean) {
    if (selected) {
      return "red";
    } else if (!this.layers.colors) {
      return "#ccc";
    }

    const colors = [
      { min: 0x20, max: 0x29, color: "yellow" },
      { min: 0x30, max: 0x39, color: "#00ff2a" },
      { min: 0x40, max: 0x49, color: "#00baff" }
    ];

    return colors.reduce(
      (accu: string, { min, max, color }) =>
        min <= type && type <= max ? color : accu,
      "#ffa834"
    );
  }

  // deprecated
  private clear(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = colors.background;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  public all() {
    this.labelCache = [];
    this.model.dirty = true;

    this.ctx = this.modelCanvas.getContext("2d");
    const hash = ts.hash();
    if (this.transformHash !== hash) {
      this.grid();
    }
    if (this.transformHash !== hash || this.model.dirty) {
      this.clear(this.ctx);
      this.model.forEach((obj: IRail) => this.object(obj));
      this.model.gameobjects.forEach((obj: IGameObject, key: string) =>
        this.gameObject(obj, key)
      );
      this.labelCache.forEach(([x, y, what]) => this.text(x, y, what));
      this.connections();
      this.model.dirty = false;
      this.transformHash = ts.hash();
    }

    this.ctx = this.canvas.getContext("2d");
    this.ctx.drawImage(this.gridCanvas, 0, 0);
    this.ctx.drawImage(this.modelCanvas, 0, 0);

    this.cursor();
    this.selectionFrame();
    this.helpline();
  }

  private cursor() {
    if (this.cursorType === 0) {
      this.tool && this.object(this.tool(this.snapPoint));
    }

    const [x, y] = this.snapPoint;
    this.ctx.fillStyle = "red";
    this.ctx.beginPath();
    this.ctx.arc(sx(x), sy(y), 3, 0, 6.28);
    this.ctx.fill();

    // pixi
    if (!this.pixiCursor) {
      this.pixiCursor = new PIXI.Graphics();
      this.pixiCursor.beginFill(0xff0000, 1);
      this.pixiCursor.drawCircle(sx(0), sy(0), 3);
      this.pixiCursor.endFill();
      this.pixiAppStage.addChild(this.pixiCursor);
    } else {
      this.pixiCursor.position.set(sx(x), sy(y));
    }
  }

  private grid() {
    // todo: renew only when transform changed
    const { gridWidth, gridHeight } = ts;

    // pixi
    const generatePixiGrid = () => {
      this.pixiGrid && this.pixiGrid.destroy();
      const grid = (this.pixiGrid = new PIXI.Graphics());

      // draw bg
      grid.lineStyle(0); // draw a circle, set the lineStyle to zero so the circle doesn't have an outline
      grid.beginFill(0x553835, 1);
      grid.drawRect(0, 0, gridWidth * 50, gridHeight * 50);
      grid.endFill();

      // draw dot grid
      const yStep = Math.sqrt(3) * 0.25;
      const xStep = 0.5;

      grid.beginFill(0x999999, 1);
      for (let i = 0; i < gridWidth * 2; i++) {
        for (let j = 0; j < gridHeight * 2; j++) {
          const r = j % 2 === 0 ? 0 : 0.25;
          const x = i * xStep + r;
          const y = j * yStep;

          grid.drawRect(Math.floor(x * 50) - 1, Math.floor(y * 50) - 1, 1, 1);
        }
      }
      grid.endFill();
      this.pixiAppStage.addChildAt(grid, 0);
    };

    if (
      !this.pixiGrid ||
      Math.abs(this.pixiAppStage.scale.x - ts.zoom / 50) < 0.01
    ) {
      generatePixiGrid();
    }

    this.pixiAppStage.position.set(ts.panX, ts.panY);
    this.pixiAppStage.scale.set(ts.zoom / 50);
  }

  private gameObject(obj: IGameObject, key: string) {
    type Frame = { x: number; y: number; w: number; h: number };

    const { ctx } = this;
    let { x, y, texture, rotation, points, outline } = obj; // refactor object frame out

    if (obj.type === "signal") {
      texture = "signalred.png";
    }

    // pixi
    if (!sprites.has(obj)) {
      let sprite: any = null;

      if (obj.points) {
        sprite = new PIXI.Container();
        const pdata = this.model.gameobjectpoints.get(obj.points);
        const isRope = obj.type === "rope";
        const isPoly = obj.type === "polygon";
        const doPoly = isPoly; // && this.layers.polygons;
        const doRope = isRope || (isPoly && obj.outline); // && this.layers.ropes;
        const doBoth = doPoly || doRope;

        const drawPoints = () => {
          // for (let i = 0; i < pdata.length; i++) {
          //   this.point(pdata[i].x, pdata[i].y, selected ? "red" : "cyan");
          // }
        };

        const fillPolygon = () => {
          const points = pdata.map(p => new PIXI.Point(p.x * 50, p.y * 50));
          const texture = this.getTexture(obj.texture);
          const mesh = new TileMesh(texture, points);
          sprite.addChild(mesh);
        };

        const drawRope = () => {
          const points = pdata.map(p => new PIXI.Point(p.x * 50, p.y * 50));
          const texture = this.getTexture(isPoly ? obj.outline : obj.texture);
          const rope = new PIXI.SimpleRope(texture, points, 1);
          sprite.addChild(rope);
        };

        doPoly && fillPolygon();
        doRope && drawRope();
        doBoth && drawPoints();
      } else {
        sprite = new PIXI.Sprite(this.getTexture(texture));
        sprite.position.set(x * 50, y * 50);
        sprite.anchor.set(0.5);
        sprite.angle = rotation;
        sprites.set(obj, sprite);
      }
      sprite.alpha = obj.alpha;
      const blends: any = {
        normal: PIXI.BLEND_MODES.NORMAL,
        add: PIXI.BLEND_MODES.ADD,
        multiply: PIXI.BLEND_MODES.MULTIPLY,
        screen: PIXI.BLEND_MODES.SCREEN
      };
      sprite.blendMode = blends[obj.blend] || 0;
      this.pixiAppStage.addChild(sprite);
    }

    const draw = (frame: Frame, width: number, height: number, alpha = 1) => {
      if (frame) {
        ctx.globalAlpha = alpha;
        const { x, y, w, h } = frame;
        ctx.drawImage(this.imgAtlas, x, y, w, h, 0, 0, width, height);
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

    const selected = key === this.model.selectedGameObject;
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
    // pixi
    if (!sprites.has(obj)) {
      const TAU = 2 * Math.PI;
      const normalize = (angle: number) => ((angle % TAU) + TAU) % TAU;
      const an1 = normalize(a1);
      const a = normalize(a2);
      // angle delta MUST be positive to simplify drawing
      const an2 = a < a1 ? a + 2 * Math.PI : a;

      const steps = 10;
      const delta = 1 / (steps - 1);
      const points = [...Array(steps).keys()].map(i => {
        const angle = an1 + (an2 - an1) * delta * i;
        return new PIXI.Point(
          x * 50 + radius * 50 * Math.cos(angle),
          y * 50 + radius * 50 * Math.sin(angle)
        );
      });
      // const { sx, sy, ex, ey } = obj;
      // const points = [
      //   new PIXI.Point(sx * 50, sy * 50),
      //   new PIXI.Point(ex * 50, ey * 50)
      // ];
      const texture = this.getTexture(RAIL);
      texture.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;
      const sprite = new PIXI.SimpleRope(texture, points, 0.5);
      sprite.position.set(0, 0);
      sprites.set(obj, sprite);
      this.pixiAppStage.addChild(sprite);
    }

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

    // pixi
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

    // pixi
    if (!sprites.has(obj)) {
      const points = [
        new PIXI.Point(sx * 50, sy * 50),
        new PIXI.Point(ex * 50, ey * 50)
      ];
      const sprite = new PIXI.SimpleRope(this.getTexture(RAIL), points, 0.5);
      sprite.position.set(0, 0);
      sprites.set(obj, sprite);
      this.pixiAppStage.addChild(sprite);
    } else {
      const sprite = sprites.get(obj);
      const color = this.getColor(type, meta && meta.selected);
      sprite.tint = color;

      const midx = (sx + ex) * 0.5;
      const midy = (sy + ey) * 0.5;
    }

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
        v.items.forEach((i: any) => {
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
      this.pixiSelectionFrame && this.pixiSelectionFrame.destroy();
      this.pixiSelectionFrame = null;
      return;
    }
    const [sx, sy] = this.mouse.selection;
    const [ex, ey] = this.mouse.coords;

    if (!this.pixiSelectionFrame) {
      this.pixiSelectionFrame = new PIXI.Graphics();
      this.pixiAppStage.addChild(this.pixiSelectionFrame);
    }

    // TODO: pixi.sprite
    this.pixiSelectionFrame.clear();
    this.pixiSelectionFrame.lineStyle(1, 0xcccccc, 1); // TODO: dashed line
    this.pixiSelectionFrame.beginFill(0x0, 0.25);
    this.pixiSelectionFrame.drawRect(sx, sy, ex - sx, ey - sy);
    this.pixiSelectionFrame.endFill();
  }

  // TODO: move to component
  private helpline() {
    const text = this.hints.reduce(
      (text, h: IHintLine) => text + h.tag + "&nbsp;" + h.text + "&ensp;",
      ""
    );
    const hintLine = document.getElementById("hintline");
    if (hintLine.innerHTML != text) hintLine.innerHTML = text;
  }

  // copypaste from rail. make pixi plugin?
  private makePOT() {
    const pot = Object.keys(this.atlas).filter(i => i.endsWith("_t.png"));
    pot.forEach(name => {
      const tex = this.atlas[name];
      const res = tex.baseTexture.resource as PIXI.resources.ImageResource;
      const image: HTMLImageElement = res.source as HTMLImageElement;
      const { x, y, width, height } = tex.frame;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas
        .getContext("2d")
        .drawImage(image, x, y, width, height, 0, 0, width, height);

      name = name.replace("_t.png", "").replace("_h.png", "") + ".png";
      const baseTexture = new PIXI.BaseTexture(
        new PIXI.resources.CanvasResource(canvas)
      );
      this.atlas[name] = new PIXI.Texture(baseTexture);
    });
    console.log(`POT tiled texture count: ${pot.length}`);
  }

  private makeHPOT() {
    const pot = Object.keys(this.atlas).filter(i => i.endsWith("_h.png"));
    const nextPowerOfTwo = (v: number) => {
      let p = 32;
      while (v > p) p *= 2;
      return p;
    };

    // find dimensions
    let canvasWidth = 0;
    let canvasHeight = 0;
    pot.forEach(name => {
      const tex = this.atlas[name];
      tex.width > canvasWidth && (canvasWidth = tex.width);
      canvasHeight += tex.height;
    });
    canvasHeight = nextPowerOfTwo(canvasHeight);

    // make canvas and a base texture
    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const context = canvas.getContext("2d");
    const baseTexture = new PIXI.BaseTexture(
      new PIXI.resources.CanvasResource(canvas)
    );

    // draw textures and put them to atlas
    let offsetY = 0;
    pot.forEach(name => {
      const tex = this.atlas[name];
      const res = tex.baseTexture.resource as PIXI.resources.ImageResource;
      const image: HTMLImageElement = res.source as HTMLImageElement;

      let offsetX = 0;
      const { x, y, width, height } = tex.frame;
      while (offsetX + width <= canvasWidth) {
        context.drawImage(
          image,
          x,
          y,
          width,
          height,
          offsetX,
          offsetY,
          width,
          height
        );
        offsetX += width;
      }

      // create texture frames
      name = name.replace("_h.png", "") + ".png";
      const frame = new PIXI.Rectangle(0, offsetY, canvasWidth, height);
      this.atlas[name] = new PIXI.Texture(baseTexture, frame);

      offsetY += height;
    });

    console.log(`POT horizontal texture size: ${canvasWidth}x${canvasHeight}`);
  }
}
