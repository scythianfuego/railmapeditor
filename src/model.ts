import { Hex } from "./transform";
import IRailObject from "./interfaces/IRailObject";
import IConnection from "./interfaces/IConnection";
import ISwitch from "./interfaces/ISwitch";
import LZString from "lz-string";

const MIN_DISTANCE = 5;
const distance = (x1: number, y1: number, x2: number, y2: number) =>
  Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));

const includesAll = (needle: number[], haystack: number[]) =>
  needle.every(v => haystack.includes(v));

type ConnectionMap = {
  [index: string]: IConnection;
};

export default class Model {
  public selectedConnection: IConnection = null;
  public connections: ConnectionMap = {}; // TODO: remove public access
  public switches: ISwitch[] = [];
  public joins: IJoin[] = [];

  private store: IRailObject[] = [];
  private storeIndex = new Map();
  private blockId = 1;
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

  makeConnection(id: number, x: number, y: number) {
    const [px, py] = [x, y];
    x |= 0;
    y |= 0;
    const key = `${x}-${y}`;
    if (!this.connections[key]) {
      this.connections[key] = { x, y, px, py, items: [] };
    } else {
      throw "Unexpected connection";
    }
    const items = this.connections[key].items;
    if (!items.includes(id)) {
      items.push(id);
    }
  }

  addToConnection(connection: IConnection, id: number) {
    !connection.items.includes(id) && connection.items.push(id);
    connection.items.sort();
  }

  findConnection(x: number, y: number) {
    return Object.values(this.connections).find(
      v => distance(x, y, v.x, v.y) < MIN_DISTANCE
    );
  }

  createConnections(obj: IRailObject) {
    const id = obj.meta.id;
    const points = [[obj.sx, obj.sy], [obj.ex, obj.ey]];

    points.forEach(([x, y]) => {
      const connection = this.findConnection(x, y);
      connection
        ? this.addToConnection(connection, id)
        : this.makeConnection(id, x, y);
    });
  }

  add(cell: Hex, obj: IRailObject) {
    if (!obj) {
      return;
    }

    const { x, y } = cell;
    const key = `${x},${y}`;
    const selected = false;
    const id = this.objectId;
    this.objectId += 2;
    const block = this.blockId++;
    obj.meta = { id, x, y, key, selected, block };
    this.createConnections(obj);
    this.store.push(obj);
    this.storeIndex.set(id, obj);
  }

  get(id: number): IRailObject {
    return this.storeIndex.get(id);
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
    const threshold = 10;
    const TAU = 2 * Math.PI;
    const normalize = (angle: number) => ((angle % TAU) + TAU) % TAU;
    const inside = (x: number, a: number, b: number) => a < x && x < b;

    const pointInArc = (x: number, y: number, obj: IRailObject) => {
      // check if within sector and close to radius
      const angle = normalize(Math.atan2(y - obj.y, x - obj.x));
      const radius = distance(x, y, obj.x, obj.y);
      const withinAngle = inside(angle, obj.a1, obj.a2);
      const closeToRadius = Math.abs(radius - obj.radius) < threshold;
      return withinAngle && closeToRadius;
    };

    const pointInLine = (x: number, y: number, obj: IRailObject) => {
      // check if distance to endpoints matches segment length
      const ab = distance(obj.ex, obj.ey, x, y);
      const bc = distance(obj.sx, obj.sy, x, y);
      const ac = distance(obj.sx, obj.sy, obj.ex, obj.ey);
      return Math.abs(ab + bc - ac) < threshold;
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

  //   click select - найти в стрелке/соединении. rectangle - игнорировать стрелки/соединения
  // выделено - соединить - кнопки если 2 - соединение или 3-4 стрелка
  // выделено -создать -> найти общий коннекшн для группы id.
  // если стрелка выделена, повторный клик по ней же выделяет ребра
  findJoinById(id: number) {
    // todo: define join obj
    return this.joins.find(j => j[0] === id || j[0] === id);
  }

  findSwitch(id: number) {
    return this.switches.find(v => v.includes(id));
  }

  getSelectedIds(): number[] {
    return this.store
      .filter(v => v.meta.selected)
      .map(v => v.meta.id)
      .sort();
  }

  checkAdjacent(ids: number[]) {
    return !!Object.values(this.connections).find(v =>
      includesAll(ids, v.items)
    );
  }

  createJoinFromSelection(): boolean {
    const selection = this.getSelectedIds();
    if (selection.length == 2 && this.checkAdjacent(selection)) {
      const [a, b] = selection;
      this.joins.push([a, b]);
      this.deselect();
      return true;
    }

    return false;
  }

  createSwitchFromSelection() {
    const selection = this.getSelectedIds();
    if ([3, 4].includes(selection.length) && this.checkAdjacent(selection)) {
      let sw: ISwitch = <ISwitch>[0, 0, 0, 0].map((v, i) => selection[i] || 0);
      this.switches.push(sw);
      this.deselect();
      return true;
    }
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
      const oldType = sw.indexOf(selection[0]);
      const tmp = sw[newType];
      sw[newType] = sw[oldType];
      sw[oldType] = tmp;
    }
  }
}
