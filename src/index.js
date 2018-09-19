import * as Honeycomb from "honeycomb-grid";

import Draw from "./draw";
import Objects from "./objects";
import Model from "./model";

const Hex = Honeycomb.extendHex({ size: 50 / Math.sqrt(3) });
const Grid = Honeycomb.defineGrid(Hex);
const grid = Grid.rectangle({ width: 20, height: 20 });

const canvas = document.querySelector("canvas");
const draw = new Draw(canvas, grid);
const objects = new Objects();
let model = new Model();

let selectedCell = null;
let cursorCell = null;
let currentTool = 1;

window.draw = draw;
window.model = model;

const drawAll = () => {
  draw.clear();
  draw.grid();
  draw.cell(cursorCell, "#999");
  // draw.cell(selectedCell, "#090");
  model.forEach(obj => draw.object(obj));
};

// map
// all neighbours -> intersect dots

const mouseToHex = event => {
  var bounds = event.target.getBoundingClientRect();
  var x = event.clientX - bounds.left;
  var y = event.clientY - bounds.top;
  return grid.get(Grid.pointToHex(x, y));
};

canvas.addEventListener("mousemove", event => {
  const newCell = mouseToHex(event);
  if (newCell != cursorCell) {
    cursorCell = newCell;
    drawAll();
    if (cursorCell) {
      drawTool(currentTool, cursorCell);
    }
  }
});

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

canvas.addEventListener("contextmenu", event => {
  event.preventDefault();
});

canvas.addEventListener("mouseup", event => {
  selectedCell = mouseToHex(event);

  const obj = tools[currentTool](selectedCell);
  model.add(selectedCell, obj);

  drawAll();
});

const drawTool = (tool, hex) => {
  // const f = [
  //   hex => null,
  //   hex => drawObject(ctx, line(hex, 0)),
  //   hex => drawObject(ctx, line(hex, 1)),
  //   hex => drawObject(ctx, line(hex, 2)),
  //   hex => drawObject(ctx, longArc(hex, 0)),
  //   hex => drawObject(ctx, longArc(hex, 1)),
  //   hex => drawObject(ctx, longArc(hex, 2)),
  //   hex => drawObject(ctx, longArc(hex, 3)),
  //   hex => drawObject(ctx, longArc(hex, 4)),
  //   hex => drawObject(ctx, longArc(hex, 5)),
  //   hex => [0, 1, 2, 3, 4, 5].forEach(i => drawObject(ctx, shortArc(hex, i)))
  // ];

  const obj = tools[tool](hex);

  if (obj) {
    Array.isArray(obj) ? obj.forEach(o => draw.object(o)) : draw.object(obj);
  }
};

canvas.addEventListener("wheel", event => {
  const toolCount = tools.length;
  if (!cursorCell) {
    return;
  }
  drawAll();
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

  drawTool(currentTool, cursorCell);
});
