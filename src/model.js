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
    this.store = new Map();
    this.connections = new Map();

    // horizontal lines:
    //     -  0x10 left right
    // \  0x11 top bottom (r to l!)
    // /  0x12 top bottom
    this.allowedConnections = [
      //  <- ->
      {
        left: [0x10, 0x21, 0x31, 0x23, 0x40],
        right: [0x10, 0x20, 0x30, 0x41, 0x24],
        dirL: [1, -1, -1, 1, 1],
        dirR: [1, -1, -1, 1, 1]
      },
      // /v  /^
      {
        left: [0x12, 0x20, 0x43, 0x32, 0x22],
        right: [0x12, 0x25, 0x42, 0x23, 0x33]
      },
      // \v \^
      {
        left: [0x11, 0x25, 0x35, 0x21, 0x44],
        right: [0x11, 0x24, 0x22, 0x34, 0x45]
      },
      {
        left: [0x33],
        right: [0x43]
      },
      {
        left: [0x42],
        right: [0x32]
      },
      {
        left: [0x41],
        right: [0x31]
      },
      {
        left: [0x30],
        right: [0x40]
      },
      {
        left: [0x44],
        right: [0x34]
      },
      {
        left: [0x35],
        right: [0x45]
      }
    ];
  }

  distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
  }

  connectDots(obj, v, x1, y1) {
    // find out if we are left ot right? to do this:
    // find what we are connecting to. get pair from table -> decide
    // create/add to connection
    // generator table rl

    this.allowedConnections.forEach(pairList => {
      const r_index = pairList.right.indexOf(obj.type);
      if (r_index !== -1) {
        // joining right
        const x = Math.floor(x1 / MIN_DISTANCE) * MIN_DISTANCE;
        const y = Math.floor(y1 / MIN_DISTANCE) * MIN_DISTANCE;
        const key = `${x}-${y}`;
        const curr = this.connections.get(key) || [];

        // check v is on list
        const l_index = pairList.left.indexOf(v.type);
        if (l_index != -1) {
          // todo: fill direction
          curr.push(v, obj);
          this.connections.set(key, curr);
        }
      }
    });
  }

  createConnections(obj) {
    // TODO: neighbours only

    const distance = this.distance;
    this.store.forEach(v => {
      if (distance(obj.sx, obj.sy, v[0].sx, v[0].sy) < MIN_DISTANCE) {
        console.log("A");
        this.connectDots(obj, v[0], obj.sx, obj.sy);
      }
      if (distance(obj.sx, obj.sy, v[0].ex, v[0].ey) < MIN_DISTANCE) {
        console.log("B");
        this.connectDots(obj, v[0], obj.sx, obj.sy);
      }
      if (distance(obj.ex, obj.ey, v[0].sx, v[0].sy) < MIN_DISTANCE) {
        console.log("C");
        this.connectDots(obj, v[0], obj.ex, obj.ey);
      }
      if (distance(obj.ex, obj.ey, v[0].ex, v[0].ey) < MIN_DISTANCE) {
        console.log("D");
        this.connectDots(obj, v[0], obj.ex, obj.ey);
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
      const hexCell = this.store.get(key) || [];
      const selected = false;
      o.meta = { x, y, key, selected };
      hexCell.push(o);
      // this.createConnections(o);
      this.store.set(key, hexCell);
    });
  }

  forEach(fn) {
    this.store.forEach(i => i.forEach(j => fn(j)));
  }

  flat() {
    const flatMap = arr => {
      let accu = [];
      arr && arr.forEach(i => i.forEach(j => (accu[accu.length] = j)));
      return accu;
    };
    return flatMap(Array.from(this.store));
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
      o => (insideXY(o.sx, o.sy) || insideXY(o.ex, o.ey)) && results.push(o)
    );
  }

  findByXY(x, y) {
    const threshold = 10;
    const results = [];

    const pi2 = 2 * Math.PI;
    const normalize = angle => ((angle % pi2) + pi2) % pi2;
    const inside = (x, a, b) => a < x && x < b;

    this.forEach(obj => {
      if (obj.radius) {
        const angle = Math.atan2(y - obj.y, x - obj.x);
        const radius = this.distance(x, y, obj.x, obj.y);
        // check if within sector and close to radius
        if (
          inside(normalize(angle), obj.a1, obj.a2) &&
          Math.abs(radius - obj.radius) < threshold
        ) {
          results.push(obj);
        }
      } else {
        const angle = Math.atan2(obj.ey - obj.sy, obj.ex - obj.sx);
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
}
