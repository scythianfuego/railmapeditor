import ts from "./transform";

import Draw from "./draw";
import Model from "./model";
import Animate from "./animate";
import Controls from "./controls";
import PropertyEditor from "./components/properties";
import LayerList from "./components/layerlist";
window.customElements.define("property-box", PropertyEditor);
window.customElements.define("layerlist-box", LayerList);

const canvas = document.querySelector("canvas");
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

let model = new Model();
ts.createGrid();

const draw = new Draw(canvas, model);
const controls = new Controls(model);
window.addEventListener("resize", e => {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
});

const animate = new Animate(model, draw);
animate.start();

// debug
(window as any)["model"] = model;
(window as any)["controls"] = controls;
