import * as Honeycomb from "honeycomb-grid";
import ts from "./transform";

const Hex = Honeycomb.extendHex({ size: ts.HEX_SIZE });
const Grid = Honeycomb.defineGrid(Hex);
const grid = Grid.rectangle({ width: ts.CELLS_X, height: ts.CELLS_Y });

import Draw from "./draw";
import Model from "./model";
import Animate from "./animate";
import Controls from "./controls";

const canvas = document.querySelector("canvas");
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

let model = new Model();
const draw = new Draw(canvas, grid, model);
const controls = new Controls(model, grid, Grid);
window.addEventListener("resize", e => {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
});

const animate = new Animate(model, draw);
animate.start();

window.model = model;

// let selectedCell = null;
// let cursorCell = null;
// let currentTool = 1;

// draw.setTool(tools[currentTool]);
// draw.all();
