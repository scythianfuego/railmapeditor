export class Objects {
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
      x1: corners[a].x,
      y1: corners[a].y,
      x2: corners[b].x,
      y2: corners[b].y,
      type: "line"
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

    return { x, y, radius, a1, a2, type: "long" };
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

    return { x, y, radius, a1, a2, type: "short" };
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

    return { x, y, radius, a1, a2, type: "short2" };
  }
}
