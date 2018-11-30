import { Hex } from "./transform";
import IRailObject from "./interfaces/IRailObject";
import IConnection from "./interfaces/IConnection";
import ISwitch from "./interfaces/ISwitch";

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
  private objectId = 1;

  public distance: (x1: number, y1: number, x2: number, y2: number) => number;

  constructor() {
    this.distance = distance;
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
    const id = this.objectId++;
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
    let angle;

    const TAU = 2 * Math.PI;
    const normalize = (angle: number) => ((angle % TAU) + TAU) % TAU;
    const inside = (x: number, a: number, b: number) => a < x && x < b;

    return this.store.filter(obj => {
      if (obj.radius) {
        angle = normalize(Math.atan2(y - obj.y, x - obj.x));
        const radius = distance(x, y, obj.x, obj.y);
        // check if within sector and close to radius
        return (
          inside(angle, obj.a1, obj.a2) &&
          Math.abs(radius - obj.radius) < threshold
        );
      } else {
        angle = Math.atan2(obj.ey - obj.sy, obj.ex - obj.sx);
        // rotate bounding box and check if the point is inside
        const ex = (obj.ex - obj.sx) * Math.cos(angle);
        const ey = (obj.ey - obj.sy) * Math.cos(angle) + threshold;
        const px = (x - obj.sx) * Math.cos(angle);
        const py = (y - obj.sy) * Math.cos(angle) + threshold * 0.5;

        return inside(px, 0, ex) && inside(py, 0, ey);
      }
    });
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
    // return this.switches.find(j => j.left === id || j.right === id) ||;
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
      const sw: ISwitch = {
        mainA: selection[0],
        secondaryA: selection[1],
        mainB: selection[2],
        secondaryB: selection[3] || null
      };
      this.switches.push(sw);
      this.deselect();
      return true;
    }
  }
}
