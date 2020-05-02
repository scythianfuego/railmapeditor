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
import POT from "./pot";
type PIXIAtlas = {
  [key: string]: PIXI.Texture;
};

const TAU = 2 * Math.PI;

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

  private gridCanvas: HTMLCanvasElement;
  private modelCanvas: HTMLCanvasElement;

  // pixi
  private atlas: PIXIAtlas;
  private pixiAppStage: PIXI.Container;
  private pixiGrid: PIXI.Container;
  private pixiCursor: PIXI.Graphics;
  private pixiSelectionFrame: PIXI.Graphics;

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
  private snapPoint: number[] = [0, 0];
  private layers: IKeyValue;

  private labelCache: Map<
    string,
    { x: number; y: number; text: string; sprite: PIXI.Text }
  > = new Map();

  private gameobjectview: GameObjectView;

  constructor(
    private model: Model,
    private app: PIXI.Application,
    resources: Partial<Record<string, PIXI.LoaderResource>>
  ) {
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
      // this.canvas.style.cursor = state.mouse.pan ? "grabbing" : "pointer";
      this.all();
    };

    storeInstance.subscribe(subscribeListener);

    // PIXI
    this.app = app;
    this.pixiAppStage = new PIXI.Container();
    this.app.stage.addChild(this.pixiAppStage);
    this.atlas = resources.atlas.textures;
    new POT(this.atlas); // make power-of-two textures

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
    this.grid();

    this.labelCache.forEach((v) => this.label(v.x, v.y, v.text));
    this.connections();
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
    obj.radius ? this.arc(obj, key) : this.line(obj, key);
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

      // this.ctx.fillStyle = color;
      // this.ctx.beginPath();
      // this.screen.circle(x, y, radius);
      // this.ctx.fill();
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
}
