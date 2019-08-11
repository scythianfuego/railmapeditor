import ts, { Hex } from "./transform";
import IRail from "./interfaces/IRail";

export default class Objects {
  getTriangleCorners(hex: Hex) {
    // triangle corners are: 0 - right, 1 - left, 2 - top
    return ts.getCorners(hex).filter((v, i) => i % 2 === 1);
  }

  // getInverseTriangleCorners(hex) {
  //   return getCorners(hex).filter((v, i) => i % 2 === 0);
  // }

  line(hex: Hex, index: number): IRail {
    const corners = this.getTriangleCorners(hex);
    const pairs = [[1, 0], [2, 0], [2, 1]];
    const [a, b] = pairs[index];

    return {
      sx: corners[a].x,
      sy: corners[a].y,
      ex: corners[b].x,
      ey: corners[b].y,
      type: 0x10 + index,
      radius: 0,
      x: 0,
      y: 0,
      a1: 0,
      a2: 0
    };
  }

  infiniLine(hex: Hex, index: number): IRail {
    const corners = this.getTriangleCorners(hex);
    const pairs = [[1, 0], [2, 0], [2, 1], [0, 1], [0, 2], [1, 2]];
    const [a, b] = pairs[index];
    let [sx, sy, ex, ey] = [
      corners[a].x,
      corners[a].y,
      corners[b].x,
      corners[b].y
    ];
    ex = (ex - sx) * 10 + ex;
    ey = (ey - sy) * 10 + ey;

    return {
      sx,
      sy,
      ex,
      ey,
      type: 0x10 + index,
      radius: 0,
      x: 0,
      y: 0,
      a1: 0,
      a2: 0
    };
  }

  baseArc(
    hex: Hex,
    index: number,
    radius: number,
    arc: number,
    baseType: number,
    inner: boolean = true
  ) {
    // triangle corners are: 0 - right, 1 - left, 2 - top
    const corners = this.getTriangleCorners(hex);
    const points = inner ? [1, 0, 2, 1, 0, 2] : [2, 2, 0, 0, 1, 1];
    const sign = inner ? 1 : -1;
    const baseAngle = (sign * Math.PI) / 2;

    const rot1 = (2 / 3) * Math.PI; // 120
    const rot2 = (4 / 3) * Math.PI; // 240
    const rotation = [0, 0, rot1, rot1, rot2, rot2];

    const angles = [0, 1, 2, 3, 4, 5]
      .map(v => baseAngle + rotation[v])
      .map((v, i) => (i % 2 === 0 ? [v - arc, v] : [v, v + arc]));

    const p = points[index];
    const [a1, a2] = angles[index];
    const center = corners[p].add({
      x: sign * radius * Math.sin(rotation[index]),
      y: -sign * radius * Math.cos(rotation[index])
    });
    const { x, y } = center;

    const sx = x + radius * Math.cos(a1);
    const sy = y + radius * Math.sin(a1);
    const ex = x + radius * Math.cos(a2);
    const ey = y + radius * Math.sin(a2);
    return { x, y, radius, a1, a2, sx, sy, ex, ey, type: baseType + index };
  }

  longArc(hex: Hex, index: number): IRail {
    const radius = 6 * hex.size;
    const arc = Math.PI / 3;
    return this.baseArc(hex, index, radius, arc, 0x20);
  }

  shortArc(hex: Hex, index: number): IRail {
    const radius = 3.5 * Math.sqrt(3); //3.5 * hex.size; // magic1
    const arc = 0.3802512067; // 1 / 3; magic2
    return this.baseArc(hex, index, radius, arc, 0x30);
  }

  shortArc2(hex: Hex, index: number): IRail {
    const radius = 3.5 * Math.sqrt(3); // 3.5 * hex.size; // magic1
    const arc = 0.3802512067; // 2*Math.acos(9 / sqrt(84)) //1 / 3; // magic2
    return this.baseArc(hex, index, radius, arc, 0x40, false);
  }
}
