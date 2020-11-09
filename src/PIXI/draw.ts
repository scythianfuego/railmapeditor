import { store } from "./../store";
import ts from "../transform";
import { Tool } from "../interfaces/types";
import Model from "../model";
import IState from "../interfaces/IState";
import IKeyValue from "../interfaces/IKeyValue";
import IHints from "../interfaces/IHints";
import GameObjectView from "./gameobjectview";
import RailView from "./railview";

import { autorun, reaction } from "mobx";

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

export default class Draw {
  private ctx: CanvasRenderingContext2D;

  private gridCanvas: HTMLCanvasElement;
  private modelCanvas: HTMLCanvasElement;

  // pixi
  private atlas: PIXIAtlas;
  private pixiAppStage: PIXI.Container;
  private pixiGrid: PIXI.Container;
  private pixiGridBg: PIXI.TilingSprite;
  private pixiGridDots: PIXI.Graphics;
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

  private labelCache: Map<
    string,
    { x: number; y: number; text: string; sprite: PIXI.Text }
  > = new Map();

  private gameobjectview: GameObjectView;
  private railview: RailView;

  constructor(
    private model: Model,
    private app: PIXI.Application,
    resources: Partial<Record<string, PIXI.LoaderResource>>
  ) {
    // PIXI
    this.app = app;
    this.pixiAppStage = new PIXI.Container();
    this.app.stage.addChild(this.pixiAppStage);
    this.atlas = resources.atlas.textures;

    // moveable and zoomable parts of canvas
    //(state: K, action?: Action<K>) => void;

    autorun(() => {
      this.hints = store.hints;
      this.tool = store.tool;
      this.selectionMode = store.selectionMode;
      this.zoom = store.zoom;
      this.panX = store.panX;
      this.panY = store.panY;
      this.cursorType = store.cursorType;
      this.mouse = store.mouse;
      this.snapPoint = store.snapPoint;

      // this.canvas.style.cursor = state.mouse.pan ? "grabbing" : "pointer";
      this.all();
    });

    this.all1();
    new POT(this.atlas); // make power-of-two textures

    this.gameobjectview = new GameObjectView(
      model,
      this.pixiAppStage,
      resources
    );

    this.railview = new RailView(model, this.pixiAppStage, resources);
  }

  private getTexture(name: string): PIXI.Texture {
    return this.atlas[name] || PIXI.Texture.WHITE;
  }

  public all1() {
    reaction(
      () => store.show.gridDots,
      (grid) => {
        if (grid) {
          this.pixiGridDots.renderable = true;
        } else {
          this.pixiGridDots.renderable = false;
        }
      }
    );
  }

  public all() {
    // this.labelCache.forEach((v) => this.label(v.x, v.y, v.text));
    // this.connections();
    this.grid();
    this.cursor();
    this.selectionFrame();
  }

  private cursor() {
    const cursorSprite = sprites.get("@Tool");
    if (this.cursorType === 0) {
      cursorSprite && (cursorSprite.visible = true);
      cursorSprite && cursorSprite.parent.addChild(cursorSprite); // bring to front

      // TODO: create tool from railview
      // this.tool && this.railview.makeCursor(this.tool(this.snapPoint));
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
      this.pixiGridBg = new PIXI.TilingSprite(
        this.getTexture("grass_t.png"),
        gridWidth * 50,
        gridHeight * 50
      );
      // bg.tint = 0x999999;
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
          const s = 1.5;
          dots.drawRect(Math.floor(x * 50) - s, Math.floor(y * 50) - s, s, s);
        }
      }
      dots.endFill();
      dots.renderable = false;
      this.pixiGridDots = dots;

      this.pixiGrid.addChild(this.pixiGridBg);
      this.pixiGrid.addChild(this.pixiGridDots);
      this.pixiAppStage.addChildAt(this.pixiGrid, 0);
    };

    if (!this.pixiGrid) {
      generatePixiGrid();
    }

    this.pixiAppStage.position.set(ts.panX, ts.panY);
    this.pixiAppStage.scale.set(ts.zoom / 50);
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
}
