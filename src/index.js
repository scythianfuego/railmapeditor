import * as Honeycomb from "honeycomb-grid";
const Hex = Honeycomb.extendHex({ size: 50 / Math.sqrt(3) });
const Grid = Honeycomb.defineGrid(Hex);
const grid = Grid.rectangle({ width: 35, height: 25 });

import Draw from "./draw";
import Model from "./model";
import Animate from "./animate";
import Controls from "./controls";

const canvas = document.querySelector("canvas");
canvas.height = canvas.clientHeight;
canvas.width = canvas.clientWidth;

let model = new Model();
const draw = new Draw(canvas, grid, model);
const controls = new Controls(model, grid, Grid);

const animate = new Animate(model, draw);
animate.start();

window.model = model;

// let selectedCell = null;
// let cursorCell = null;
// let currentTool = 1;

// draw.setTool(tools[currentTool]);
// draw.all();
