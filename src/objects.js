export default class Objects {
  getCorners(hex) {
    const point = hex.toPoint();
    return hex.corners().map(corner => corner.add(point));
  }

  getTriangleCorners(hex) {
    return this.getCorners(hex).filter((v, i) => i % 2 === 1);
  }

  // getInverseTriangleCorners(hex) {
  //   return getCorners(hex).filter((v, i) => i % 2 === 0);
  // }

  line(hex, index) {
    const corners = this.getTriangleCorners(hex);
    const pairs = [[1, 0], [2, 0], [2, 1]];
    const [a, b] = pairs[index];

    return {
      sx: corners[a].x,
      sy: corners[a].y,
      ex: corners[b].x,
      ey: corners[b].y,
      type: 0x10 + index
    };
  }

  longArc(hex, index) {
    const corners = this.getTriangleCorners(hex);
    const pairs = [[2, 0], [2, 1], [0, 1], [0, 2], [1, 2], [1, 0]];
    const arc = Math.PI / 3;

    const rot1 = (2 / 3) * Math.PI; // one third of the circle - 120 deg
    const rot2 = (4 / 3) * Math.PI;
    const vectors = [0, 0, rot1, rot1, rot2, rot2];

    const angles = [0, 1, 2, 3, 4, 5]
      .map(v => Math.PI / 2 + vectors[v])
      .map((v, i) => (i % 2 === 0 ? [v - arc, v] : [v, v + arc]));

    const [a, b] = pairs[index];
    const [a1, a2] = angles[index];
    const radius = 3 * hex.size;
    const center = corners[a].add(corners[a].subtract(corners[b]));
    const { x, y } = center;

    const sx = x + radius * Math.cos(a1);
    const sy = y + radius * Math.sin(a1);
    const ex = x + radius * Math.cos(a2);
    const ey = y + radius * Math.sin(a2);
    return { x, y, radius, a1, a2, sx, sy, ex, ey, type: 0x20 + index };
  }

  shortArc(hex, index) {
    const corners = this.getTriangleCorners(hex);
    const points = [1, 0, 2, 1, 0, 2];
    const radius = 3.5 * hex.size; // magic1
    const arc = 2 / 3; // magic2

    const rot1 = (2 / 3) * Math.PI;
    const rot2 = (4 / 3) * Math.PI;
    const vectors = [0, 0, rot1, rot1, rot2, rot2];

    const angles = [0, 1, 2, 3, 4, 5]
      .map(v => Math.PI / 2 + vectors[v])
      .map((v, i) => (i % 2 === 0 ? [v - arc, v] : [v, v + arc]));

    const p = points[index];
    const [a1, a2] = angles[index];
    const center = corners[p].add({
      x: radius * Math.sin(vectors[index]),
      y: -radius * Math.cos(vectors[index])
    });
    const { x, y } = center;

    const sx = x + radius * Math.cos(a1);
    const sy = y + radius * Math.sin(a1);
    const ex = x + radius * Math.cos(a2);
    const ey = y + radius * Math.sin(a2);
    return { x, y, radius, a1, a2, sx, sy, ex, ey, type: 0x30 + index };
  }

  shortArc2(hex, index) {
    const corners = this.getTriangleCorners(hex);
    const points = [2, 2, 0, 0, 1, 1];
    const radius = 3.5 * hex.size; // magic1
    const arc = 2 / 3; // magic2

    const rot1 = (2 / 3) * Math.PI;
    const rot2 = (4 / 3) * Math.PI;
    const vectors = [0, 0, rot1, rot1, rot2, rot2];

    const angles = [0, 1, 2, 3, 4, 5]
      .map(v => -Math.PI / 2 + vectors[v])
      .map((v, i) => (i % 2 === 0 ? [v - arc, v] : [v, v + arc]));
    // .map(v => [0, 6]);

    const p = points[index];
    const [a1, a2] = angles[index];
    const center = corners[p].add({
      x: -radius * Math.sin(vectors[index]),
      y: radius * Math.cos(vectors[index])
    });
    const { x, y } = center;

    const sx = x + radius * Math.cos(a1);
    const sy = y + radius * Math.sin(a1);
    const ex = x + radius * Math.cos(a2);
    const ey = y + radius * Math.sin(a2);
    return { x, y, radius, a1, a2, sx, sy, ex, ey, type: 0x40 + index };
  }
}
