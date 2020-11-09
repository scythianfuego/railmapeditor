import ts from "../transform";
import Model from "../model";
import IGameObject from "../interfaces/IGameObject";
import IKeyValue from "../interfaces/IKeyValue";
import IRail from "../interfaces/IRail";

import {
  observe,
  reaction,
  IReactionDisposer,
  IMapDidChange,
  ObservableMap,
} from "mobx";
import * as PIXI from "pixi.js";
import TileMesh from "./tilemesh";
import IConnection from "../interfaces/IConnection";

type RailRecord = {
  key: string;
  obj: IRail;
};

const RAIL = "rails.png";
const sprites: Map<string, PIXI.SimpleRope> = new Map();
const tintDefaults: Map<string, number> = new Map();
const labelCache: Map<string, PIXI.Text> = new Map();
const connectCircles: Map<string, PIXI.Graphics> = new Map();

const disposers: Map<string, IReactionDisposer[]> = new Map();

export default class GameObjectView {
  constructor(
    private model: Model,
    private pixiAppStage: PIXI.Container,
    private resources: Partial<Record<string, PIXI.LoaderResource>>
  ) {
    observe(this.model.rails, (change) => {
      if (change.type === "add") {
        const obj = change.newValue;
        const key = change.name;
        const record: RailRecord = { key, obj };

        this.rail(obj, key);

        const reactions = [
          [() => obj.meta.selected, () => this.changeSelection(record)],
        ].map(([expression, effect]) => reaction(expression, effect));

        disposers.set(key, reactions);
      }

      if (change.type === "delete") {
        const key = change.name;
        disposers.get(key).forEach((dispose) => dispose());
        disposers.delete(key);
        this.destroy(key); // delete sprites
      }
    });

    // reaction(
    //   () => this.model.selectedPointIndex,
    //   (index) => {
    //     const key = this.model.selectedGameObject;
    //     const obj = this.model.gameobjects.get(key);
    //     this.updatePoints({ key, obj });
    //   }
    // );
    this.connections();
    this.switches();
    this.joins();
  }

  public makeCursor(obj: IRail) {
    // TODO: do not recreate objects
    this.rail(obj, "@Tool");
  }

  private destroy(key: string) {
    const sprite = sprites.get(key);
    sprite && sprite.destroy();
    sprites.delete(key);
  }

  private changeSelection(record: RailRecord) {
    const sprite = sprites.get(record.key);
    const selected = record.obj.meta && record.obj.meta.selected;

    const defaults = tintDefaults.get(record.key) || 0xffffff; //no tint
    const color = selected ? 0xff0000 : defaults;
    sprite.tint = color;
  }

  private getTexture(name: string): PIXI.Texture {
    return this.resources.atlas.textures[name] || PIXI.Texture.WHITE;
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

    const points = calcPoints();
    const texture = this.getTexture(RAIL);
    texture.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;
    const sprite = new PIXI.SimpleRope(texture, points, 0.5);
    sprite.position.set(0, 0);
    sprite.blendMode = PIXI.BLEND_MODES.NORMAL;
    sprites.set(key, sprite);
    this.pixiAppStage.addChild(sprite);

    const midx = x * 50 + radius * 50 * Math.cos((a1 + a2) / 2);
    const midy = y * 50 + radius * 50 * Math.sin((a1 + a2) / 2);
    // meta &&
    //   //this.layers.blocks &&
    //   this.label(midx, midy, meta.block.toString());

    meta &&
      // this.layers.ids &&
      this.label(key, meta.id.toString());
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

    const points = calcPoints();
    const sprite = new PIXI.SimpleRope(this.getTexture(RAIL), points, 0.5);
    sprite.position.set(0, 0);
    sprites.set(key, sprite);
    this.pixiAppStage.addChild(sprite);

    const midx = (sx + ex) * 0.5;
    const midy = (sy + ey) * 0.5;
    // meta &&
    //   // this.layers.blocks &&
    //   this.label(midx, midy, meta.block.toString());

    meta &&
      // this.layers.ids &&
      this.label(key, meta.id.toString());
  }

  private rail(obj: IRail, key: string) {
    obj.radius ? this.arc(obj, key) : this.line(obj, key);
  }

  private label(key: string, text: string) {
    if (labelCache.has(key)) {
      const label = labelCache.get(key);
      if (text === "") {
        label.destroy();
        labelCache.delete(key);
      } else {
        label.text = text;
      }
    } else {
      const path = this.model.rails.get(key);
      if (!path) {
        return;
      }
      const x = 0.5 * (path.sx + path.ex);
      const y = 0.5 * (path.sy + path.ey);

      const label = new PIXI.Text(text, {
        fontFamily: "Arial",
        fontSize: 10,
        fill: 0xffffff,
        align: "center",
      });
      label.x = x * 50;
      label.y = y * 50;
      labelCache.set(key, label);

      this.pixiAppStage.addChild(label);
    }
  }

  private selectConnection(key: string, obj: IConnection) {
    if (key === this.model.selectedConnection) {
      // highlight items - temp
      obj.items.forEach((i: any) => {
        const obj = this.model.get(i);
        const sprite = sprites.get(obj);
        sprite && (sprite.tint = 0xff0000);
        // this.objectPath(obj);
      });

      connectCircles.get(key).destroy();

      const radius = 15;
      const color = 0x0000000; // ?? "rgba(0, 0, 0, 0.8)";
      const circle = new PIXI.Graphics();
      circle.beginFill(color);
      circle.drawCircle(obj.x * 50, obj.y * 50, radius);
      circle.endFill();
      this.pixiAppStage.addChild(circle);

      connectCircles.set(key, circle);
    }
  }

  private makeTint(spriteId: string, tint: number) {
    if (spriteId) {
      const sprite = sprites.get(spriteId);
      if (sprite) {
        sprite.tint = tint;
        tintDefaults.set(spriteId, tint);
      }
    }
  }

  private switches() {
    const labels = ["A1", "A2", "B1", "B2"];
    const tint = 0x00ff00; // green for switches

    observe(this.model.switches, (change) => {
      if (change.type === "add") {
        const v = change.newValue;
        [0, 1, 2, 3]
          .map((i) => this.model.get(v[i]))
          .forEach((id, index) => {
            this.makeTint(id, tint);
            this.label(id, labels[index]);
          });
      }

      if (change.type === "update") {
        const v = change.newValue;

        [0, 1, 2, 3]
          .map((i) => this.model.get(v[i]))
          .forEach((id, index) => {
            this.label(id, labels[index]);
          });
      }
    });
  }

  private joins() {
    observe(this.model.joins, (change) => {
      if (change.type === "add") {
        const v = change.newValue;
        const tint = 0x9999994c;
        this.makeTint(this.model.get(v[0]), tint);
        this.makeTint(this.model.get(v[1]), tint);
      }
    });
  }

  private connections() {
    observe(this.model.connections, (change) => {
      if (change.type === "add") {
        const obj = change.newValue;
        const key = change.name;
        // const record: RailRecord = { key, obj };

        // this.rail(obj, key);

        const reactions = [
          [
            () => this.model.selectedConnection,
            () => this.selectConnection(key, obj),
          ],
        ].map(([expression, effect]) => reaction(expression, effect));

        disposers.set(key, reactions);

        const { x, y, items } = obj;
        const isSimple = items.length <= 2;

        let radius = isSimple ? 3 : 5;
        let color = isSimple ? 0x00aa00 : 0xff0000;
        if (key === this.model.selectedConnection) {
          radius = 15;
          color = 0x0000000; // ?? "rgba(0, 0, 0, 0.8)";

          // draw items - temp
          obj.items.forEach((i: any) => {
            const obj = this.model.get(i);
            const sprite = sprites.get(obj);
            sprite && (sprite.tint = 0xff0000);
          });
        }

        const circle = new PIXI.Graphics();
        circle.beginFill(color);
        circle.drawCircle(x * 50, y * 50, radius);
        circle.endFill();
        this.pixiAppStage.addChild(circle);

        connectCircles.set(key, circle);
      }

      if (change.type === "delete") {
        const key = change.name;
        disposers.get(key).forEach((dispose) => dispose());
        disposers.delete(key);
        connectCircles.get(key).destroy();
      }
    });
  }
}
