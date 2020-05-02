import ts from "../transform";
import Model from "../model";
import IGameObject from "../interfaces/IGameObject";
import IKeyValue from "../interfaces/IKeyValue";

import { observe, reaction, IReactionDisposer } from "mobx";
import * as PIXI from "pixi.js";
import TileMesh from "./tilemesh";

type GoSprites = {
  box: PIXI.Container;
  border?: PIXI.Graphics;
  sprite?: PIXI.Sprite;
  mesh?: TileMesh;
  rope?: PIXI.SimpleRope;
  points?: PIXI.Graphics;
};

const views: Map<string, GoSprites> = new Map();
const disposers: Map<string, IReactionDisposer[]> = new Map();
const pointsIndex: Map<number, string> = new Map();

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

  constructor(
    private model: Model,
    private pixiAppStage: PIXI.Container,
    private resources: Partial<Record<string, PIXI.LoaderResource>>
  ) {
    observe(this.model.gameobjects, (change) => {
      if (change.type === "add") {
        const obj = change.newValue;
        const key = change.name;

        const record: GoRecord = { obj, key };
        this.gameObject(record); // create

        const reactions = [
          [() => obj.type, () => this.changeType(record)],
          [() => obj.x, () => this.changeX(record)],
          [() => obj.y, () => this.changeY(record)],
          [() => obj.texture, () => this.changeTexture(record)],
          [() => obj.rotation, () => this.changeRotation(record)],
          [() => obj.alpha, () => this.changeAlpha(record)],
          [() => obj.blend, () => this.changeBlend(record)],
          [() => obj.points, () => this.changePoints(record)],
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
        this.destroyView(key); // delete sprites
      }
    });

    // reaction(
    //   () => this.model.selectedGameObject,
    //   () => this.changeSelection(this.model.selectedGameObject)
    // );

    observe(this.model.gameobjectpoints, (change) => {
      // if points are added? so what?
      // check if points are used?
      // when points are added, make reaction (link object?)
      if (change.type === "add") {
        const index = change.name; // id
        const points = change.newValue;
        const key = pointsIndex.get(index);
        const obj = this.model.gameobjects.get(key);
        reaction(
          () => points.length,
          () => this.updatePoints({ key, obj })
        );
      }

      if (change.type === "delete") {
        const index = change.name;
        const key = pointsIndex.get(index);
        if (key) {
          const view = views.get(key);
          const points = view.points;
          points && points.destroy();
          view.points = null;
        }
      }
    });
  }

  // reactions
  private updatePoints(r: GoRecord) {
    // redraw points
    const view = this.view(r);
    const pdata = this.model.gameobjectpoints.get(r.obj.points);
    const points = new PIXI.Graphics();
    points.lineStyle(1, 0x00ffff);
    // this.point( selected ? "red" : "cyan");
    points.moveTo(pdata[0].x * 50, pdata[0].x * 50);
    for (let i = 1; i < pdata.length; i++) {
      points.lineTo(pdata[i].x * 50, pdata[i].y * 50);
    }
    points.beginFill(0xffff00);
    for (let i = 0; i < pdata.length; i++) {
      points.drawRect(pdata[i].x * 50 - 5, pdata[i].y * 50 - 5, 10, 10);
    }
    points.endFill();
    view.points && view.points.destroy();
    view.points = points;
    view.points && view.box.addChild(view.points);
    // redraw ropes
  }

  private changePoints(r: GoRecord) {
    // reindex

    const index = r.obj.points;
    const key = r.key;
    index === 0 ? pointsIndex.delete(index) : pointsIndex.set(index, key);
  }

  private changeType(r: GoRecord) {
    console.log("GO type change"); // recreate sprites here
    this.destroyView(r.key);
    this.gameObject(r);
  }

  private changeX(r: GoRecord) {
    this.view(r).box.x = r.obj.x * 50;
  }

  private changeY(r: GoRecord) {
    this.view(r).box.y = r.obj.y * 50;
  }

  private changeTexture(r: GoRecord) {
    const view = this.view(r);
    const texture = this.texture(r.obj.texture);
    view.sprite && (view.sprite.texture = texture);
    view.mesh && (view.mesh.texture = texture);
    if (view.border) {
      view.border.destroy();
      view.border = this.updateBorder(r);
      view.border && view.box.addChild(view.border);
    }
  }

  private changeRotation(r: GoRecord) {
    const view = this.view(r);
    const sprite = view.sprite;
    const border = view.border;
    const rotation = r.obj.rotation || 0;
    sprite && (sprite.angle = rotation);
    border && (border.angle = rotation);
  }

  private changeAlpha(r: GoRecord) {
    const sprite = this.view(r).sprite;
    sprite && (sprite.alpha = r.obj.alpha || 1);
  }

  private changeBlend(r: GoRecord) {
    const sprite = this.view(r).sprite;
    sprite && (sprite.blendMode = blends[r.obj.blend] || 0);
  }

  private changeOutline(r: GoRecord) {
    const view = this.view(r);
    if (view.rope && r.obj.hasOutline) {
      const texture = this.texture(r.obj.outline);
      view.rope.texture = texture;
    }
  }

  private changeSelection(r: GoRecord, selectedKey: string) {
    const selected = views.get(r.key);
    const tint = r.key === selectedKey ? 0x00ff00 : 0xffffff;
    selected.border && (selected.border.tint = tint);
    selected.sprite && (selected.sprite.tint = tint);
  }

  // helpers
  private view(r: GoRecord): GoSprites {
    return views.get(r.key);
  }

  private destroyView(key: string) {
    views.get(key).box.destroy({ children: true });
  }

  private addView(key: string, view: GoSprites) {
    view.sprite && view.box.addChild(view.sprite);
    view.mesh && view.box.addChild(view.mesh);
    view.rope && view.box.addChild(view.rope);
    view.points && view.box.addChild(view.points);
    view.border && view.box.addChild(view.border);
    this.pixiAppStage.addChild(view.box);
    views.set(key, view);
  }

  private texture(name: string): PIXI.Texture {
    return this.resources.atlas.textures[name] || PIXI.Texture.WHITE;
  }

  private updateBorder(r: GoRecord): PIXI.Graphics {
    const { obj } = r;

    // TODO: fix here - observe layers
    if (true || this.layers.objects) {
      const px = 50; // pixels per unit
      let w = 64;
      let h = 64;
      // if (obj.texture) {
      //   w = this.texture(obj.texture).width;
      //   h = this.texture(obj.texture).height;

      //   const ow = Number(obj.width) || 0;
      //   const oh = Number(obj.height) || 0;
      //   if (ow !== 0) {
      //     w = ow;
      //     h = obj.frame && oh !== 0 ? oh : (w * obj.frame.h) / obj.frame.w;
      //   }
      // }

      const border = new PIXI.Graphics();
      border.lineStyle(1, 0xffffff, 1);
      obj.points
        ? border.drawCircle(0, 0, 64)
        : border.drawRect(-w / 2, -h / 2, w, h);

      // border.endFill();
      return border;
    }
  }

  // implementation

  private gameObject(r: GoRecord) {
    const { key, obj } = r;
    let { x, y, rotation, alpha, blend } = obj; // these are small changes
    let { texture, points, outline, type } = obj; // needs rebuild

    // fix semaphores
    texture = type === "signal" ? "signalred.png" : texture;

    // pixi
    const box = new PIXI.Container();
    box.position.set(x * 50, y * 50);
    box.alpha = alpha ? alpha : 1;

    const view: GoSprites = { box };

    if (points) {
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
        const points = new PIXI.Graphics();
        points.beginFill(0x00ffff);
        // this.point( selected ? "red" : "cyan");

        for (let i = 0; i < pdata.length; i++) {
          points.drawCircle(pdata[i].x * 50, pdata[i].y * 50, 10);
        }
        points.endFill();
        view.points = points;
      };

      const fillPolygon = () => {
        const points = pdata.map((p) => new PIXI.Point(p.x * 50, p.y * 50));
        const fillTexture = this.texture(texture);
        view.mesh = new TileMesh(fillTexture, points);
        // view.mesh.blendMode = blends[blend] || 0; // ?? should we
      };

      const drawRope = () => {
        const points = pdata.map((p) => new PIXI.Point(p.x * 50, p.y * 50));
        const ropeTexture = this.texture(isPoly ? outline : texture);
        view.rope = new PIXI.SimpleRope(ropeTexture, points, 1);
      };

      doPoly && fillPolygon();
      doRope && drawRope();
      doBoth && drawPoints();
    } else {
      const sprite = new PIXI.Sprite(this.texture(texture));
      sprite.anchor.set(0.5);
      sprite.angle = rotation;
      sprite.blendMode = blends[blend] || 0;
      view.sprite = sprite;
    }

    view.border = this.updateBorder(r);
    this.addView(key, view);
  }
}
