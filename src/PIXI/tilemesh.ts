import * as PIXI from "pixi.js";

export default class TileMesh extends PIXI.SimpleMesh {
  constructor(texture: PIXI.Texture, points: PIXI.Point[]) {
    const range = Array.from(Array(points.length).keys());
    const tesselated = TileMesh.tesselate(points);

    const vertices = new Float32Array(tesselated);
    const indices = new Uint16Array(range);
    const uvs = new Float32Array(
      TileMesh.getUVs(vertices, texture.width, texture.height)
    );

    texture.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;
    super(texture, vertices, uvs, indices, PIXI.DRAW_MODES.TRIANGLE_STRIP);
  }

  private update() {}

  private static getUVs(vertices: Float32Array, w: number, h: number) {
    const length = vertices.length;
    const uvs = new Float32Array(length);
    for (let i = 0; i < length; i += 2) {
      uvs[i] = vertices[i] / w;
      uvs[i + 1] = vertices[i + 1] / h;
    }
    return uvs;
  }

  private static tesselate(points: PIXI.Point[]): number[] {
    let i = 1;
    let j = points.length - 1;
    let left = false;
    let result = [points[0].x, points[0].y];

    while (i <= j) {
      if (left) {
        result.push(points[i].x, points[i].y);
        i++;
      } else {
        result.push(points[j].x, points[j].y);
        j--;
      }
      left = !left;
    }
    return result;
  }
}
