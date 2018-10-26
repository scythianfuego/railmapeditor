import store from "./store";
import Objects from "./objects";
const objects = new Objects();

// modes
const A_LINES = 1;
const A_CURVE = 2;
const A_SIDEA = 3;
const A_SIDEB = 4;
const A_BLOCK = 5;
const A_SWITCH = 6;
const A_SELECT = 7;

// actions
const A_GROUP = 101;
const A_UNGROUP = 102;
const A_DELETE = 103;
const A_NEXT = 104;
const A_PREV = 104;

const config = [
  // modes
  { code: 27, tag: "ESC", text: "Select", action: A_SELECT, mode: A_SELECT },
  { code: 49, tag: "1", text: "Lines", action: A_LINES, mode: A_LINES },
  { code: 50, tag: "2", text: "Curve", action: A_CURVE, mode: A_CURVE },
  { code: 51, tag: "3", text: "SideA", action: A_SIDEA, mode: A_SIDEA },
  { code: 52, tag: "4", text: "SideB", action: A_SIDEB, mode: A_SIDEB },
  { code: 53, tag: "5", text: "Block", action: A_BLOCK, mode: A_BLOCK },
  { code: 54, tag: "6", text: "Switch", action: A_SWITCH, mode: A_SWITCH },
  // {
  //   code: 55,
  //   tag: "7",
  //   text: "Rearrange",
  //   action: A_SWITCH,
  //   mode: A_SWITCH,
  //   submode: A_ARRANGE
  // },
  // actions
  { code: 90, tag: "Z", text: "Next tool", action: A_NEXT, filter: A_LINES },
  { code: 88, tag: "X", text: "Prev tool", action: A_PREV, filter: A_LINES },
  { code: 90, tag: "Z", text: "Next tool", action: A_NEXT, filter: A_CURVE },
  { code: 88, tag: "X", text: "Prev tool", action: A_PREV, filter: A_CURVE },
  { code: 90, tag: "Z", text: "Next tool", action: A_NEXT, filter: A_SIDEA },
  { code: 88, tag: "X", text: "Prev tool", action: A_PREV, filter: A_SIDEA },
  { code: 90, tag: "Z", text: "Next tool", action: A_NEXT, filter: A_SIDEB },
  { code: 88, tag: "X", text: "Prev tool", action: A_PREV, filter: A_SIDEB },

  { code: 90, tag: "Z", text: "Group", action: A_GROUP, filter: A_BLOCK },
  { code: 88, tag: "X", text: "Unroup", action: A_UNGROUP, filter: A_BLOCK },
  { code: 90, tag: "Z", text: "Delete", action: A_DELETE, filter: A_SELECT },
  { code: 90, tag: "Z", text: "Create switch", action: null, filter: A_SWITCH }
];

// tools controller
const tools = {
  [A_LINES]: [
    hex => objects.line(hex, 0),
    hex => objects.line(hex, 1),
    hex => objects.line(hex, 2)
  ],
  [A_CURVE]: [
    hex => objects.longArc(hex, 0),
    hex => objects.longArc(hex, 1),
    hex => objects.longArc(hex, 2),
    hex => objects.longArc(hex, 3),
    hex => objects.longArc(hex, 4),
    hex => objects.longArc(hex, 5)
  ],
  [A_SIDEA]: [
    hex => objects.shortArc(hex, 0),
    hex => objects.shortArc(hex, 1),
    hex => objects.shortArc(hex, 2),
    hex => objects.shortArc(hex, 3),
    hex => objects.shortArc(hex, 4),
    hex => objects.shortArc(hex, 5)
  ],
  [A_SIDEB]: [
    hex => objects.shortArc2(hex, 0),
    hex => objects.shortArc2(hex, 1),
    hex => objects.shortArc2(hex, 2),
    hex => objects.shortArc2(hex, 3),
    hex => objects.shortArc2(hex, 4),
    hex => objects.shortArc2(hex, 5)
  ]
};

export default class Controls {
  constructor(model, grid, Grid) {
    this.model = model;
    this.grid = grid;
    this.Grid = Grid;

    const mode = store.getState().mode;
    const hints = this.applyFilter(mode);
    store.setState({ hints });

    window.addEventListener("keyup", event => this.onKeyUp(event.keyCode));
    window.addEventListener("keydown", event => this.onKeyDown(event.keyCode));
    window.addEventListener("contextmenu", event => event.preventDefault());
    window.addEventListener("mousemove", event => this.onMouseMove(event));
    window.addEventListener("mousedown", event => this.onMouseDown(event));
    window.addEventListener("mouseup", event => this.onMouseUp(event));
    window.addEventListener("wheel", event => this.onWheel(event));
  }

  applyFilter(mode) {
    const result = config
      .map(a => ({ ...a })) // copy
      .filter(i => !i.filter || i.filter === mode);
    result.find(i => i.mode === mode).selected = true;
    return result;
  }

  onKeyUp(keyCode) {
    const state = store.getState();
    const { hints } = state;
    const index = hints.findIndex(i => i.code === keyCode);
    if (index !== -1) {
      hints[index].active = false;
      store.setState({ hints });
    }
  }

  onKeyDown(keyCode) {
    const state = store.getState();
    const { mode, hints } = state;
    const index = hints.findIndex(i => i.code === keyCode);
    if (index !== -1) {
      const newMode = hints[index].mode || mode;
      const newHints = this.applyFilter(newMode);
      newHints[index].active = true;
      store.setState({ hints: newHints, mode: newMode });
      this.runAction(hints[index].action);
    }
  }

  mouseEventToXY(event) {
    var bounds = event.target.getBoundingClientRect();
    var x = event.clientX - bounds.left;
    var y = event.clientY - bounds.top;
    return [x, y];
  }

  mouseToHex(event) {
    var bounds = event.target.getBoundingClientRect();
    var x = event.clientX - bounds.left;
    var y = event.clientY - bounds.top;
    return this.grid.get(this.Grid.pointToHex(x, y));
  }
  /**  mouse: [0, 0],2
  mouseDown: false,
  selection: false,
  selectionStart: [0, 0], */

  onMouseDown(e) {
    // selectedCell = mouseToHex(event);
    const coords = this.mouseEventToXY(e);
    const mouse = {
      coords,
      down: true,
      selection: coords
    };
    store.setState({ mouse });

    const [x, y] = coords;
    let a = this.model.findByXY(x, y);
    a.selected = true;
  }

  onMouseUp(e) {
    const coords = this.mouseEventToXY(e);
    const mouse = {
      coords,
      down: false,
      selection: null
    };

    if (this.toolset.length) {
      const selectedCell = this.mouseToHex(event);
      const tool = this.toolset[this.currentTool];
      const obj = tool(selectedCell);
      this.model.add(selectedCell, obj);
    }

    store.setState({ mouse });
  }

  onMouseMove(e) {
    const mouse = store.getState().mouse;
    mouse.coords = this.mouseEventToXY(e);
    const cursorCell = this.mouseToHex(e);
    store.setState({ mouse, cursorCell });
  }

  onWheel(e) {
    if (event.wheelDelta > 0) {
      this.nextTool();
    } else {
      this.prevTool();
    }
    const tool = this.toolset[this.currentTool];
    store.setState({ tool });
  }

  nextTool() {
    const toolCount = this.toolset.length - 1;
    this.currentTool++;
    if (this.currentTool > toolCount) {
      this.currentTool = 0;
    }
  }

  prevTool() {
    const toolCount = this.toolset.length - 1;
    this.currentTool--;
    if (this.currentTool < 0) {
      this.currentTool = toolCount;
    }
  }

  runAction(action) {
    let tool = null;
    let selectionMode = false;
    // this.toolset = [];

    switch (action) {
      case A_LINES:
      case A_CURVE:
      case A_SIDEA:
      case A_SIDEB:
        this.currentTool = 0;
        this.toolset = tools[action];
        // draw.setTool(this.tool);
        break;
      case A_BLOCK:
        this.toolset = [];
        break;
      case A_SWITCH:
        this.toolset = [];
        break;
      case A_SELECT:
        selectionMode = true;
        this.toolset = [];
        break;
      case A_GROUP:
        break;
      case A_UNGROUP:
        break;
      case A_DELETE:
        break;
      case A_NEXT:
        this.nextTool();
        break;
      case A_PREV:
        this.prevTool();
        break;
    }
    tool = this.toolset[this.currentTool] || null;
    store.setState({ tool, selectionMode });
  }
}

/*
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

*/
