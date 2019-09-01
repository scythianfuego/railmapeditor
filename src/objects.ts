import ts from "./transform";
import IRail from "./interfaces/IRail";

export default class Objects {
  baseLine(
    point: number[],
    index: number,
    length: number = 1,
    baseType: number
  ): IRail {
    const [sx, sy] = point;
    const rotation = (1 / 3) * Math.PI;
    const angles = [0, 1, 2, 3, 4, 5].map(v => v * rotation);
    const a = angles[index];
    const ex = sx + length * Math.cos(a);
    const ey = sy + length * Math.sin(a);

    return {
      sx,
      sy,
      ex,
      ey,
      type: baseType + index,
      radius: 0,
      x: 0,
      y: 0,
      a1: 0,
      a2: 0
    };
  }

  baseArc(
    point: number[],
    index: number,
    radius: number,
    arc: number,
    baseType: number,
    inner: boolean = true
  ) {
    const sign = inner ? 1 : -1;
    const baseAngle = (sign * Math.PI) / 2;

    const rot1 = (2 / 3) * Math.PI; // 120
    const rot2 = (4 / 3) * Math.PI; // 240
    const rotation = [0, 0, rot1, rot1, rot2, rot2];

    const angles = [0, 1, 2, 3, 4, 5]
      .map(v => baseAngle + rotation[v])
      .map((v, i) => (i % 2 === 0 ? [v - arc, v] : [v, v + arc]));

    const [px, py] = point;
    const [a1, a2] = angles[index];
    const x = px + sign * radius * Math.sin(rotation[index]);
    const y = py - sign * radius * Math.cos(rotation[index]);

    const sx = x + radius * Math.cos(a1);
    const sy = y + radius * Math.sin(a1);
    const ex = x + radius * Math.cos(a2);
    const ey = y + radius * Math.sin(a2);
    return { x, y, radius, a1, a2, sx, sy, ex, ey, type: baseType + index };
  }

  // tools here
  line(point: number[], index: number): IRail {
    return this.baseLine(point, index, 1, 0x10);
  }

  line2(point: number[], index: number): IRail {
    return this.baseLine(point, index, 2, 0x10);
  }

  line3(point: number[], index: number): IRail {
    return this.baseLine(point, index, 0.5, 0x10);
  }

  infiniLine(point: number[], index: number): IRail {
    return this.baseLine(point, index, 10, 0x10);
  }

  longArc(point: number[], index: number): IRail {
    const radius = 6 * ts.HEX_SIZE;
    const arc = Math.PI / 3;
    return this.baseArc(point, index, radius, arc, 0x20);
  }

  longArc2(point: number[], index: number): IRail {
    const radius = 6 * ts.HEX_SIZE;
    const arc = Math.PI / 6;
    return this.baseArc(point, index, radius, arc, 0x20);
  }

  longArc3(point: number[], index: number): IRail {
    const radius = 6 * ts.HEX_SIZE;
    const arc = Math.PI / 6;
    return this.baseArc(point, index, radius, arc, 0x20, false);
  }

  shortArc(point: number[], index: number): IRail {
    const radius = 3.5 * Math.sqrt(3); //3.5 * hex.size; // magic1
    const arc = 0.3802512067; // 1 / 3; magic2
    return this.baseArc(point, index, radius, arc, 0x30);
  }

  shortArc2(point: number[], index: number): IRail {
    const radius = 3.5 * Math.sqrt(3); // 3.5 * hex.size; // magic1
    const arc = 0.3802512067; // 2*Math.acos(9 / sqrt(84)) //1 / 3; // magic2
    return this.baseArc(point, index, radius, arc, 0x40, false);
  }

  arc2a(point: number[], index: number): IRail {
    // Each of two connected arcs has a radius
    //   R = A / SIN 2⋅α, where A = ½⋅w
    // and an arc length of 2⋅α

    // |..
    // | .  .                                   . .|
    // |  .    .                            . .    |
    // |   .  α   .                     . .        |
    // | α  .        . R            . .            |
    // |     .          .       . .                |
    // |      .            .  .                    |
    // |R      .         . .|                      | h
    // |        .    . .    |                      |
    // |         . .        |                      |
    // |     . .            |                      |
    // | . .  α       A     |                      |
    // _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ |
    //                      w

    // To quote redblobgames, (one) hexagon has width w = √3 * size and height h = 2 * size
    // We have a hexagon size = 1 / √3
    // w = 5 * √3 * size = 5
    // h = 1.5 * 2 * size = sqrt(3)
    // A = 2.5
    // α = atan2(h, w) = atan2(√3, 5)

    const alpha = Math.atan2(Math.sqrt(3), 5);
    const radius = 2.5 / Math.sin(2 * alpha);
    const arc = 2 * alpha;
    return this.baseArc(point, index, radius, arc, 0x40);
  }

  arc2b(point: number[], index: number): IRail {
    const alpha = Math.atan2(Math.sqrt(3), 5);
    const radius = 2.5 / Math.sin(2 * alpha);
    const arc = 2 * alpha;
    return this.baseArc(point, index, radius, arc, 0x40, false);
  }
}
