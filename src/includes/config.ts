import { IProperty } from "./../interfaces/IProperty";
import IHints from "../interfaces/IHints";

const A: { [index: string]: number } = {
  SELECT: 1,
  LINES: 2,
  CURVE: 4,
  SIDEA: 8,
  SIDEB: 0x10,
  BLOCK: 0x20,
  CONNECT: 0x40,
  OBJECT: 0x80,

  // actions
  GROUP: 0x400,
  UNGROUP: 0x800,
  DELETE: 0x1000,
  NEXT: 0x2000,
  PREV: 0x4000,
  SWITCH: 0x8000,
  JOIN: 0x10000,

  SWITCH_AP: 0x20000,
  SWITCH_AS: 0x40000,
  SWITCH_BP: 0x80000,
  SWITCH_BS: 0x100000,
  SAVE: 0x200000,
  LOAD: 0x400000
};
A.TOOLS = A.LINES | A.CURVE | A.SIDEA | A.SIDEB;
A.SELECTABLE = A.SELECT | A.BLOCK | A.CONNECT;
A.SELECT_CONNECTIONS = A.CONNECT;
A.MODES = A.TOOLS | A.SELECT | A.BLOCK | A.OBJECT | A.CONNECT;

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
  { tag: "3", text: "Switch", action: A.CONNECT, show: A.SELECT },
  { tag: "4", text: "Objects", action: A.OBJECT, show: A.SELECT },
  { tag: "8", text: "Quicksave", action: A.SAVE, show: A.SELECT },
  { tag: "9", text: "Quickload", action: A.LOAD, show: A.SELECT },
  { tag: "0", text: "Export", action: null, show: A.SELECT },
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
  { tag: "ESC", text: "Back", action: A.SELECT, show: A.CONNECT },
  { tag: "Z", text: "Create switch", action: A.SWITCH, show: A.CONNECT },

  { tag: "1", text: "AP", action: A.SWITCH_AP, show: A.CONNECT },
  { tag: "2", text: "AS", action: A.SWITCH_AS, show: A.CONNECT },
  { tag: "3", text: "BP", action: A.SWITCH_BP, show: A.CONNECT },
  { tag: "4", text: "BS", action: A.SWITCH_BS, show: A.CONNECT },
  // todo: find common connection for selection
  // onclick select switch components - with alteration
  { tag: "X", text: "Connect", action: A.JOIN, show: A.CONNECT },

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
  "8": 56,
  "9": 57,
  Z: 90,
  X: 88,
  ESC: 27
};

const ObjectDefaults = [
  { type: "End of line", texture: ["end1.png", "end07.png"] },
  { type: "Depot", texture: "depot.png" },
  { type: "Building", texture: ["house1.png", "house2.png"] }
];

const ObjectTypes = ObjectDefaults.map(v => v.type);

const ObjectCommon: IProperty[] = [
  { label: "Object", type: "label" },
  {
    label: "Type",
    type: "select",
    options: ObjectTypes,
    id: "type"
  },
  { label: "Position", type: "label" },
  { label: "X", type: "text", id: "width", value: 0 },
  { label: "Y", type: "text", id: "height", value: 0 },
  { label: "Z-index", type: "text", id: "height", value: 0 },
  { label: "Properties", type: "label" }
];

export default {
  hints,
  keyMap,
  actions,
  ObjectDefaults,
  ObjectCommon
};
