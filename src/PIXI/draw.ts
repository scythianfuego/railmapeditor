import storeInstance, { copy } from "../store";
import ts from "../transform";
import { Tool } from "../interfaces/types";
import Model from "../model";
import IRail from "../interfaces/IRail";
import IHintLine from "../interfaces/IHintLine";
import IState from "../interfaces/IState";
import { Listener, Store } from "unistore";
import IGameObject from "../interfaces/IGameObject";
import IKeyValue from "../interfaces/IKeyValue";
import IHints from "../interfaces/IHints";
import GameObjectView from "./gameobjectview";

import { autorun, reaction, observe } from "mobx";

import * as PIXI from "pixi.js";
import TileMesh from "./tilemesh";
type PIXIAtlas = {
  [key: string]: PIXI.Texture;
};

const TAU = 2 * Math.PI;
const hex2rgba = (hex: string) => {
  const [r, g, b, a] = hex.match(/\w\w/g).map((x) => parseInt(x, 16));
  return `rgba(${r},${g},${b},${a ? a * 0.00392156862745098 : 1})`;
};

const colors = {
  background: "#000",
  gridBackground: "#553835",
};

const blends: {
  [key: string]: PIXI.BLEND_MODES;
} = {
  normal: PIXI.BLEND_MODES.NORMAL,
  add: PIXI.BLEND_MODES.ADD,
  multiply: PIXI.BLEND_MODES.MULTIPLY,
  screen: PIXI.BLEND_MODES.SCREEN,
};

const { sx, sy, scale, pixels } = ts;

const sprites: Map<string, any> = new Map();
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
  private pixiGrid: PIXI.Container;
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
    },
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

  private labelCache: Map<
    string,
    { x: number; y: number; text: string; sprite: PIXI.Text }
  > = new Map();

  private gameobjectview: GameObjectView;

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
        "snapPoint",
      ]);
      this.canvas.style.cursor = state.mouse.pan ? "grabbing" : "pointer";
    };

    storeInstance.subscribe(subscribeListener);

    const image = new Image();
    image.src = `assets/textures.png`;
    image.onload = () => (this.imgAtlas = image);

    fetch("assets/textures.json")
      .then((response) => response.json())
      .then((obj) => {
        this.textureData = obj;
      });

    // PIXI
    this.app = app;
    this.pixiAppStage = new PIXI.Container();
    this.app.stage.addChild(this.pixiAppStage);
    this.atlas = resources.atlas.textures;
    this.makePOT();
    this.makeHPOT();

    autorun(() => {
      this.model.rails.forEach((obj: IRail, key: string) =>
        this.object(obj, key)
      );
    });

    this.gameobjectview = new GameObjectView(
      model,
      this.pixiAppStage,
      resources
    );
  }

  private getTexture(name: string): PIXI.Texture {
    return this.atlas[name] || PIXI.Texture.WHITE;
  }

  private getColor(type: number, selected: boolean): number {
    if (selected) {
      return 0xff0000;
    } else if (!this.layers.colors) {
      return 0xcccccc;
    }

    const colors = [
      { min: 0x20, max: 0x29, color: 0xffff00 },
      { min: 0x30, max: 0x39, color: 0x00ff2a },
      { min: 0x40, max: 0x49, color: 0x00baff },
    ];

    return colors.reduce(
      (accu, { min, max, color }) =>
        min <= type && type <= max ? color : accu,
      0xffa834
    );
  }

  public all() {
    this.model.dirty = true;

    this.ctx = this.modelCanvas.getContext("2d");
    this.grid();

    this.labelCache.forEach((v) => this.label(v.x, v.y, v.text));
    this.connections();

    // TODO: remove variables
    // this.model.dirty = false;
    // this.transformHash = ts.hash();

    this.cursor();
    this.selectionFrame();
    this.helpline();
  }

  private cursor() {
    const cursorSprite = sprites.get("@Tool");
    if (this.cursorType === 0) {
      cursorSprite && (cursorSprite.visible = true);
      cursorSprite && cursorSprite.parent.addChild(cursorSprite); // bring to front
      this.tool && this.object(this.tool(this.snapPoint), "@Tool");
    } else {
      cursorSprite && (cursorSprite.visible = false); //TODO: doesnt work
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
      this.pixiCursor.drawCircle(0, 0, 3);
      this.pixiCursor.endFill();
      this.pixiAppStage.addChild(this.pixiCursor);
    } else {
      this.pixiCursor.position.set(x * 50, y * 50);
    }
  }

  private grid() {
    // todo: renew only when transform changed
    const { gridWidth, gridHeight } = ts;

    // pixi
    const generatePixiGrid = () => {
      this.pixiGrid && this.pixiGrid.destroy();
      this.pixiGrid = new PIXI.Container();
      const bg = new PIXI.TilingSprite(
        this.getTexture("grass.png"),
        gridWidth * 50,
        gridHeight * 50
      );
      bg.tint = 0x999999;
      const dots = new PIXI.Graphics();

      // draw dot grid
      const yStep = Math.sqrt(3) * 0.25;
      const xStep = 0.5;

      dots.beginFill(0xffffff, 1);
      for (let i = 0; i < gridWidth * 2; i++) {
        for (let j = 0; j < gridHeight * 2; j++) {
          const r = j % 2 === 0 ? 0 : 0.25;
          const x = i * xStep + r;
          const y = j * yStep;

          dots.drawRect(Math.floor(x * 50) - 1, Math.floor(y * 50) - 1, 1, 1);
        }
      }
      dots.endFill();

      this.pixiGrid.addChild(bg);
      this.pixiGrid.addChild(dots);
      this.pixiAppStage.addChildAt(this.pixiGrid, 0);
    };

    if (!this.pixiGrid) {
      generatePixiGrid();
    }

    this.pixiAppStage.position.set(ts.panX, ts.panY);
    this.pixiAppStage.scale.set(ts.zoom / 50);
  }

  private updateGameObject(obj: IGameObject, key: string) {
    let { x, y, texture, rotation, points, outline, type } = obj; // refactor object frame out
    const selected = key === this.model.selectedGameObject;
    const sprite = sprites.get(key);
    sprite.position.set(x * 50, y * 50);
    sprite.alpha = obj.alpha ? obj.alpha : 1;
    sprite.blendMode = blends[obj.blend] || 0;
    sprite.angle = rotation || 0;
    if (selected) {
      // sprite.tint
      // strokeStyle = selected ? "#ff0000" : "#ccc";
    }

    const desc = `${texture.replace(".png", "")}`;
    // text at x, y - pixels(12))
  }

  private gameObject(obj: IGameObject, key: string) {
    type Frame = { x: number; y: number; w: number; h: number };

    let { x, y, rotation, alpha, blend } = obj; // small change
    let { texture, points, outline, type } = obj; // rebuild
    if (type === "signal") {
      texture = "signalred.png";
    }

    // pixi

    // if type changed destroy
    if (!sprites.has(key)) {
      let container: any = new PIXI.Container();

      if (points) {
        container = new PIXI.Container();
        const pdata = this.model.gameobjectpoints.get(points);
        const isRope = type === "rope";
        const isPoly = type === "polygon";
        const doPoly = isPoly; // && this.layers.polygons;
        const doRope = isRope || (isPoly && outline); // && this.layers.ropes;
        const doBoth = doPoly || doRope;

        const drawPoints = () => {
          // for (let i = 0; i < pdata.length; i++) {
          //   this.point(pdata[i].x, pdata[i].y, selected ? "red" : "cyan");
          // }
        };

        const fillPolygon = () => {
          const points = pdata.map((p) => new PIXI.Point(p.x * 50, p.y * 50));
          const fillTexture = this.getTexture(texture);
          const mesh = new TileMesh(fillTexture, points);
          container.addChild(mesh);
        };

        const drawRope = () => {
          const points = pdata.map((p) => new PIXI.Point(p.x * 50, p.y * 50));
          const ropeTexture = this.getTexture(isPoly ? outline : texture);
          const rope = new PIXI.SimpleRope(ropeTexture, points, 1);
          container.addChild(rope);
        };

        doPoly && fillPolygon();
        doRope && drawRope();
        doBoth && drawPoints();
      } else {
        const sprite = new PIXI.Sprite(this.getTexture(texture));
        sprite.anchor.set(0.5);
        sprite.angle = rotation;
        container.position.set(x * 50, y * 50);
        container.addChild(sprite);
        sprites.set(key, container);
      }
      container.alpha = alpha ? alpha : 1;
      container.blendMode = blends[blend] || 0;
      this.pixiAppStage.addChild(container);

      if (true || this.layers.objects) {
        // fix = observe

        const px = 50; // pixels per unit
        let width = 64;
        let height = 64;
        if (obj.frame) {
          width = obj.frame.w;
          height = obj.frame.h;

          const ow = Number(obj.width) || 0;
          const oh = Number(obj.height) || 0;
          if (ow !== 0) {
            width = ow;
            height =
              obj.frame && oh !== 0 ? oh : (width * obj.frame.h) / obj.frame.w;
          }
        }
        const w = scale(width) / px;
        const h = scale(height) / px;

        const border = new PIXI.Graphics();
        border.beginFill(0xff0000, 1);
        if (!points) {
          border.drawRect(0, 0, w, h);
        } else {
          border.drawCircle(w / 2, h / 2, 1.28 * 50);
        }
        border.endFill();
        container.addChild(border);
      }

      this.pixiAppStage.addChild(container);
    } else {
      // const sprite = sprites.get(key);
      // sprite.position.set(x * 50, y * 50);
      // sprite.alpha = obj.alpha;
      // sprite.blendMode = blends[obj.blend] || 0;
      // sprite.angle = rotation;
    }
  }

  private point(x: number, y: number, style?: string, size?: number) {
    this.ctx.lineWidth = 1;
    this.ctx.fillStyle = style ? style : "cyan";
    this.ctx.beginPath();
    this.ctx.arc(sx(x), sy(y), size ? size : 3, 0, TAU);
    this.ctx.fill();
  }

  private arc(obj: IRail, key: string) {
    // pixi
    const { x, y, radius, a1, a2, type, meta } = obj;

    const calcPoints = () => {
      const TAU = 2 * Math.PI;
      const normalize = (angle: number) => ((angle % TAU) + TAU) % TAU;
      const an1 = normalize(a1);
      const a = normalize(a2);
      // angle delta MUST be positive to simplify drawing
      const an2 = a < a1 ? a + 2 * Math.PI : a;

      const steps = 10;
      const delta = 1 / (steps - 1);
      const points = [...Array(steps).keys()].map((i) => {
        const angle = an1 + (an2 - an1) * delta * i;
        return new PIXI.Point(
          x * 50 + radius * 50 * Math.cos(angle),
          y * 50 + radius * 50 * Math.sin(angle)
        );
      });
      return points;
    };

    if (!sprites.has(key)) {
      const points = calcPoints();
      const texture = this.getTexture(RAIL);
      texture.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;
      const sprite = new PIXI.SimpleRope(texture, points, 0.5);
      sprite.position.set(0, 0);
      sprite.blendMode = PIXI.BLEND_MODES.NORMAL;
      const color = this.getColor(type, meta && meta.selected);
      sprite.tint = color;
      sprites.set(key, sprite);
      this.pixiAppStage.addChild(sprite);
    } else {
      const sprite = sprites.get(key);
      const color = this.getColor(type, meta && meta.selected);
      sprite.points = calcPoints();
      sprite.tint = color;
    }

    const midx = x * 50 + radius * 50 * Math.cos((a1 + a2) / 2);
    const midy = y * 50 + radius * 50 * Math.sin((a1 + a2) / 2);
    obj.meta &&
      this.layers.blocks &&
      this.label(midx, midy, obj.meta.block.toString());

    obj.meta &&
      this.layers.ids &&
      this.label(midx, midy, obj.meta.id.toString());
  }

  private label(x: number, y: number, text: string) {
    // todo: delete label
    const key = `${(x * 50) | 0} - ${(y * 50) | 0}`;
    if (!this.labelCache.has(key)) {
      const sprite = new PIXI.Text("This is a PixiJS text", {
        fontFamily: "Arial",
        fontSize: 10,
        fill: 0xffffff,
        align: "center",
      });
      sprite.x = x * 50;
      sprite.y = y * 50;
      this.labelCache.set(key, { x, y, text, sprite });
    } else {
      const sprite = this.labelCache.get(key).sprite;
      sprite.text = text;
    }
  }

  private line(obj: IRail, key: string) {
    const { sx, sy, ex, ey, type, meta } = obj;

    const calcPoints = () => {
      return [
        new PIXI.Point(sx * 50, sy * 50),
        new PIXI.Point(ex * 50, ey * 50),
      ];
    };
    // pixi
    if (!sprites.has(key)) {
      const points = calcPoints();
      const sprite = new PIXI.SimpleRope(this.getTexture(RAIL), points, 0.5);
      sprite.position.set(0, 0);
      sprites.set(key, sprite);
      this.pixiAppStage.addChild(sprite);
    } else {
      const sprite = sprites.get(key);
      sprite.points = calcPoints();
      const color = this.getColor(type, meta && meta.selected);
      sprite.tint = color;

      const midx = (sx + ex) * 0.5;
      const midy = (sy + ey) * 0.5;
      obj.meta &&
        this.layers.blocks &&
        this.label(midx, midy, obj.meta.block.toString());

      obj.meta &&
        this.layers.ids &&
        this.label(midx, midy, obj.meta.id.toString());
    }
  }

  private object(obj: IRail, key: string) {
    this.ctx.save();
    obj.radius ? this.arc(obj, key) : this.line(obj, key);
    this.ctx.restore();
  }

  private pathLabel(path: IRail, what: string) {
    const x = 0.5 * (path.sx + path.ex);
    const y = 0.5 * (path.sy + path.ey);
    this.label(x, y, what);
  }

  private connections() {
    const c = this.model.connections;
    Object.values(c).forEach((v) => {
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
          const sprite = sprites.get(obj);
          sprite && (sprite.tint = 0xff0000);
          // this.objectPath(obj);
        });
      }

      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.screen.circle(x, y, radius);
      this.ctx.fill();
    });

    this.model.switches.forEach((v) => {
      let path, sprite;
      path = this.model.get(v[0]);
      sprite = sprites.get(path);
      sprite && (sprite.tint = 0x00ff00);
      // path && this.objectPath(path, hex2rgba("#0099004C"));
      path && this.pathLabel(this.model.rails.get(path), "A1");
      path = this.model.get(v[1]);
      sprite = sprites.get(path);
      sprite && (sprite.tint = 0x00ff00);
      // path && this.objectPath(path, hex2rgba("#FF00004C"));
      path && this.pathLabel(this.model.rails.get(path), "A2");
      path = this.model.get(v[2]);
      sprite = sprites.get(path);
      sprite && (sprite.tint = 0x00ff00);
      // path && this.objectPath(path, hex2rgba("#0099004C"));
      path && this.pathLabel(this.model.rails.get(path), "B1");
      path = this.model.get(v[3]);
      sprite = sprites.get(path);
      sprite && (sprite.tint = 0x00ff00);
      // path && this.objectPath(path, hex2rgba("#FF00004C"));
      path && this.pathLabel(this.model.rails.get(path), "B2");
    });

    this.model.joins.forEach((v) => {
      let path, sprite;
      path = this.model.get(v[0]);
      // path && this.objectPath(path, hex2rgba("#9999994C"));
      sprite = sprites.get(path);
      sprite && (sprite.tint = 0x9999994c);
      path = this.model.get(v[1]);
      // path && this.objectPath(path, hex2rgba("#9999994C"));
      sprite = sprites.get(path);
      sprite && (sprite.tint = 0x9999994c);
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
    // sx no panning??
    this.pixiSelectionFrame.drawRect(
      sx - this.panX,
      sy - this.panY,
      ex - sx,
      ey - sy
    );
    this.pixiSelectionFrame.endFill();
  }

  // TODO: move to component
  private helpline() {
    const text = this.hints
      .reduce((text, h: IHintLine) => text + h.tag + " " + h.text + " ", "")
      .trim();
    const hintLine = document.getElementById("hintline");
    if (hintLine.innerText != text) hintLine.innerText = text;
  }

  // copypaste from rail. make pixi plugin?
  private makePOT() {
    const pot = Object.keys(this.atlas).filter((i) => i.endsWith("_t.png"));
    pot.forEach((name) => {
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
    const pot = Object.keys(this.atlas).filter((i) => i.endsWith("_h.png"));
    const nextPowerOfTwo = (v: number) => {
      let p = 32;
      while (v > p) p *= 2;
      return p;
    };

    // find dimensions
    let canvasWidth = 0;
    let canvasHeight = 0;
    pot.forEach((name) => {
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
    pot.forEach((name) => {
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
