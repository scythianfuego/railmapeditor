import store from "./store";

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
  // actions
  { code: 90, tag: "Z", text: "Next tool", action: A_NEXT, filter: A_LINES },
  { code: 91, tag: "X", text: "Prev tool", action: A_PREV, filter: A_LINES },
  { code: 90, tag: "Z", text: "Group", action: A_GROUP, filter: A_BLOCK },
  { code: 91, tag: "X", text: "Unroup", action: A_UNGROUP, filter: A_BLOCK },
  { code: 90, tag: "Z", text: "Delete", action: A_DELETE, filter: A_SELECT },
  { code: 90, tag: "Z", text: "Create switch", action: null, filter: A_SWITCH }
];

// tools controller
const tools = {
  A_LINES: [
    hex => objects.line(hex, 0),
    hex => objects.line(hex, 1),
    hex => objects.line(hex, 2)
  ],
  A_CURVE: [
    hex => objects.longArc(hex, 0),
    hex => objects.longArc(hex, 1),
    hex => objects.longArc(hex, 2),
    hex => objects.longArc(hex, 3),
    hex => objects.longArc(hex, 4),
    hex => objects.longArc(hex, 5)
  ],
  A_SIDEA: [
    hex => objects.shortArc(hex, 0),
    hex => objects.shortArc(hex, 1),
    hex => objects.shortArc(hex, 2),
    hex => objects.shortArc(hex, 3),
    hex => objects.shortArc(hex, 4),
    hex => objects.shortArc(hex, 5)
  ],
  A_SIDEB: [
    hex => objects.shortArc2(hex, 0),
    hex => objects.shortArc2(hex, 1),
    hex => objects.shortArc2(hex, 2),
    hex => objects.shortArc2(hex, 3),
    hex => objects.shortArc2(hex, 4),
    hex => objects.shortArc2(hex, 5)
  ]
};

// draw.setTool(tools[currentTool]);

export default class Controls {
  constructor() {
    const mode = store.getState().mode;
    const hints = this.applyFilter(mode);
    store.setState({ hints });

    window.addEventListener("keyup", event => this.onKeyUp(event.keyCode));
    window.addEventListener("keydown", event => this.onKeyDown(event.keyCode));
    window.addEventListener("contextmenu", event => event.preventDefault());
    window.addEventListener("mousemove", event => this.onMouseMove(event));
    window.addEventListener("mousedown", event => this.onMouseDown(event));
    window.addEventListener("mouseup", event => this.onMouseUp(event));
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
    const { mode, hints } = state;
    const index = hints.findIndex(i => i.code === keyCode);
    if (index !== -1) {
      const newMode = hints[index].mode || mode;
      const newHints = this.applyFilter(newMode);
      store.setState({ hints: newHints, mode: newMode });
    }
  }

  onKeyDown(keyCode) {
    const state = store.getState();
    const { hints } = state;
    const index = hints.findIndex(i => i.code === keyCode);
    if (index !== -1) {
      hints[index].active = true;
      store.setState({ hints });
    }
  }

  mouseEventToXY(e) {
    var bounds = event.target.getBoundingClientRect();
    var x = event.clientX - bounds.left;
    var y = event.clientY - bounds.top;
    return [x, y];
  }

  /**  mouse: [0, 0],
  mouseDown: false,
  selection: false,
  selectionStart: [0, 0], */

  onMouseDown(e) {
    // selectedCell = mouseToHex(event);
    const xy = this.mouseEventToXY(e);
    const selection = true;
    const selectionStart = xy;
    const mouse = xy;
    const mouseDown = true;
    store.setState({ mouse, mouseDown, selection, selectionStart });
  }

  onMouseUp(e) {
    const xy = this.mouseEventToXY(e);
    const selection = false;
    const selectionStart = [0, 0];
    const mouse = xy;
    const mouseDown = false;
    store.setState({ mouse, mouseDown, selection, selectionStart });
  }

  onMouseMove(e) {
    // const state = store.getState();
    const xy = this.mouseEventToXY(e);
    const mouse = xy;
    store.setState({ mouse });
  }
}
