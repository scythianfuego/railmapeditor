import * as PIXI from "pixi.js";

export default class POT {
  constructor(atlas: PIXI.ITextureDictionary) {
    this.makePOT(atlas);
    this.makeHPOT(atlas);
  }

  // copypaste from rail. make pixi plugin?
  private makePOT(atlas: PIXI.ITextureDictionary) {
    const pot = Object.keys(atlas).filter((i) => i.endsWith("_t.png"));
    pot.forEach((name) => {
      const tex = atlas[name];
      const res = tex.baseTexture.resource as PIXI.resources.ImageResource;
      const image: HTMLImageElement = res.source as HTMLImageElement;
      const { x, y, width, height } = tex.frame;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas
        .getContext("2d")
        .drawImage(image, x, y, width, height, 0, 0, width, height);

      name = name.replace("_t.png", "").replace("_h.png", "") + ".png";
      const baseTexture = new PIXI.BaseTexture(
        new PIXI.resources.CanvasResource(canvas)
      );
      baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;
      atlas[name] = new PIXI.Texture(baseTexture);
    });
    console.log(`POT tiled texture count: ${pot.length}`);
  }

  private makeHPOT(atlas: PIXI.ITextureDictionary) {
    const pot = Object.keys(atlas).filter((i) => i.endsWith("_h.png"));
    const nextPowerOfTwo = (v: number) => {
      let p = 32;
      while (v > p) p *= 2;
      return p;
    };

    // find dimensions
    let canvasWidth = 0;
    let canvasHeight = 0;
    pot.forEach((name) => {
      const tex = atlas[name];
      tex.width > canvasWidth && (canvasWidth = tex.width);
      canvasHeight += tex.height;
    });
    canvasHeight = nextPowerOfTwo(canvasHeight);

    // make canvas and a base texture
    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const context = canvas.getContext("2d");
    const baseTexture = new PIXI.BaseTexture(
      new PIXI.resources.CanvasResource(canvas)
    );
    baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;

    // draw textures and put them to atlas
    let offsetY = 0;
    pot.forEach((name) => {
      const tex = atlas[name];
      const res = tex.baseTexture.resource as PIXI.resources.ImageResource;
      const image: HTMLImageElement = res.source as HTMLImageElement;

      let offsetX = 0;
      const { x, y, width, height } = tex.frame;
      while (offsetX + width <= canvasWidth) {
        context.drawImage(
          image,
          x,
          y,
          width,
          height,
          offsetX,
          offsetY,
          width,
          height
        );
        offsetX += width;
      }

      // create texture frames
      name = name.replace("_h.png", "") + ".png";
      const frame = new PIXI.Rectangle(0, offsetY, canvasWidth, height);
      atlas[name] = new PIXI.Texture(baseTexture, frame);

      offsetY += height;
    });

    console.log(`POT horizontal texture size: ${canvasWidth}x${canvasHeight}`);
  }
}
