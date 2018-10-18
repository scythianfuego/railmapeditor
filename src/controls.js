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
    name: "1",
    action: TOOL_DELETE,
    stateFilter: 0
  },
  {
    code: 90,
    name: "G",
    action: ACTION_GROUP,
    stateFilter: TOOL_BLOCK_SECTION
  }
];

// tools controller

export default class Controls {
  constructor(canvas) {
    this.canvas = canvas;
    this.activeState = 1;

    canvas.addEventListener("keyup", event => this.onKeyUp(event.keyCode));
    canvas.addEventListener("keydown", event => this.onKeyDown(event.keyCode));
  }

  onKeyUp(keyCode) {}

  onKeyDown(keyCode) {
    if (toolHotkeys[keyCode]) {
      this.activeState = toolHotkeys[keyCode];
      // tool changed
    }

    if (secondaryHotkeys[keyCode]) {
      const action = secondaryHotkeys[keyCode];

      switch (this.activeState) {
        case TOOL_BLOCK_SECTION:
          if (action === ACTION_GROUP) {
            console.log("group");
          } else if (action === ACTION_UNGROUP) {
            console.log("ungroup");
          }
          break;
      }
    }
  }

  helpLine() {
    const names = [
      "DELETE",
      "LINES",
      "LARGE",
      "SMALL",
      "SMALL2",
      "BLOCK",
      "SWITCH"
    ];
    const text = names.map((v, i) => `${i}&nbsp;${v}&emsp;`).join();

    this.canvas = canvas;
  }
}
