import store from "./store";
import Objects from "./objects";
const objects = new Objects();

// modes
const A_LINES = 1;
const A_CURVE = 2;
const A_SIDEA = 4;
const A_SIDEB = 8;
const A_BLOCK = 16;
const A_SWITCH = 32;
const A_SELECT = 64;

// actions
const A_GROUP = 1024;
const A_UNGROUP = 2048;
const A_DELETE = 4096;
const A_NEXT = 8192;
const A_PREV = 16384;

const SELECTABLE = A_SELECT | A_BLOCK;
const SELECT_CONNECTIONS = A_SWITCH;
const TOOLS = A_LINES | A_CURVE | A_SIDEA | A_SIDEB;
const MODES = SELECTABLE | TOOLS;
const ACTIONS = A_GROUP | A_UNGROUP | A_DELETE | A_NEXT | A_PREV;

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

    this.runAction(A_LINES);
  }

  applyFilter(mode) {
    const result = config
      .map(a => ({ ...a })) // copy
      .filter(i => !i.filter || i.filter === mode);
    result.find(i => i.mode === mode).selected = true;
    return result;
  }

  onKeyUp(keyCode) {
    if (keyCode === 16) {
      this.shift = false;
    } else if (keyCode == 17) {
      this.ctrl = false;
    }

    const state = store.getState();
    const { hints } = state;
    const index = hints.findIndex(i => i.code === keyCode);
    if (index !== -1) {
      hints[index].active = false;
      store.setState({ hints });
    }
  }

  onKeyDown(keyCode) {
    if (keyCode === 16) {
      this.shift = true;
    } else if (keyCode == 17) {
      this.ctrl = true;
    }

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
    const state = store.getState();
    const coords = this.mouseEventToXY(e);

    if (state.mode & SELECTABLE) {
      const [x, y] = coords;
      const hit = this.model.findByXY(x, y);
      !this.shift && this.model.deselect(); // deselect if shift is not pressed
      this.model.select(hit);
      if (state.mode & A_BLOCK) {
        this.model.selectGroup(hit);
      }
    }

    if (state.mode & SELECT_CONNECTIONS) {
      const [x, y] = coords;
      const hit = this.model.findConnection(x, y);
      this.model.selectedConnection = hit;
    }

    const mouse = {
      coords,
      down: e.button === 0,
      pan: e.button === 1,
      selection: coords
    };
    store.setState({ mouse });
  }

  onMouseUp(e) {
    const state = store.getState();
    const coords = this.mouseEventToXY(e);

    const mouse = {
      coords,
      down: false,
      pan: false,
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
    const state = store.getState();
    const coords = this.mouseEventToXY(e);
    const cursorCell = this.mouseToHex(e);

    const mouse = state.mouse;
    mouse.coords = coords;
    mouse.movement = [e.movementX, e.movementY];
    store.setState({ mouse, cursorCell });

    state.mode & SELECTABLE &&
      this.alterSelection(coords, state.mouse.selection);
  }

  onWheel(e) {
    event.wheelDelta > 0 ? this.nextTool() : this.prevTool();
    const tool = this.toolset[this.currentTool];
    store.setState({ tool });
  }

  alterSelection(startPoint, endPoint) {
    const state = store.getState();
    // rectangular selection, todo: move to model
    const threshold = 10;
    const [sx, sy] = startPoint;
    const [ex, ey] = endPoint;
    if (this.model.distance(sx, sy, ex, ey) > threshold) {
      const hit = this.model.findByRect(sx, sy, ex, ey);
      !this.shift && this.model.deselect(); // deselect if shift is not pressed
      this.model.select(hit);

      if (state.mode & A_BLOCK) {
        this.model.selectGroup(hit);
      }
    }
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
    const state = store.getState();
    let { tool, selectionMode, blocks } = state;

    this.toolset = [];

    // modes
    if (action & TOOLS) {
      this.currentTool = 0;
      this.toolset = tools[action];
      tool = this.toolset[this.currentTool] || null;
      selectionMode = false;
    }

    if (action & SELECTABLE) {
      selectionMode = true;
      tool = null;
    }

    if (action & MODES) {
      blocks = false;
    }
    if (action & A_BLOCK) {
      blocks = true;
    }

    // actions to run
    action & A_GROUP && this.model.group();
    action & A_UNGROUP && this.model.ungroup();
    action & A_DELETE && this.model.deleteSelected();
    action & A_NEXT && this.nextTool();
    action & A_PREV && this.prevTool();

    store.setState({ tool, selectionMode, blocks });
  }
}
