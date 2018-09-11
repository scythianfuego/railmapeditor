import * as Honeycomb from "honeycomb-grid";

import { Draw } from "./draw";
import { Objects } from "./objects";

const Hex = Honeycomb.extendHex({ size: 30 });
const Grid = Honeycomb.defineGrid(Hex);
const grid = Grid.rectangle({ width: 20, height: 20 });

const canvas = document.querySelector("canvas");
const draw = new Draw(canvas, grid);
window.draw = draw;
const objects = new Objects();

let selectedCell = null;
let cursorCell = null;
let currentTool = 16;

let model = [];
model = JSON.parse(
  '[{"x":441.67295593006367,"y":345,"radius":105,"a1":1.5707963267948966,"a2":2.237462993461563},{"x":441.67295593006367,"y":345,"radius":105,"a1":0.9041296601282299,"a2":1.5707963267948966},{"x":688.4901960086286,"y":322.5,"radius":105,"a1":2.9985247625214253,"a2":3.665191429188092},{"x":688.4901960086286,"y":322.5,"radius":105,"a1":3.665191429188092,"a2":4.331858095854758},{"x":792.4132444627613,"y":457.50000000000006,"radius":105,"a1":5.09291986491462,"a2":5.759586531581287},{"x":792.4132444627613,"y":457.50000000000006,"radius":105,"a1":5.759586531581287,"a2":6.426253198247954}]'
);

const drawAll = () => {
  draw.clear();
  draw.grid();
  draw.cell(cursorCell, "#000");
  draw.cell(selectedCell, "#090");

  model.forEach(obj => draw.object(obj));
};

const mouseToHex = event => {
  var bounds = event.target.getBoundingClientRect();
  var x = event.clientX - bounds.left;
  var y = event.clientY - bounds.top;
  return grid.get(Grid.pointToHex(x, y));
};

canvas.addEventListener("mousemove", event => {
  cursorCell = mouseToHex(event);

  drawAll();
  if (cursorCell) {
    drawTool(currentTool, cursorCell);
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
  if (obj) {
    Array.isArray(obj) ? model.push(...obj) : model.push(obj);
  }

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
