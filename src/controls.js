import store from "./store";

const TOOL_DELETE = 1;
const TOOL_LINES = 2;
const TOOL_CURVES_LARGE = 3;
const TOOL_CURVES_SMALL = 4;
const TOOL_CURVES_SMALL_SEC = 5;

const TOOL_BLOCK_SECTION = 6;
const TOOL_SWITCH = 7;

const ACTION_GROUP = 100;
const ACTION_UNGROUP = 100;

const toolHotkeys = {
  49: TOOL_DELETE,
  50: TOOL_LINES,
  51: TOOL_CURVES_LARGE,
  52: TOOL_CURVES_SMALL,
  53: TOOL_CURVES_SMALL_SEC,
  54: TOOL_BLOCK_SECTION,
  55: TOOL_SWITCH
};

const secondaryHotkeys = {
  90: ACTION_GROUP,
  88: ACTION_UNGROUP
};

// states list equals tool list now

const config = [
  {
    code: 49,
    tag: "1",
    text: "Lines",
    action: TOOL_DELETE
  },
  {
    code: 50,
    tag: "2",
    action: ACTION_GROUP,
    text: "Group",
    selected: true
  },
  {
    code: 90,
    tag: "Z",
    action: ACTION_GROUP,
    text: "Group",
    filter: 2,
    selected: true
  }
];

const hints = [
  { tag: 1, text: "Lines", active: true },
  { tag: 2, text: "Large" },
  { tag: 3, text: "Small" },
  { tag: 4, text: "Small2" },
  { tag: 9, text: "Block" },
  { tag: 0, text: "Switch" },
  { tag: "G", text: "Group" },
  { tag: "U", text: "Ungroup" },
  { tag: 0, text: "Delete" }
];

// tools controller

export default class Controls {
  constructor(draw) {
    this.draw = draw;
    this.activeState = 1;

    this.applyFilter();
    const { hints } = this;
    store.setState({ hints });

    window.addEventListener("keyup", event => this.onKeyUp(event.keyCode));
    window.addEventListener("keydown", event => this.onKeyDown(event.keyCode));
  }

  applyFilter() {
    this.hints = config.filter(i => !i.filter || i.filter === this.activeState);
  }

  onKeyUp(keyCode) {
    const index = this.hints.findIndex(i => i.code === keyCode);
    if (index !== -1) {
      this.hints[index].active = false;
      this.activeState = this.hints[index].action;
      this.applyFilter();

      const { hints } = this;
      store.setState({ hints });
    }
  }

  onKeyDown(keyCode) {
    const index = this.hints.findIndex(i => i.code === keyCode);
    if (index !== -1) {
      this.hints[index].active = true;

      const { hints } = this;
      store.setState({ hints });
    }
  }
}
