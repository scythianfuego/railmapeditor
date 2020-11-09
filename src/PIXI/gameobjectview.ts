import ts from "../transform";
import Model from "../model";
import IGameObject from "../interfaces/IGameObject";
import IKeyValue from "../interfaces/IKeyValue";

import { observe, reaction, IReactionDisposer } from "mobx";
import * as PIXI from "pixi.js";
import TileMesh from "./tilemesh";

type GoSprites = {
  border?: PIXI.Graphics;
  sprite?: PIXI.Sprite;
  mesh?: TileMesh;
  rope?: PIXI.SimpleRope;
  points?: PIXI.Graphics;
};

const views: Map<string, GoSprites> = new Map();
const getView = (r: GoRecord) => views.get(r.key);

const disposers: Map<string, IReactionDisposer[]> = new Map();

type GoRecord = {
  key: string;
  obj: IGameObject;
};

const blends: {
  [key: string]: PIXI.BLEND_MODES;
} = {
  normal: PIXI.BLEND_MODES.NORMAL,
  add: PIXI.BLEND_MODES.ADD,
  multiply: PIXI.BLEND_MODES.MULTIPLY,
  screen: PIXI.BLEND_MODES.SCREEN,
};

export default class GameObjectView {
  private layers: IKeyValue = {};

  private controlLayer: PIXI.Container;
  private objectLayer: PIXI.Container;

  constructor(
    private model: Model,
    private pixiAppStage: PIXI.Container,
    private resources: Partial<Record<string, PIXI.LoaderResource>>
  ) {
    this.objectLayer = new PIXI.Container();
    this.controlLayer = new PIXI.Container();
    this.pixiAppStage.addChild(this.objectLayer, this.controlLayer);

    observe(this.model.gameobjects, (change) => {
      if (change.type === "add") {
        const obj = change.newValue;
        const key = change.name;

        const record: GoRecord = { key, obj };
        this.gameObject(record); // create

        const reactions = [
          [() => obj.type, () => this.changeType(record)],
          [() => obj.x, () => this.changeX(record)],
          [() => obj.y, () => this.changeY(record)],
          [() => obj.texture, () => this.changeTexture(record)],
          [() => obj.outline, () => this.changeOutline(record)],
          [() => obj.rotation, () => this.changeRotation(record)],
          [() => obj.alpha, () => this.changeAlpha(record)],
          [() => obj.blend, () => this.changeBlend(record)],
          [() => obj.points, () => this.updatePoints(record)],
          [
            () => this.model.selectedGameObject,
            () => this.changeSelection(record, this.model.selectedGameObject),
          ],
        ].map(([expression, effect]) => reaction(expression, effect));

        disposers.set(key, reactions);
        console.log("Added" + key);
      }

      if (change.type === "delete") {
        const key = change.name;
        console.log("Deleted" + key); // create go here
        disposers.get(key).forEach((dispose) => dispose());
        disposers.delete(key);
        this.destroy(key); // delete sprites
      }
    });

    reaction(
      () => this.model.selectedPointIndex,
      (index) => {
        const key = this.model.selectedGameObject;
        const obj = this.model.gameobjects.get(key);
        this.updatePoints({ key, obj });
      }
    );
  }

  // reactions
  private updatePoints(r: GoRecord) {
    // redraw points
    const view = getView(r);
    const points = r.obj.points;
    const selected = this.model.selectedPointIndex;
    const g = new PIXI.Graphics();
    g.lineStyle(1, 0x00ffff);
    g.moveTo(points[0].x * 50, points[0].y * 50);
    for (let i = 1; i < points.length; i++) {
      g.lineTo(points[i].x * 50, points[i].y * 50);
    }
    for (let i = 0; i < points.length; i++) {
      g.beginFill(i === selected ? 0xff00ff : 0xffff00);
      g.drawRect(points[i].x * 50 - 5, points[i].y * 50 - 5, 10, 10);
      g.endFill();
    }
    view.points && view.points.destroy();
    view.points = g;
    // redraw ropes
    const ropePoints = points.map((p) => new PIXI.Point(p.x * 50, p.y * 50));
    // const ropeTexture = this.texture(isPoly ? outline : texture);
    view.rope &&
      ((view.rope.geometry as PIXI.RopeGeometry).points = ropePoints);

    this.addChildren(r.key);
  }

  private changeType(r: GoRecord) {
    console.log("GO type change"); // recreate sprites here
    this.destroy(r.key);
    this.gameObject(r);
    this.ropes(r);
  }

  private changeX(r: GoRecord) {
    const { sprite, border } = getView(r);
    [sprite, border].filter((v) => v).forEach((v) => (v.x = r.obj.x * 50));
  }

  private changeY(r: GoRecord) {
    const { sprite, border } = getView(r);
    [sprite, border].filter((v) => v).forEach((v) => (v.y = r.obj.y * 50));
  }

  private changeTexture(r: GoRecord) {
    const texture = this.texture(r.obj.texture);
    const { sprite, mesh, rope } = getView(r);
    [sprite, mesh, rope].filter((v) => v).forEach((v) => (v.texture = texture));
  }

  private changeRotation(r: GoRecord) {
    const rotation = r.obj.rotation || 0;
    const { sprite, border } = getView(r);
    [sprite, border].filter((v) => v).forEach((v) => (v.angle = rotation));
  }

  private changeAlpha(r: GoRecord) {
    const alpha = r.obj.alpha || 1;
    const { sprite, mesh, rope } = getView(r);
    [sprite, mesh, rope].filter((v) => v).forEach((v) => (v.alpha = alpha));
  }

  private changeBlend(r: GoRecord) {
    const blend = blends[r.obj.blend] || 0;
    const { sprite, mesh, rope } = getView(r);
    [sprite, mesh, rope].filter((v) => v).forEach((v) => (v.blendMode = blend));
  }

  private changeOutline(r: GoRecord) {
    const view = getView(r);
    if (view.rope && r.obj.hasOutline) {
      const texture = this.texture(r.obj.outline);
      view.rope.texture = texture;
    }
  }

  private changeSelection(r: GoRecord, selectedKey: string) {
    const isSelected = r.key === selectedKey;
    const tint = isSelected ? 0x00ff00 : 0xffffff;

    const { sprite, border, points } = getView(r);
    [sprite, border].filter((v) => v).forEach((v) => (v.tint = tint));
    points && (points.visible = isSelected);
  }

  // helpers
  private view(r: GoRecord): GoSprites {
    return views.get(r.key);
  }

  private addChildren(key: string) {
    const view = views.get(key);
    view.border && this.controlLayer.addChild(view.border); // ??
    view.points && this.controlLayer.addChild(view.points);
    view.mesh && this.objectLayer.addChild(view.mesh);
    view.rope && this.objectLayer.addChild(view.rope);
    view.sprite && this.objectLayer.addChild(view.sprite);
  }

  private destroy(key: string) {
    const view = views.get(key);
    if (view) {
      // destroy automatically removes the display object from its parent
      view.sprite && view.sprite.destroy();
      view.mesh && view.mesh.destroy();
      view.rope && view.rope.destroy();
      view.border && view.border.destroy();
    }
    views.delete(key);
  }

  private texture(name: string): PIXI.Texture {
    // check POT textures
    return this.resources.atlas.textures[name] || PIXI.Texture.WHITE;
  }

  // implementation
  private border(r: GoRecord): PIXI.Graphics {
    // TODO: fix here - observe layers
    const { obj } = r;
    if (true || this.layers.objects) {
      const w = 64;
      const h = 64;
      const border = new PIXI.Graphics();
      border.lineStyle(1, 0xffffff, 1);
      border.drawRect(-w / 2, -h / 2, w, h);
      border.position.set(obj.x * 50, obj.y * 50);
      return border;
    }
  }

  private ropes(r: GoRecord) {
    const { key, obj } = r;
    const view = views.get(key);
    if (!view) {
      return;
    }

    let { texture, points, outline, type } = obj; // needs rebuild
    const isRope = type === "rope";
    const isPoly = type === "polygon";
    const doPoly = isPoly; // && this.layers.polygons;
    const doRope = isRope || (isPoly && outline); // && this.layers.ropes;

    const drawPoints = () => {
      this.updatePoints(r);
    };

    const fillPolygon = () => {
      const pixiPoints = points.map((p) => new PIXI.Point(p.x * 50, p.y * 50));
      const fillTexture = this.texture(texture);
      view.mesh = new TileMesh(fillTexture, pixiPoints);
      // view.mesh.blendMode = blends[blend] || 0; // ?? should we
    };

    const drawRope = () => {
      const pixiPoints = points.map((p) => new PIXI.Point(p.x * 50, p.y * 50));
      const ropeTexture = this.texture(isPoly ? outline : texture);
      view.rope = new PIXI.SimpleRope(ropeTexture, pixiPoints, 1);
    };

    doPoly && fillPolygon();
    doRope && drawRope();
    (doPoly || doRope) && drawPoints();

    this.addChildren(key);
  }

  private gameObject(r: GoRecord) {
    const { key, obj } = r;
    let { x, y, rotation, alpha, blend } = obj; // these are small changes
    let { texture, points, type } = obj; // +outline. these changes require rebuild

    // fix semaphores
    texture = type === "signal" ? "signalred.png" : texture;

    // pixi
    const view: GoSprites = {};
    views.set(key, view);

    if (["polygon", "rope"].includes(obj.type)) {
      this.ropes(r);
    } else {
      const sprite = new PIXI.Sprite(this.texture(texture));
      sprite.anchor.set(0.5);
      sprite.angle = rotation;
      sprite.blendMode = blends[blend] || 0;
      sprite.position.set(x * 50, y * 50);
      sprite.alpha = alpha ? alpha : 1;
      view.sprite = sprite;
    }

    view.border = this.border(r);
    this.addChildren(key);
  }
}
