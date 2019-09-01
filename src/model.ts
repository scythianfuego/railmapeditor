import { Point } from "./interfaces/Point";
import IRail from "./interfaces/IRail";
import IConnection from "./interfaces/IConnection";
import ISwitch from "./interfaces/ISwitch";
import catRomSpline from "cat-rom-spline";
import IGameObject from "./interfaces/IGameObject";

const magic = 0x7ffffffe;
const PIXELS_PER_UNIT = 50;

const MIN_DISTANCE = 0.1;
const inside = (x: number, a: number, b: number) =>
  a < b ? a <= x && x <= b : a <= x || x <= b;
const distance = (x1: number, y1: number, x2: number, y2: number) =>
  Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));

const includesAll = (needle: number[], haystack: number[]) =>
  needle.every(v => haystack.includes(v));

type ConnectionMap = {
  [index: string]: IConnection;
};

export default class Model {
  public selectedConnection: IConnection = null;
  public selectedGameObject: IGameObject = null;
  public selectedPointIndex: number = -1;

  public connections: IConnection[] = []; // TODO: remove public access
  public switches: ISwitch[] = [];
  public joins: IJoin[] = [];
  public gameobjects: IGameObject[] = [];

  public gameobjectpoints: Map<number, Point[]> = new Map();

  private rails: IRail[] = [];
  private railsIndex = new Map();
  private blockId = 1;
  private objectId = 2; // odd id means start of segment, even - end
  private pointId = 6001;

  public distance: (x1: number, y1: number, x2: number, y2: number) => number;
  public dirty: boolean = false;

  constructor() {
    this.distance = distance;
  }

  export() {
    const TAU = 2 * Math.PI;
    const normalize = (angle: number) => ((angle % TAU) + TAU) % TAU;

    const autojoins: IJoin[] = this.connections
      .filter(c => c.items.length === 2)
      .map(c => c.items as IJoin);

    // convert to actual game scale, keep integer
    const pixels = (i: number) => Math.round(i * PIXELS_PER_UNIT || 0);
    const joins = this.joins.concat(autojoins);

    const objects = JSON.parse(JSON.stringify(this.gameobjects)); // clone
    objects.forEach((o: IGameObject) => {
      if (o.points) {
        o.points = o.points === 0 ? [] : this.gameobjectpoints.get(o.points);
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
        isArc ? +a2.toFixed(3) : pixels(ey)
      ];
    };

    const result = JSON.stringify(
      {
        rails: this.rails.map(encodeChunk),
        switches: this.switches,
        joins,
        objects: objects
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
      gameobjectpoints: Array.from(this.gameobjectpoints)
    });
    // );
  }

  unserialize(data: string) {
    // LZString.decompressFromUTF16(data)
    const obj = JSON.parse(data);
    this.rails = obj.store || obj.rails || []; // compatibiity
    this.blockId = obj.blockId || [];
    this.pointId = obj.pointId || [];
    this.objectId = obj.objectId || [];
    this.connections = obj.connections || [];
    this.switches = obj.switches || [];
    this.joins = obj.joins || [];
    this.gameobjects = obj.gameobjects || [];
    this.gameobjectpoints = new Map(obj.gameobjectpoints || []);

    //reindex
    this.railsIndex = new Map();
    this.rails.forEach(v => this.railsIndex.set(v.meta.id, v));
    this.dirty = true;
  }

  makeConnection(pointId: number, x: number, y: number) {
    this.connections.push({ x, y, items: [pointId] });
    this.dirty = true;
  }

  addToConnection(pointId: number, connection: IConnection) {
    !connection.items.includes(pointId) && connection.items.push(pointId);
    connection.items.sort();
    this.dirty = true;
  }

  findConnection(x: number, y: number) {
    return this.connections.find(v => distance(x, y, v.x, v.y) < MIN_DISTANCE);
  }

  createConnections(obj: IRail) {
    const startId = obj.meta.id;
    const endId = startId + 1;
    const { sx, sy, ex, ey } = obj;
    let connection: IConnection = null;

    connection = this.findConnection(sx, sy);
    connection
      ? this.addToConnection(startId, connection)
      : this.makeConnection(startId, sx, sy);

    connection = this.findConnection(ex, ey);
    connection
      ? this.addToConnection(endId, connection)
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
    this.rails.push(obj);
    this.railsIndex.set(id, obj);
    this.dirty = true;
  }

  get(pointId: number): IRail {
    return this.railsIndex.get(pointId & magic);
  }

  forEach(fn: (i: IRail) => void) {
    this.rails.forEach(i => fn(i));
    // this.dirty = true; // ???
  }

  findByRect(sx: number, sy: number, ex: number, ey: number): IRail[] {
    // check if endpoints are within rectangle
    const lx = Math.min(sx, ex);
    const rx = Math.max(sx, ex);
    const ly = Math.min(sy, ey);
    const ry = Math.max(sy, ey);
    const insideX = (x: number) => inside(x, lx, rx);
    const insideY = (y: number) => inside(y, ly, ry);
    const insideXY = (x: number, y: number) => insideX(x) && insideY(y);
    return this.rails.filter(o => insideXY(o.sx, o.sy) && insideXY(o.ex, o.ey));
  }

  findByXY(x: number, y: number): IRail[] {
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

    return this.rails.filter(obj =>
      obj.radius ? pointInArc(x, y, obj) : pointInLine(x, y, obj)
    );
  }

  deselect() {
    this.forEach(v => (v.meta.selected = false));
    this.dirty = true;
  }

  select(selection: IRail[]) {
    selection.forEach(v => (v.meta.selected = true));
    this.dirty = true;
  }

  deleteSelected() {
    let ids = this.rails.filter(i => i.meta.selected).map(i => i.meta.id);
    ids = ids.concat(ids.map(i => i + 1)); // add reverse links

    // remove from rail storage
    this.rails = this.rails.filter(i => !i.meta.selected);

    ids.forEach(id => {
      // remove from index, should use lodash.partition instead
      this.railsIndex.delete(id);

      // remove from joins and switches
      this.joins = this.joins.filter(i => !i.includes(id));
      this.switches = this.switches.filter(i => !i.includes(id));

      // remove from connections
      this.connections.forEach(i => {
        i.items = i.items.filter(v => v !== id);
      });
    });
    // delete empty connections
    this.connections = this.connections.filter(i => i.items.length);
    this.dirty = true;
  }

  selectGroup(selection: IRail[]) {
    this.select(selection);
    const selected = this.rails.filter(i => i.meta.selected);
    const deselected = this.rails.filter(i => !i.meta.selected);
    selected.forEach(s => {
      deselected.forEach(
        d => s.meta.block === d.meta.block && (d.meta.selected = true)
      );
    });
    this.dirty = true;
  }

  group() {
    const groupBlockId = this.blockId++;
    this.rails
      .filter(v => v.meta.selected)
      .map(v => (v.meta.block = groupBlockId));
    // this.deselect();
    this.dirty = true;
  }

  ungroup() {
    this.rails
      .filter(v => v.meta.selected)
      .map(v => {
        const groupBlockId = this.blockId++;
        v.meta.block = groupBlockId;
      });
    this.deselect();
    this.dirty = true;
  }

  reindexBlocks() {
    this.blockId = 1;
    const indices: Map<number, number> = new Map();

    this.rails.forEach(v => {
      const curr = v.meta.block;
      if (!indices.has(curr)) {
        indices.set(curr, this.blockId++);
      }
    });

    this.rails.forEach(v => {
      v.meta.block = indices.get(v.meta.block);
    });
    this.dirty = true;
  }

  reindexRails() {
    throw "Not implemented";

    this.objectId = 2;
    const indices: Map<number, number> = new Map();

    this.rails.forEach(v => {
      const curr = v.meta.id;
      if (!indices.has(curr)) {
        indices.set(curr, this.objectId);
        indices.set(curr + 1, this.objectId + 1);
        this.objectId += 2;
      }
    });

    this.rails.forEach(v => {
      v.meta.id = indices.get(v.meta.id);
    });

    this.connections.forEach(c => {
      c.items = c.items.map(i => indices.get(i) || 0);
    });

    this.switches = this.switches.map(s => s.map(i => indices.get(i) || 0));

    this.joins = this.joins.map(
      j => [indices.get(j[0]) || 0, indices.get(j[1]) || 0] as IJoin
    );
    this.dirty = true;
  }

  findJoin(id: number) {
    return this.joins.find(j => (j[0] & magic) === id || (j[1] & magic) === id);
  }

  findSwitch(id: number) {
    return this.switches.find(v => v.map(i => i & magic).includes(id));
  }

  getSelectedIds(): number[] {
    return this.rails
      .filter(v => v.meta.selected)
      .map(v => v.meta.id)
      .sort();
  }

  getAdjacentEndpoints(ids: number[]): number[] {
    // converting object id to points id here
    // objects have odd ids, points: start = id, end = id + 1
    const connection = Object.values(this.connections).find(v =>
      includesAll(ids, v.items.map(i => i & magic))
    );

    return connection
      ? connection.items.filter(i => ids.includes(i & magic))
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
    this.joins.push([a, b]);
    this.deselect();
    this.dirty = true;
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
    this.switches.push(sw);
    this.deselect();
    this.dirty = true;
    return true;
  }

  setSwitchSegmentType(newType: number) {
    if (newType < 0 || newType > 3) {
      throw new Error("Invalid switch segment type");
    }

    const selection = this.getSelectedIds();
    if (selection.length === 1) {
      const sw = this.findSwitch(selection[0]);
      const oldType = sw.findIndex(i => (i & magic) === selection[0]);
      const tmp = sw[newType];
      sw[newType] = sw[oldType];
      sw[oldType] = tmp;
    }
    this.dirty = true;
  }

  // objects
  addGameObject(x: number, y: number): IGameObject {
    const o: IGameObject = {
      x,
      y,
      type: "none",
      zindex: 0
    };

    this.gameobjects.push(o);
    this.dirty = true;
    return o;
  }

  cloneGameObject(): IGameObject {
    if (this.selectedGameObject) {
      const clone = { ...this.selectedGameObject };
      this.gameobjects.push(clone);
      this.dirty = true;
      return clone;
    }
  }

  deleteSelectedGameObject() {
    if (this.selectedGameObject) {
      this.selectedGameObject.points !== 0 &&
        this.gameobjectpoints.delete(this.selectedGameObject.points);

      this.gameobjects = this.gameobjects.filter(
        o => o !== this.selectedGameObject
      );
      this.dirty = true;
    }
  }

  findGameObjectByXY(x: number, y: number) {
    const d = 1.28 * 0.5;
    return this.gameobjects.find(
      o => inside(x, o.x - d, o.x + d) && inside(y, o.y - d, o.y + d)
    );
  }

  private bring(forward: boolean) {
    if (this.selectedGameObject) {
      const index = this.gameobjects.indexOf(this.selectedGameObject);
      const removed = this.gameobjects.splice(index, 1);
      forward
        ? this.gameobjects.push(removed[0])
        : this.gameobjects.unshift(removed[0]);
      this.dirty = true;
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
    const pid = this.selectedGameObject.points;
    const points = this.gameobjectpoints.get(pid);

    return points.findIndex(p => distance(x, y, p.x, p.y) < MIN_DISTANCE);
  }

  movePoint(x: number, y: number) {
    const index = this.selectedPointIndex;
    if (index === -1) {
      return;
    }
    const pid = this.selectedGameObject.points;
    const points = this.gameobjectpoints.get(pid);
    points[index].x = x;
    points[index].y = y;
    this.dirty = true;
  }

  addPoint(x: number, y: number) {
    const pid = this.selectedGameObject.points;
    const points = this.gameobjectpoints.get(pid);
    points.push(new Point(x, y));
    this.dirty = true;
  }

  deletePoint() {
    const index = this.selectedPointIndex;
    if (index === -1) {
      return;
    }
    const pid = this.selectedGameObject.points;
    const points = this.gameobjectpoints.get(pid);
    points.length > 2 && points.splice(index, 1);
    this.dirty = true;
  }

  splitPoint() {
    const index = this.selectedPointIndex;
    if (index === -1) {
      return;
    }
    const pid = this.selectedGameObject.points;
    const points = this.gameobjectpoints.get(pid);

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
    this.dirty = true;
  }

  splitInterpolate() {
    const index = this.selectedPointIndex;
    if (index === -1) {
      return;
    }
    const pid = this.selectedGameObject.points;
    const points = this.gameobjectpoints.get(pid);
    if (points.length < 5) {
      console.log("Not enough points");
      return;
    }

    if (index < 2 || index > points.length - 2) {
      console.log("Cant interpolate at this point");
      return;
    }
    const pointArr = points.slice(index - 2, index + 2).map(p => [p.x, p.y]);
    const options = { samples: 3, knot: 0.5 };

    const spline = catRomSpline;
    const interpolated: number[][] = spline(pointArr, options);
    const newPoints = interpolated.map(([x, y]) => new Point(x, y));
    points.splice(index, 0, ...newPoints.slice(1, newPoints.length - 2));
    this.selectedPointIndex = -1;
    this.dirty = true;
  }

  createDefaultPoints() {
    const d = 1.28 * 0.5 * 1.2;
    let points: Point[] = [];
    const { x, y, type } = this.selectedGameObject;
    if (type === "rope") {
      points.push(new Point(x, y + d));
      points.push(new Point(x, y - d));
    } else {
      points.push(new Point(x - d, y - d));
      points.push(new Point(x - d, y + d));
      points.push(new Point(x + d, y + d));
      points.push(new Point(x + d, y - d));
    }

    this.gameobjectpoints.set(this.pointId, points);
    this.selectedGameObject.points = this.pointId;
    this.pointId++;
    this.dirty = true;
  }

  // finder:
  // this.model.selectedGameObject = (this.model.gameobjects).filter(i => i.type==='rope' && i.texture == 'road.png')[0]
}
