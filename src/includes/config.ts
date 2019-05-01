import { IProperty } from "./../interfaces/IProperty";
import IHints from "../interfaces/IHints";
import IKeyValue from "../interfaces/IKeyValue";

// const A: { [index: string]: number }
enum A {
  SELECT,
  LINES,
  CURVE,
  SIDEA,
  SIDEB,
  LONG,
  BLOCK,
  CONNECT,
  OBJECT,

  // actions
  GROUP,
  UNGROUP,
  DELETE,
  NEXT,
  PREV,
  SWITCH,
  JOIN,

  SWITCH_AP,
  SWITCH_AS,
  SWITCH_BP,
  SWITCH_BS,
  SAVE,
  LOAD,
  EXPORT,

  OBJECTNEW,
  OBJECTEDIT,
  OBJECTMOVE,
  OBJECTCLONE,
  OBJECTDELETE,
  OBJECTFWD,
  OBJECTBACK

  // OBJECTPOINTMOVE: 0x100 00 00 00
}

const tools = [A.LINES, A.CURVE, A.SIDEA, A.SIDEB, A.LONG];
const AG: { [index: string]: A[] } = {
  TOOLS: tools,
  SELECTABLE: [A.SELECT, A.BLOCK, A.CONNECT],
  SELECT_CONNECTIONS: [A.CONNECT],
  SELECT_OBJECTS: [A.OBJECT],
  MODES: tools.concat([A.SELECT, A.BLOCK, A.OBJECT, A.CONNECT])
};

const actions = A;
const actionGroups = AG;

// modes
// action - what to do
// on - what to highlight
// show/hide - when to show/hide
// prettier-ignore
const hints: IHints = [
  // top level
  { tag: "1", text: "Draw", action: A.LINES, show: [A.SELECT] },
  { tag: "2", text: "Block", action: A.BLOCK, show: [A.SELECT] },
  { tag: "3", text: "Switch", action: A.CONNECT, show: [A.SELECT] },
  { tag: "4", text: "Objects", action: A.OBJECT, show: [A.SELECT] },
  { tag: "S", text: "Quicksave", action: A.SAVE, show: [A.SELECT] },
  { tag: "L", text: "Quickload", action: A.LOAD, show: [A.SELECT] },
  { tag: "0", text: "Export", action: A.EXPORT, show: [A.SELECT] },
  { tag: "Z", text: "Delete", action: A.DELETE, show: [A.SELECT] },
  // drawing
  { tag: "ESC", text: "Back", action: A.SELECT, show: AG.TOOLS },
  { tag: "1", text: "Lines", action: A.LINES, show: AG.TOOLS, on: A.LINES },
  { tag: "2", text: "Curve", action: A.CURVE, show: AG.TOOLS, on: A.CURVE },
  { tag: "3", text: "SideA", action: A.SIDEA, show: AG.TOOLS, on: A.SIDEA },
  { tag: "4", text: "SideB", action: A.SIDEB, show: AG.TOOLS, on: A.SIDEB },
  { tag: "5", text: "Inf L", action: A.LONG, show: AG.TOOLS, on: A.LONG },
  { tag: "Z", text: "Next tool", action: A.NEXT, show: AG.TOOLS },
  { tag: "X", text: "Prev tool", action: A.PREV, show: AG.TOOLS },
  // block
  { tag: "ESC", text: "Back", action: A.SELECT, show: [A.BLOCK] },
  { tag: "Z", text: "Group", action: A.GROUP, show: [A.BLOCK] },
  { tag: "X", text: "Unroup", action: A.UNGROUP, show: [A.BLOCK] },

  // switch
  { tag: "ESC", text: "Back", action: A.SELECT, show: [A.CONNECT] },
  { tag: "Z", text: "Create switch", action: A.SWITCH, show: [A.CONNECT] },

  { tag: "1", text: "A1", action: A.SWITCH_AP, show: [A.CONNECT] },
  { tag: "2", text: "A2", action: A.SWITCH_AS, show: [A.CONNECT] },
  { tag: "3", text: "B1", action: A.SWITCH_BP, show: [A.CONNECT] },
  { tag: "4", text: "B2", action: A.SWITCH_BS, show: [A.CONNECT] },
  // todo: find common connection for selection
  // onclick select switch components - with alteration
  { tag: "X", text: "Connect", action: A.JOIN, show: [A.CONNECT] },

  // object
  { tag: "ESC", text: "Back", action: A.SELECT, show: [A.OBJECT] },
  { tag: "1", text: "New", action: A.OBJECTNEW, show: [A.OBJECT] },
  { tag: "2", text: "Edit", action: A.OBJECTEDIT, show: [A.OBJECT] },
  { tag: "3", text: "Move", action: A.OBJECTMOVE, show: [A.OBJECT] },
  { tag: "4", text: "Clone", action: A.OBJECTCLONE, show: [A.OBJECT] },
  { tag: "5", text: "Forward", action: A.OBJECTFWD, show: [A.OBJECT] },
  { tag: "6", text: "Back", action: A.OBJECTBACK, show: [A.OBJECT] },
  { tag: "Z", text: "Delete", action: A.OBJECTDELETE, show: [A.OBJECT] }
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
  "0": 48,
  Z: 90,
  X: 88,
  S: 83,
  L: 76,
  ESC: 27
};

const layers = [
  "grass",
  "rails",
  "shadow",
  "forest",
  "train",
  "platform",
  "roof",
  "highground",
  "highrail",
  "bridge",
  "switch",
  "topmost"
];

const objectDefaults: IKeyValue[] = [
  { type: "none" },
  {
    type: "static",
    texture: [
      "forest1.png",
      "bridge1.png",
      "river.png",
      "platform.png",
      "fog1.png",
      "sandpatch.png",
      "chalkpatch.png",
      "redfog.png",
      "blackfog.png",
      "grasspatch.png",
      "landscape.png"
    ],
    layer: layers,
    alpha: 1,
    shadow: false,
    width: 0
  },
  {
    type: "light",
    texture: [
      "pointlight.png",
      "pointup.png",
      "pointdown.png",
      "spotlight.png"
    ],
    layer: layers,
    color: 0,
    width: 50
  },
  { type: "depot", texture: "depot.png", house: "single" },
  { type: "building", texture: ["house1.png", "house2.png"] }
];

const objectTypes = objectDefaults.map(v => v.type);

// prettier-ignore
const objectCommon: IProperty[] = [
  { label: "Object", type: "label" },
  { label: "Type", type: "select", options: objectTypes, id: "type" },
  { label: "Position", type: "label" },
  { label: "X", type: "number", id: "x", value: 0 },
  { label: "Y", type: "number", id: "y", value: 0 },
  { label: "Rotation", type: "number", id: "rotation", value: 0 },
  { label: "Zindex", type: "number", id: "zindex", value: 0 },
  { label: "Properties", type: "label" }
];

export default {
  hints,
  keyMap,
  actions,
  actionGroups,
  objectDefaults,
  objectCommon,
  objectTypes
};
