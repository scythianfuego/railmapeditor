import { Point } from "./interfaces/Point";
import IRail from "./interfaces/IRail";
import IConnection from "./interfaces/IConnection";
import ISwitch from "./interfaces/ISwitch";
import catRomSpline from "cat-rom-spline";
import IGameObject from "./interfaces/IGameObject";

import { observable, action, ObservableMap } from "mobx";
import IKeyValue from "./interfaces/IKeyValue";

const magic = 0x7ffffffe;
const PIXELS_PER_UNIT = 50;

let uuidIndex = 0;
const UUID = (): string =>
  `#${(uuidIndex++).toString().padStart(5, "0")}:${Date.now() % 1000}z`;

const MIN_DISTANCE = 0.1;
const inside = (x: number, a: number, b: number) =>
  a < b ? a <= x && x <= b : a <= x || x <= b;
const distance = (x1: number, y1: number, x2: number, y2: number) =>
  Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));

const includesAll = (needle: number[], haystack: number[]) =>
  needle.every((v) => haystack.includes(v));

type ConnectionMap = {
  [index: string]: IConnection;
};

const filter = <T>(collection: Map<string, T>, fn: (i: T) => boolean): void => {
  collection.forEach((i: T, k: string) => {
    if (!fn(i)) {
      collection.delete(k);
    }
  });
};

const findAll = <T>(
  collection: Map<string, T>,
  fn: (i: T) => boolean
): string[] => {
  let result: string[] = [];
  for (const [k, v] of collection) {
    fn(v) && result.push(k);
  }
  return result;
};

const findOne = <T>(
  collection: Map<string, T>,
  fn: (i: T) => boolean
): string => {
  let result: string[] = [];
  for (const [k, v] of collection) {
    if (fn(v)) {
      return k;
    }
  }
  return null;
};

type GameObjectMap = ObservableMap<string, IGameObject>;
type RailMap = ObservableMap<string, IRail>;

export default class Model {
  public selectedConnection: string = null;
  @observable public selectedGameObject: string = null;
  @observable public selectedPointIndex: number = -1;

  @observable public gameobjects: GameObjectMap = observable.map();
  @observable public rails: RailMap = observable.map();

  public connections: Map<string, IConnection> = new Map(); // TODO: remove public access?
  public switches: Map<string, ISwitch> = new Map();
  public joins: Map<string, IJoin> = new Map();

  private railsIndex: Map<number, string> = new Map();
  private blockId = 1;
  private objectId = 2; // odd id means start of segment, even - end
  private pointId = 6001;

  public distance: (x1: number, y1: number, x2: number, y2: number) => number;

  constructor() {
    this.distance = distance;
  }

  export() {
    const TAU = 2 * Math.PI;
    const normalize = (angle: number) => ((angle % TAU) + TAU) % TAU;

    const autojoins: IJoin[] = Array.from(this.connections.values())
      .filter((c) => c.items.length === 2)
      .map((c) => c.items as IJoin);

    // convert to actual game scale, keep integer
    const pixels = (i: number) => Math.round(i * PIXELS_PER_UNIT || 0);
    const joins = Array.from(this.joins.values()).concat(autojoins);

    const objects: IKeyValue[] = JSON.parse(JSON.stringify(this.gameobjects)); // clone
    objects.forEach((o) => {
      if (["polygon", "rope"].includes(o.type)) {
        o.points = o.points.map((p: Point) => [pixels(p.x), pixels(p.y)]);
      }
      if (o.x) {
        o.x = pixels(o.x);
        o.y = pixels(o.y);
      }
    });

    const encodeChunk = (i: IRail) => {
      const a1 = normalize(i.a1);
      const a = normalize(i.a2);
      // angle delta MUST be positive to simplify drawing
      const a2 = a < a1 ? a + 2 * Math.PI : a;
      const radius = pixels(i.radius);
      // radius will be integer due to pixels(), never undefined or float, nor close to zero
      const isArc = radius > 0;
      const { x, y, sx, sy, ex, ey } = i;
      const { id, block } = i.meta;
      return [
        id,
        block,
        radius,
        pixels(isArc ? x : sx),
        pixels(isArc ? y : sy),
        isArc ? +a1.toFixed(3) : pixels(ex),
        isArc ? +a2.toFixed(3) : pixels(ey),
      ];
    };

    const result = JSON.stringify(
      {
        rails: Array.from(this.rails.values()).map(encodeChunk),
        switches: this.switches,
        joins,
        objects: objects,
      },
      null
      //, 2
    );
    window.open(
      "",
      "",
      "toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes"
    ).document.body.innerHTML = `<pre>${result}</pre>`;
  }

  serialize() {
    // return LZString.compressToUTF16(
    return JSON.stringify({
      rails: this.rails,
      blockId: this.blockId,
      pointId: this.pointId,
      objectId: this.objectId,
      connections: this.connections,
      switches: this.switches,
      joins: this.joins,
      gameobjects: this.gameobjects,
    });
    // );
  }

  unserialize(data: string) {
    // LZString.decompressFromUTF16(data)
    const obj = JSON.parse(data);
    this.blockId = obj.blockId || [];
    this.pointId = obj.pointId || [];
    this.objectId = obj.objectId || [];

    const makeMap = <T>(items: T[], target: Map<String, T>) => {
      (items || []).forEach((i: T) => target.set(UUID(), i));
    };
    makeMap(obj.store || obj.rails, this.rails); // compatibiity
    makeMap(obj.connections, this.connections);
    makeMap(obj.switches, this.switches);
    makeMap(obj.joins, this.joins);
    makeMap(obj.gameobjects, this.gameobjects);

    // load old and new format
    if (obj.gameobjectpoints) {
      obj.gameobjects.forEach((o: any) => {
        const pointid = o.points;
        if (pointid !== 0) {
          o.points = obj.gameobjectpoints[pointid];
        }
      });
    }

    //reindex
    this.railsIndex = new Map();
    this.rails.forEach((v, k) => this.railsIndex.set(v.meta.id, k));
  }

  makeConnection(pointId: number, x: number, y: number) {
    this.connections.set(UUID(), { x, y, items: [pointId] });
  }

  addToConnection(pointId: number, connection: IConnection) {
    !connection.items.includes(pointId) && connection.items.push(pointId);
    connection.items.sort();
  }

  findConnection(x: number, y: number): string {
    return findOne(
      this.connections,
      (v) => distance(x, y, v.x, v.y) < MIN_DISTANCE
    );
  }

  createConnections(obj: IRail) {
    const startId = obj.meta.id;
    const endId = startId + 1;
    const { sx, sy, ex, ey } = obj;
    let connectionUUID: string = null;

    connectionUUID = this.findConnection(sx, sy);
    connectionUUID
      ? this.addToConnection(startId, this.connections.get(connectionUUID))
      : this.makeConnection(startId, sx, sy);

    connectionUUID = this.findConnection(ex, ey);
    connectionUUID
      ? this.addToConnection(endId, this.connections.get(connectionUUID))
      : this.makeConnection(endId, ex, ey);
  }

  add(point: number[], obj: IRail) {
    if (!obj) {
      return;
    }

    const [x, y] = point;
    const selected = false;
    const id = this.objectId;
    this.objectId += 2;
    const block = this.blockId++;
    obj.meta = { id, x, y, selected, block };
    this.createConnections(obj);
    const uuid = UUID();
    this.rails.set(uuid, obj);
    this.railsIndex.set(id, uuid);
  }

  get(pointId: number): string {
    return this.railsIndex.get(pointId & magic);
  }

  findByRect(sx: number, sy: number, ex: number, ey: number): string[] {
    // check if endpoints are within rectangle
    const lx = Math.min(sx, ex);
    const rx = Math.max(sx, ex);
    const ly = Math.min(sy, ey);
    const ry = Math.max(sy, ey);
    const insideX = (x: number) => inside(x, lx, rx);
    const insideY = (y: number) => inside(y, ly, ry);
    const insideXY = (x: number, y: number) => insideX(x) && insideY(y);

    return findAll(
      this.rails,
      (v) => insideXY(v.sx, v.sy) && insideXY(v.ex, v.ey)
    );
  }

  findByXY(x: number, y: number): string[] {
    const TAU = 2 * Math.PI;
    const normalize = (angle: number) => ((angle % TAU) + TAU) % TAU;

    const pointInArc = (x: number, y: number, obj: IRail) => {
      // check if within sector and close to radius
      const angle = normalize(Math.atan2(y - obj.y, x - obj.x));
      const radius = distance(x, y, obj.x, obj.y);
      const withinAngle = inside(angle, normalize(obj.a1), normalize(obj.a2));
      const closeToRadius = Math.abs(radius - obj.radius) < MIN_DISTANCE;
      return withinAngle && closeToRadius;
    };

    const pointInLine = (x: number, y: number, obj: IRail) => {
      // check if distance to endpoints matches segment length
      const ab = distance(obj.ex, obj.ey, x, y);
      const bc = distance(obj.sx, obj.sy, x, y);
      const ac = distance(obj.sx, obj.sy, obj.ex, obj.ey);
      return Math.abs(ab + bc - ac) < MIN_DISTANCE;
    };

    return findAll(this.rails, (v) =>
      v.radius ? pointInArc(x, y, v) : pointInLine(x, y, v)
    );
  }

  deselect() {
    this.rails.forEach((v) => (v.meta.selected = false));
  }

  select(selection: string[]) {
    selection.forEach((v) => (this.rails.get(v).meta.selected = true));
  }

  deleteSelected() {
    let ids = Array.from(this.rails.values())
      .filter((i) => i.meta.selected)
      .map((i) => i.meta.id);
    ids = ids.concat(ids.map((i) => i + 1)); // add reverse links

    // remove from rail storage
    filter(this.rails, (i) => !i.meta.selected);

    ids.forEach((id) => {
      // remove from index, should use lodash.partition instead
      this.railsIndex.delete(id);

      // remove from joins and switches
      filter(this.joins, (i) => !i.includes(id));
      filter(this.switches, (i) => !i.includes(id));

      // remove from connections
      this.connections.forEach((i) => {
        i.items = i.items.filter((v) => v !== id);
      });
    });
    // delete empty connections
    filter(this.connections, (i) => !i.items.length);
  }

  selectGroup(selection: string[]) {
    this.select(selection);
    const selected = findAll(this.rails, (i) => i.meta.selected);
    const deselected = findAll(this.rails, (i) => !i.meta.selected);
    selected.forEach((s) => {
      deselected.forEach(
        (d) =>
          this.rails.get(s).meta.block === this.rails.get(d).meta.block &&
          (this.rails.get(d).meta.selected = true)
      );
    });
  }

  group() {
    const groupBlockId = this.blockId++;
    this.rails.forEach((v) => v.meta.selected && (v.meta.block = groupBlockId));
  }

  ungroup() {
    this.rails.forEach((v) => {
      if (v.meta.selected) {
        const groupBlockId = this.blockId++;
        v.meta.block = groupBlockId;
      }
    });
    this.deselect();
  }

  reindexBlocks() {
    this.blockId = 1;
    const indices: Map<number, number> = new Map();

    this.rails.forEach((v) => {
      const curr = v.meta.block;
      if (!indices.has(curr)) {
        indices.set(curr, this.blockId++);
      }
    });

    this.rails.forEach((v) => {
      v.meta.block = indices.get(v.meta.block);
    });
  }

  reindexRails() {
    throw "Not implemented";

    // this.objectId = 2;
    // const indices: Map<number, number> = new Map();

    // this.rails.forEach(v => {
    //   const curr = v.meta.id;
    //   if (!indices.has(curr)) {
    //     indices.set(curr, this.objectId);
    //     indices.set(curr + 1, this.objectId + 1);
    //     this.objectId += 2;
    //   }
    // });

    // this.rails.forEach(v => {
    //   v.meta.id = indices.get(v.meta.id);
    // });

    // this.connections.forEach(c => {
    //   c.items = c.items.map(i => indices.get(i) || 0);
    // });

    // this.switches = this.switches.map(s => s.map(i => indices.get(i) || 0));

    // this.joins = this.joins.map(
    //   j => [indices.get(j[0]) || 0, indices.get(j[1]) || 0] as IJoin
    // );
  }

  findJoin(id: number): string {
    return findOne(
      this.joins,
      (j) => (j[0] & magic) === id || (j[1] & magic) === id
    );
  }

  findSwitch(id: number): string {
    return findOne(this.switches, (v) => v.map((i) => i & magic).includes(id));
  }

  getSelectedIds(): number[] {
    return Array.from(this.rails.values())
      .filter((v) => v.meta.selected)
      .map((v) => v.meta.id)
      .sort();
  }

  getAdjacentEndpoints(ids: number[]): number[] {
    // converting object id to points id here
    // objects have odd ids, points: start = id, end = id + 1
    const connection = Array.from(this.connections.values()).find((v) =>
      includesAll(
        ids,
        v.items.map((i) => i & magic)
      )
    );

    return connection
      ? connection.items.filter((i) => ids.includes(i & magic))
      : null;
  }

  createJoinFromSelection(): boolean {
    const selection = this.getSelectedIds();
    if (selection.length != 2) {
      return false;
    }

    const items = this.getAdjacentEndpoints(selection);
    if (!items) {
      return false;
    }

    const [a, b] = items;
    this.joins.set(UUID(), [a, b]);
    this.deselect();
    return true;
  }

  createSwitchFromSelection(): boolean {
    const selection = this.getSelectedIds();
    if (![3, 4].includes(selection.length)) {
      return false;
    }

    const items = this.getAdjacentEndpoints(selection);
    if (!items) {
      return false;
    }

    let sw: ISwitch = <ISwitch>[0, 0, 0, 0].map((v, i) => items[i] || 0);
    this.switches.set(UUID(), sw);
    this.deselect();
    return true;
  }

  setSwitchSegmentType(newType: number) {
    if (newType < 0 || newType > 3) {
      throw new Error("Invalid switch segment type");
    }

    const selection = this.getSelectedIds();
    if (selection.length === 1) {
      const swid = this.findSwitch(selection[0]);
      const sw = swid ? this.switches.get(swid) : null;
      if (sw) {
        const oldType = sw.findIndex((i) => (i & magic) === selection[0]);
        const tmp = sw[newType];
        sw[newType] = sw[oldType];
        sw[oldType] = tmp;
      }
    }
  }

  // objects
  @action addGameObject(x: number, y: number): string {
    const o: IGameObject = {
      x,
      y,
      type: "none",
      zindex: 0,
      points: [],
    };

    const uuid = UUID();
    this.createDefaultPoints(o);
    this.gameobjects.set(uuid, o);
    return uuid;
  }

  @action moveGameObject(objuuid: string, x: number, y: number) {
    const obj = this.gameobjects.get(objuuid);
    obj.x = x;
    obj.y = y;
  }

  @action updateGameObjectProperties(objuuid: string, values: IGameObject) {
    const old: IGameObject = this.gameobjects.get(objuuid);
    Object.assign(old, values);
    // Object.keys(old).forEach(
    //   // delete old values
    //   (key) => !values.hasOwnProperty(key) && delete (old as IKeyValue)[key]
    // );
  }

  cloneGameObject(): string {
    if (this.selectedGameObject) {
      const clone = { ...this.gameobjects.get(this.selectedGameObject) };
      const uuid = UUID();
      this.gameobjects.set(uuid, clone);
      return uuid;
    }
  }

  deleteSelectedGameObject() {
    if (this.selectedGameObject) {
      const gameobject = this.gameobjects.get(this.selectedGameObject);
      this.gameobjects.delete(this.selectedGameObject);
    }
  }

  findGameObjectByXY(x: number, y: number) {
    const d = 1.28 * 0.5;
    return findOne(
      this.gameobjects,
      (o) => inside(x, o.x - d, o.x + d) && inside(y, o.y - d, o.y + d)
    );
  }

  private bring(forward: boolean) {
    if (this.selectedGameObject) {
      const gameobjects: [string, IGameObject][] = [...this.gameobjects];

      const index = gameobjects.findIndex(
        ([k, v]) => k === this.selectedGameObject
      );
      const removed = gameobjects.splice(index, 1);
      forward ? gameobjects.push(removed[0]) : gameobjects.unshift(removed[0]);

      this.gameobjects = observable.map(gameobjects);
    }
  }

  bringForward() {
    return this.bring(true);
  }

  bringBack() {
    return this.bring(false);
  }

  // polygons and ropes

  findPointByXY(x: number, y: number) {
    const points = this.gameobjects.get(this.selectedGameObject).points;
    const ind = points.findIndex(
      (p) => distance(x, y, p.x, p.y) < MIN_DISTANCE
    );
    return ind;
  }

  movePoint(x: number, y: number) {
    const index = this.selectedPointIndex;
    if (index === -1) {
      return;
    }
    const points = this.gameobjects.get(this.selectedGameObject).points;
    points[index].x = x;
    points[index].y = y;
  }

  addPoint(x: number, y: number) {
    const points = this.gameobjects.get(this.selectedGameObject).points;
    points.push(new Point(x, y));
  }

  deletePoint() {
    const index = this.selectedPointIndex;
    if (index === -1) {
      return;
    }
    const points = this.gameobjects.get(this.selectedGameObject).points;
    points.length > 2 && points.splice(index, 1);
  }

  splitPoint() {
    const index = this.selectedPointIndex;
    if (index === -1) {
      return;
    }
    const points = this.gameobjects.get(this.selectedGameObject).points;

    const current = points[index];
    const pointBetween = (p1: Point, p2: Point) => {
      return new Point(p1.x + 0.5 * (p2.x - p1.x), p1.y + 0.5 * (p2.y - p1.y));
    };

    if (index < points.length - 1) {
      const next = points[index + 1];
      const after = pointBetween(current, next);
      points.splice(index + 1, 0, after);
    }

    if (index > 0) {
      const prev = points[index - 1];
      const before = pointBetween(prev, current);
      points.splice(index, 0, before);
    }
    this.selectedPointIndex = -1;
  }

  splitInterpolate() {
    const index = this.selectedPointIndex;
    if (index === -1) {
      return;
    }
    const points = this.gameobjects.get(this.selectedGameObject).points;
    if (points.length < 5) {
      console.log("Not enough points");
      return;
    }

    if (index < 2 || index > points.length - 2) {
      console.log("Cant interpolate at this point");
      return;
    }
    const pointArr = points.slice(index - 2, index + 2).map((p) => [p.x, p.y]);
    const options = { samples: 3, knot: 0.5 };

    const spline = catRomSpline;
    const interpolated: number[][] = spline(pointArr, options);
    const newPoints = interpolated.map(([x, y]) => new Point(x, y));
    points.splice(index, 0, ...newPoints.slice(1, newPoints.length - 2));
    this.selectedPointIndex = -1;
  }

  createDefaultPoints(obj: IGameObject) {
    const { x, y, type, points } = obj;
    const d = 1.28 * 0.5 * 1.2;
    let newPoints: Point[] = [];
    if (type === "rope") {
      newPoints.push(new Point(x, y + d));
      newPoints.push(new Point(x, y - d));
    } else {
      newPoints.push(new Point(x - d, y - d));
      newPoints.push(new Point(x - d, y + d));
      newPoints.push(new Point(x + d, y + d));
      newPoints.push(new Point(x + d, y - d));
    }

    obj.points = newPoints;
  }

  // finder:
  // this.model.selectedGameObject = (this.model.gameobjects).filter(i => i.type==='rope' && i.texture == 'road.png')[0]
}
