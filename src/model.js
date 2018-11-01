// не пытаться разбирать левел обратно - сериализовать данные и сделать экспорт
// упростить парсер в игре по максимумуму - отрезок - следующий, откуда считать

// ES
// SS
// EE
// SE

// аналогично, соединять в редакторе точки а не типы. пофиг на тип
// убрать модель с "что с чем коннектится" - точки совпали = коннектится

const MIN_DISTANCE = 5;

export default class Model {
  constructor() {
    this.store = [];
    this.connections = {};
    this.switches = [];
    this.blockId = 1;
    this.objectId = 1;

    // horizontal lines:
    //     -  0x10 left right
    // \  0x11 top bottom (r to l!)
    // /  0x12 top bottom
    // this.allowedConnections = [
    //   //  <- ->
    //   {
    //     left: [0x10, 0x21, 0x31, 0x23, 0x40],
    //     right: [0x10, 0x20, 0x30, 0x41, 0x24],
    //     dirL: [1, -1, -1, 1, 1],
    //     dirR: [1, -1, -1, 1, 1]
    //   },
    //   // /v  /^
    //   {
    //     left: [0x12, 0x20, 0x43, 0x32, 0x22],
    //     right: [0x12, 0x25, 0x42, 0x23, 0x33]
    //   },
    //   // \v \^
    //   {
    //     left: [0x11, 0x25, 0x35, 0x21, 0x44],
    //     right: [0x11, 0x24, 0x22, 0x34, 0x45]
    //   },
    //   {
    //     left: [0x33],
    //     right: [0x43]
    //   },
    //   {
    //     left: [0x42],
    //     right: [0x32]
    //   },
    //   {
    //     left: [0x41],
    //     right: [0x31]
    //   },
    //   {
    //     left: [0x30],
    //     right: [0x40]
    //   },
    //   {
    //     left: [0x44],
    //     right: [0x34]
    //   },
    //   {
    //     left: [0x35],
    //     right: [0x45]
    //   }
    // ];
  }

  distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
  }

  // connectDots(obj, v, x1, y1) {
  //   // find out if we are left ot right? to do this:
  //   // find what we are connecting to. get pair from table -> decide
  //   // create/add to connection
  //   // generator table rl

  //   this.allowedConnections.forEach(pairList => {
  //     const r_index = pairList.right.indexOf(obj.type);
  //     if (r_index !== -1) {
  //       // joining right
  //       const x = Math.floor(x1 / MIN_DISTANCE) * MIN_DISTANCE;
  //       const y = Math.floor(y1 / MIN_DISTANCE) * MIN_DISTANCE;
  //       const key = `${x}-${y}`;
  //       const curr = this.connections.get(key) || [];

  //       // check v is on list
  //       const l_index = pairList.left.indexOf(v.type);
  //       if (l_index != -1) {
  //         // todo: fill direction
  //         curr.push(v, obj);
  //         this.connections.set(key, curr);
  //       }
  //     }
  //   });
  // }

  makeConnection(id, x, y) {
    x |= 0;
    y |= 0;
    const key = `${x}-${y}`;
    if (!this.connections[key]) {
      this.connections[key] = {
        x,
        y,
        items: []
      };
    } else {
      throw "Unexpected connection";
    }
    const items = this.connections[key].items;
    if (!items.includes(id)) {
      items.push(id);
    }
  }

  addToConnection(connection, id) {
    !connection.items.includes(id) && connection.items.push(id);
  }

  createConnections(obj) {
    //let uniq = a => [...new Set(a)];

    const distance = this.distance;
    const findConnection = (x, y) =>
      Object.values(this.connections).find(
        v => distance(x, y, v.x, v.y) < MIN_DISTANCE
      );

    const id = obj.meta.id;
    const points = [[obj.sx, obj.sy], [obj.ex, obj.ey]];

    points.forEach(([x, y]) => {
      const connection = findConnection(x, y);
      if (connection) {
        this.addToConnection(connection, id);
      } else {
        this.makeConnection(id, x, y);
      }
    });
  }

  add(cell, obj) {
    if (!obj) {
      return;
    }

    obj = Array.isArray(obj) ? obj : [obj];
    obj.forEach(o => {
      const { x, y } = cell;
      const key = `${x},${y}`;
      const selected = false;
      const id = this.objectId++;
      const block = this.blockId++;
      o.meta = { id, x, y, key, selected, block };
      this.createConnections(o);
      this.store.push(o);
    });
  }

  forEach(fn) {
    this.store.forEach(i => fn(i));
  }

  findByRect(sx, sy, ex, ey) {
    const lx = Math.min(sx, ex);
    const rx = Math.max(sx, ex);
    const ly = Math.min(sy, ey);
    const ry = Math.max(sy, ey);
    const results = [];
    const inside = (x, a, b) => a < x && x < b;
    const insideX = x => inside(x, lx, rx);
    const insideY = y => inside(y, ly, ry);
    const insideXY = (x, y) => insideX(x) && insideY(y);
    this.forEach(
      o => insideXY(o.sx, o.sy) && insideXY(o.ex, o.ey) && results.push(o)
    );
    return results;
  }

  findByXY(x, y) {
    const threshold = 10;
    const results = [];
    let angle;

    const pi2 = 2 * Math.PI;
    const normalize = angle => ((angle % pi2) + pi2) % pi2;
    const inside = (x, a, b) => a < x && x < b;

    this.forEach(obj => {
      if (obj.radius) {
        angle = Math.atan2(y - obj.y, x - obj.x);
        const radius = this.distance(x, y, obj.x, obj.y);
        // check if within sector and close to radius
        if (
          inside(normalize(angle), obj.a1, obj.a2) &&
          Math.abs(radius - obj.radius) < threshold
        ) {
          results.push(obj);
        }
      } else {
        angle = Math.atan2(obj.ey - obj.sy, obj.ex - obj.sx);
        // rotate bounding box and check if the point is inside
        const ex = (obj.ex - obj.sx) * Math.cos(angle);
        const ey = (obj.ey - obj.sy) * Math.cos(angle) + threshold;
        const px = (x - obj.sx) * Math.cos(angle);
        const py = (y - obj.sy) * Math.cos(angle) + threshold * 0.5;

        if (inside(px, 0, ex) && inside(py, 0, ey)) {
          results.push(obj);
        }
      }
    });
    return results;
  }

  deselect() {
    this.forEach(v => (v.selected = false));
  }

  select(selection) {
    selection.forEach(v => (v.selected = true));
  }

  deleteSelected() {
    this.store = this.store.filter(i => !i.selected);
  }

  selectGroup(selection) {
    this.select(selection);
    const selected = this.store.filter(i => i.selected);
    const deselected = this.store.filter(i => !i.selected);
    selected.forEach(s => {
      deselected.forEach(
        d => s.meta.block === d.meta.block && (d.selected = true)
      );
    });
  }

  group() {
    const groupBlockId = this.blockId++;
    this.store.filter(v => v.selected).map(v => (v.meta.block = groupBlockId));
    // this.deselect();
  }

  ungroup() {
    this.store.filter(v => v.selected).map(v => {
      const groupBlockId = this.blockId++;
      v.meta.block = groupBlockId;
    });
    this.deselect();
  }
}
