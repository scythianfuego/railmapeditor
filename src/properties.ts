interface IProperty {
  label: string;
  type: "label" | "text" | "select" | "boolean";
  id?: string;
  value?: number | string | boolean;
  options?: string[];
}

// prettier-ignore
const defaults: IProperty[] = [
  { label:"Layout", type:"label" },
  { label:"Width", type:"text", id:"width", value: 250},
  { label:"Height", type:"text", id:"height", value: 0},
  { label:"Data loading", type:"label" },
  { label:"Data url", type:"text", id:"url", value:"https://webix.com/data"},
  { label:"Type", type:"select", options:["json","xml","csv"], id:"type", value: 'xml'},
  { label:"Position", type:"select", options:["1", "2", "3"], id:"position"},
  { label:"Color", type:"text", options: [], id:"color"},
  { label:"Color", type:"boolean", value: false, id:"color"},
  { label:"Use JSONP", type:"text", id:"jsonp"}
];

type KeyValue = {
  [index: string]: any;
};

export default class PropertyEditor {
  // private data:

  constructor() {}

  read() {
    const values: string[] = Array.from(
      document.querySelectorAll(".property-value")
    ).map((v: HTMLInputElement) => v.value);

    const ids = defaults.map(v => v.id);
    return ids.reduce((acc: KeyValue, curr, i) => {
      acc[curr] = values[i];
      return acc;
    }, {});
  }

  create(json: string) {
    const container = document.querySelector(".properties-box");
    container.innerHTML = "";

    defaults.forEach(line => {
      if (line.type === "label") {
        const label = document.createElement("div");
        label.classList.add("property-title");
        label.innerText = line.label;
        container.append(label);
        return;
      }

      const name = document.createElement("div");
      name.classList.add("property-name");
      name.innerText = line.label;

      let value: HTMLElement;
      const v = line.value != null ? line.value.toString() : "";

      if (line.type === "boolean") {
        line.type = "select";
        line.options = ["true", "false"];
      }

      switch (line.type) {
        case "text":
          value = document.createElement("input");
          value.classList.add("property-value");
          value.setAttribute("type", "text");
          value.setAttribute("value", v);
          break;

        case "select":
          value = document.createElement("select");
          value.classList.add("property-value");
          line.options.forEach(o => {
            const option = document.createElement("option");
            option.innerText = o;
            o === v && option.setAttribute("selected", "selected");
            value.append(option);
          });
          break;

        default:
          value = document.createElement("input");
          value.classList.add("property-value");
          value.setAttribute("type", "text");
          value.setAttribute("disabled", "disabled");
          value.innerText = v;
          break;
      }

      container.append(name, value);
    });

    const submit = document.createElement("div");
    submit.classList.add("properties-submit");
    const save = document.createElement("div");
    save.classList.add("properties-save");
    save.innerText = "Save";
    save.addEventListener("click", () => alert("saved"));
    submit.append(save);
    container.append(submit);
  }
}
