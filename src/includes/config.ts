import IHints from "../interfaces/IHints";

const A: { [index: string]: number } = {
  SELECT: 1,
  LINES: 2,
  CURVE: 4,
  SIDEA: 8,
  SIDEB: 16,
  BLOCK: 32,
  SWITCH: 64,
  OBJECT: 128,

  // actions
  GROUP: 1024,
  UNGROUP: 2048,
  DELETE: 4096,
  NEXT: 8192,
  PREV: 16384
};
A.TOOLS = A.LINES | A.CURVE | A.SIDEA | A.SIDEB;
A.SELECTABLE = A.SELECT | A.BLOCK | A.SWITCH;
A.SELECT_CONNECTIONS = A.SWITCH;
A.MODES = A.TOOLS | A.SELECT | A.BLOCK | A.OBJECT | A.SWITCH;

const actions = A;

// modes
// action - what to do
// on - what to highlight
// show/hide - when to show/hide
// prettier-ignore
const hints: IHints = [
  // top level
  { tag: "1", text: "Draw", action: A.LINES, show: A.SELECT },
  { tag: "2", text: "Block", action: A.BLOCK, show: A.SELECT },
  { tag: "3", text: "Switch", action: A.SWITCH, show: A.SELECT },
  { tag: "4", text: "Objects", action: A.OBJECT, show: A.SELECT },
  { tag: "Z", text: "Delete", action: A.DELETE, show: A.SELECT },
  // drawing
  { tag: "ESC", text: "Back", action: A.SELECT, show: A.TOOLS },
  { tag: "1", text: "Lines", action: A.LINES, show: A.TOOLS, on: A.LINES },
  { tag: "2", text: "Curve", action: A.CURVE, show: A.TOOLS, on: A.CURVE },
  { tag: "3", text: "SideA", action: A.SIDEA, show: A.TOOLS, on: A.SIDEA },
  { tag: "4", text: "SideB", action: A.SIDEB, show: A.TOOLS, on: A.SIDEB },
  { tag: "Z", text: "Next tool", action: A.NEXT, show: A.TOOLS },
  { tag: "X", text: "Prev tool", action: A.PREV, show: A.TOOLS },
  // block
  { tag: "ESC", text: "Back", action: A.SELECT, show: A.BLOCK },
  { tag: "Z", text: "Group", action: A.GROUP, show: A.BLOCK },
  { tag: "X", text: "Unroup", action: A.UNGROUP, show: A.BLOCK },

  // switch
  { tag: "ESC", text: "Back", action: A.SELECT, show: A.SWITCH },
  { tag: "Z", text: "Create switch", action: null, show: A.SWITCH },
  // todo: find common connection for selection
  // onclick select switch components - with alteration
  { tag: "Z", text: "Connect", action: null, show: A.SWITCH },

  // object
  { tag: "ESC", text: "Back", action: A.SELECT, show: A.OBJECT }
];

const keyMap: {
  [index: string]: number;
} = {
  "1": 49,
  "2": 50,
  "3": 51,
  "4": 52,
  "5": 53,
  "6": 54,
  "7": 55,
  Z: 90,
  X: 88,
  ESC: 27
};

export default {
  hints,
  keyMap,
  actions
};
