import * as PIXI from "pixi.js";

// @ts-ignore
PIXI.useDeprecated();
// @ts-ignore
const hook = window.__PIXI_INSPECTOR_GLOBAL_HOOK__;
hook && hook.register({ PIXI: PIXI });

import Draw from "./PIXI/draw";
import Model from "./model";
import Controls from "./controls";
import PropertyEditor from "./components/properties";
import LayerList from "./components/layerlist";
window.customElements.define("property-box", PropertyEditor);
window.customElements.define("layerlist-box", LayerList);

const canvas = document.querySelector("canvas");
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

let model = new Model();
// ts.createGrid();

const app = new PIXI.Application({
  view: canvas,
  resizeTo: canvas,
});

PIXI.Loader.shared
  .add("atlas", "assets/textures.json", { crossOrigin: true }) // anonymous
  .load(
    (
      loader: PIXI.Loader,
      resources: Partial<Record<string, PIXI.LoaderResource>>
    ) => {
      const draw = new Draw(model, app, resources);
      const controls = new Controls(model);
      window.addEventListener("resize", (e) => {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
      });

      // debug
      (window as any)["model"] = model;
      (window as any)["controls"] = controls;
    }
  );
