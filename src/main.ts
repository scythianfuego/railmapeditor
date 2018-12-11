import ts from "./transform";

import Draw from "./draw";
import Model from "./model";
import Animate from "./animate";
import Controls from "./controls";
import PropertyEditor from "./components/properties";
window.customElements.define("property-box", PropertyEditor);

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

let pe = <PropertyEditor>document.querySelector("property-box");
// pe.create("");
// prettier-ignore
pe.data = [
  { label:"Layout", type:"label" },
  { label:"Width", type:"text", id:"width", value: 260},
  { label:"Height", type:"text", id:"height", value: 0},
  { label:"Data loading", type:"label" },
  { label:"Data url", type:"text", id:"url", value:"https://www.com/data"},
  { label:"Type", type:"select", options:["json","xml","csv"], id:"type", value: 'xml'},
  { label:"Position", type:"select", options:["1", "2", "3"], id:"position"},
  { label:"Color", type:"text", options: [], id:"color"},
  { label:"Color", type:"boolean", value: false, id:"color"},
  { label:"Use JSONP", type:"text", id:"jsonp"}
];

console.log(pe.userInput);
// let selectedCell = null;
// let cursorCell = null;
// let currentTool = 1;

// draw.setTool(tools[currentTool]);
// draw.all();
