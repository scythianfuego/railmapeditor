import { Hex } from "./transform";
import IRailObject from "./interfaces/IRailObject";
import IConnection from "./interfaces/IConnection";
import ISwitch from "./interfaces/ISwitch";
import LZString from "lz-string";

const magic = 0x7ffffffe;

const MIN_DISTANCE = 0.1;
const distance = (x1: number, y1: number, x2: number, y2: number) =>
  Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));

const includesAll = (needle: number[], haystack: number[]) =>
  needle.every(v => haystack.includes(v));

type ConnectionMap = {
  [index: string]: IConnection;
};

export default class Model {
  public selectedConnection: IConnection = null;
  public connections: IConnection[] = []; // TODO: remove public access
  public switches: ISwitch[] = [];
  public joins: IJoin[] = [];

  private store: IRailObject[] = [];
  private storeIndex = new Map();
  private blockId = 1;
  private connectionId = 1;
  private objectId = 2; // odd id means start of segment, even - end

  public distance: (x1: number, y1: number, x2: number, y2: number) => number;

  constructor() {
    this.distance = distance;
  }

  export() {
    return JSON.stringify({
      rails: this.store.map(i => ({
        id: i.meta.id,
        block: i.meta.block,
        type: i.type,
        sx: i.sx,
        sy: i.sy,
        ex: i.ex,
        ey: i.ey,
        x: i.x,
        y: i.y,
        a1: i.a1,
        a2: i.a2,
        radius: i.radius
      })),
      switches: this.switches,
      joins: this.joins
    });
  }

  serialize() {
    return LZString.compressToUTF16(
      JSON.stringify({
        store: this.store,
        blockId: this.blockId,
        objectId: this.objectId,
        connections: this.connections,
        switches: this.switches,
        joins: this.joins
      })
    );
  }

  unserialize(data: string) {
    const obj = JSON.parse(LZString.decompressFromUTF16(data));
    this.store = obj.store;
    this.blockId = obj.blockId;
    this.objectId = obj.objectId;
    this.connections = obj.connections;
    this.switches = obj.switches;
    this.joins = obj.joins;

    //reindex
    this.storeIndex = new Map();
    this.store.forEach(v => this.storeIndex.set(v.meta.id, v));
  }

  makeConnection(pointId: number, x: number, y: number) {
    const id = this.connectionId++;
    this.connections.push({ x, y, items: [pointId] });
  }

  addToConnection(pointId: number, connection: IConnection) {
    !connection.items.includes(pointId) && connection.items.push(pointId);
    connection.items.sort();
  }

  findConnection(x: number, y: number) {
    return this.connections.find(v => distance(x, y, v.x, v.y) < MIN_DISTANCE);
  }

  createConnections(obj: IRailObject) {
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

  add(cell: Hex, obj: IRailObject) {
    if (!obj) {
      return;
    }

    const { x, y } = cell;
    const selected = false;
    const id = this.objectId;
    this.objectId += 2;
    const block = this.blockId++;
    obj.meta = { id, x, y, selected, block };
    this.createConnections(obj);
    this.store.push(obj);
    this.storeIndex.set(id, obj);
  }

  get(pointId: number): IRailObject {
    return this.storeIndex.get(pointId & magic);
  }

  forEach(fn: (i: IRailObject) => void) {
    this.store.forEach(i => fn(i));
  }

  findByRect(sx: number, sy: number, ex: number, ey: number): IRailObject[] {
    // check if endpoints are within rectangle
    const lx = Math.min(sx, ex);
    const rx = Math.max(sx, ex);
    const ly = Math.min(sy, ey);
    const ry = Math.max(sy, ey);
    const inside = (x: number, a: number, b: number) => a < x && x < b;
    const insideX = (x: number) => inside(x, lx, rx);
    const insideY = (y: number) => inside(y, ly, ry);
    const insideXY = (x: number, y: number) => insideX(x) && insideY(y);
    return this.store.filter(o => insideXY(o.sx, o.sy) && insideXY(o.ex, o.ey));
  }

  findByXY(x: number, y: number): IRailObject[] {
    const TAU = 2 * Math.PI;
    const normalize = (angle: number) => ((angle % TAU) + TAU) % TAU;
    const inside = (x: number, a: number, b: number) => a < x && x < b;

    const pointInArc = (x: number, y: number, obj: IRailObject) => {
      // check if within sector and close to radius
      const angle = normalize(Math.atan2(y - obj.y, x - obj.x));
      const radius = distance(x, y, obj.x, obj.y);
      const withinAngle = inside(angle, obj.a1, obj.a2);
      const closeToRadius = Math.abs(radius - obj.radius) < MIN_DISTANCE;
      return withinAngle && closeToRadius;
    };

    const pointInLine = (x: number, y: number, obj: IRailObject) => {
      // check if distance to endpoints matches segment length
      const ab = distance(obj.ex, obj.ey, x, y);
      const bc = distance(obj.sx, obj.sy, x, y);
      const ac = distance(obj.sx, obj.sy, obj.ex, obj.ey);
      return Math.abs(ab + bc - ac) < MIN_DISTANCE;
    };

    return this.store.filter(obj =>
      obj.radius ? pointInArc(x, y, obj) : pointInLine(x, y, obj)
    );
  }

  deselect() {
    this.forEach(v => (v.meta.selected = false));
  }

  select(selection: IRailObject[]) {
    selection.forEach(v => (v.meta.selected = true));
  }

  deleteSelected() {
    // remove from index, should use lodash.partition instead
    this.store
      .filter(i => i.meta.selected)
      .forEach(v => this.storeIndex.delete(v.meta.id));

    this.store = this.store.filter(i => !i.meta.selected);
  }

  selectGroup(selection: any[]) {
    this.select(selection);
    const selected = this.store.filter(i => i.meta.selected);
    const deselected = this.store.filter(i => !i.meta.selected);
    selected.forEach(s => {
      deselected.forEach(
        d => s.meta.block === d.meta.block && (d.meta.selected = true)
      );
    });
  }

  group() {
    const groupBlockId = this.blockId++;
    this.store
      .filter(v => v.meta.selected)
      .map(v => (v.meta.block = groupBlockId));
    // this.deselect();
  }

  ungroup() {
    this.store
      .filter(v => v.meta.selected)
      .map(v => {
        const groupBlockId = this.blockId++;
        v.meta.block = groupBlockId;
      });
    this.deselect();
  }

  findJoin(id: number) {
    return this.joins.find(j => (j[0] & magic) === id || (j[1] & magic) === id);
  }

  findSwitch(id: number) {
    return this.switches.find(v => v.map(i => i & magic).includes(id));
  }

  getSelectedIds(): number[] {
    return this.store
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
    return true;
  }

  switchToObject(sw: ISwitch) {
    return {
      AP: sw[0],
      AS: sw[1],
      BP: sw[2],
      BS: sw[3]
    };
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
  }
}
