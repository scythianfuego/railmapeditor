import * as Honeycomb from "honeycomb-grid";

import Draw from "./draw";
import Objects from "./objects";
import Model from "./model";
import Animate from "./animate";
import Controls from "./controls";

const Hex = Honeycomb.extendHex({ size: 50 / Math.sqrt(3) });
const Grid = Honeycomb.defineGrid(Hex);
const grid = Grid.rectangle({ width: 35, height: 25 });

const canvas = document.querySelector("canvas");
canvas.height = canvas.clientHeight;
canvas.width = canvas.clientWidth;

const objects = new Objects();
let model = new Model();
const draw = new Draw(canvas, grid, model);
const controls = new Controls(draw);

const animate = new Animate(model, draw);
animate.start();

let selectedCell = null;
let cursorCell = null;
let currentTool = 1;

const tools = [
  hex => null,
  hex => objects.line(hex, 0),
  hex => objects.line(hex, 1),
  hex => objects.line(hex, 2),
  hex => objects.longArc(hex, 0),
  hex => objects.longArc(hex, 1),
  hex => objects.longArc(hex, 2),
  hex => objects.longArc(hex, 3),
  hex => objects.longArc(hex, 4),
  hex => objects.longArc(hex, 5),
  hex => objects.shortArc(hex, 0),
  hex => objects.shortArc(hex, 1),
  hex => objects.shortArc(hex, 2),
  hex => objects.shortArc(hex, 3),
  hex => objects.shortArc(hex, 4),
  hex => objects.shortArc(hex, 5),
  hex => objects.shortArc2(hex, 0),
  hex => objects.shortArc2(hex, 1),
  hex => objects.shortArc2(hex, 2),
  hex => objects.shortArc2(hex, 3),
  hex => objects.shortArc2(hex, 4),
  hex => objects.shortArc2(hex, 5)
  // hex => [0, 1, 2, 3, 4, 5].map(i => shortArc(hex, i))
];

draw.setTool(tools[currentTool]);
draw.all();
window.draw = draw;
window.model = model;

// map
// all neighbours -> intersect dots

const mouseToHex = event => {
  var bounds = event.target.getBoundingClientRect();
  var x = event.clientX - bounds.left;
  var y = event.clientY - bounds.top;
  return grid.get(Grid.pointToHex(x, y));
};

canvas.addEventListener("contextmenu", event => {
  event.preventDefault();
});

canvas.addEventListener("mousemove", event => {
  const newCell = mouseToHex(event);
  if (newCell != cursorCell) {
    cursorCell = newCell;
    draw.setCursor(cursorCell);
    draw.all();
  }
});

canvas.addEventListener("mouseup", event => {
  selectedCell = mouseToHex(event);

  const obj = tools[currentTool](selectedCell);
  model.add(selectedCell, obj);

  draw.all();
});

canvas.addEventListener("wheel", event => {
  const toolCount = tools.length;
  if (!cursorCell) {
    return;
  }
  draw.all();
  // tools

  if (event.wheelDelta > 0) {
    currentTool++;
    if (currentTool > toolCount) {
      currentTool = 0;
    }
  } else {
    currentTool--;
    if (currentTool < 0) {
      currentTool = toolCount;
    }
  }

  const obj = tools[currentTool] ? tools[currentTool] : null;
  draw.setTool(obj);
  draw.all();
});
