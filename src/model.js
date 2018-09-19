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
        right: [0x10, 0x20, 0x30, 0x41, 0x24]
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

  createConnections(obj) {
    // TODO: neighbours only
    const threshold = 5;
    const distance = this.distance;
    this.store.forEach(v => {
      if (distance(obj.sx, obj.sy, v.sx, v.sy) < threshold) {
        console.log("A");
      }
      if (distance(obj.sx, obj.sy, v.ex, v.ey) < threshold) {
        console.log("B");
      }
      if (distance(obj.ex, obj.ey, v.sx, v.sy) < threshold) {
        console.log("C");
      }
      if (distance(obj.ex, obj.ey, v.ex, v.ey) < threshold) {
        console.log("D");
      }
    });
  }

  add(cell, obj) {
    if (!obj) return;

    obj = Array.isArray(obj) ? obj : [obj];
    obj.forEach(o => {
      const key = `${cell.x}-${cell.y}`;

      o.meta = {
        x: cell.x,
        y: cell.y,
        key
      };
      const curr = this.store.get(key) || [];
      if (curr.length < 2) {
        this.createConnections(o); // TODO: front and rear only
        curr.push(o);
        this.store.set(key, curr);
      } else {
        console.log("too many lines here");
      }
    });
  }

  forEach(fn) {
    this.store.forEach(v => v.forEach(i => fn(i)));
  }
}
