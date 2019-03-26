import css from "raw-loader!./propertyEditor.css";
import { IProperty } from "../interfaces/IProperty";
import IKeyValue from "../interfaces/IKeyValue";

export default class PropertyEditor extends HTMLElement {
  // private data:
  public render: any;
  private _data: IProperty[];
  private root: ShadowRoot;

  public set data(data: any) {
    this._data = data;
    this.populate(data);
  }

  public get data() {
    return this._data;
  }

  constructor() {
    super();

    this.root = this.attachShadow({ mode: "closed" });
    this.root.innerHTML = `<style>${css}</style>
      <div class="properties-box"></div>`;

    this.render = () => {
      console.log("r");
    };
  }

  public get userInput() {
    const values: IKeyValue[] = Array.from(
      this.root.querySelectorAll(".property-value")
    ).map((v: HTMLInputElement) => ({
      id: v.getAttribute("data-id"),
      type: v.getAttribute("data-type"),
      value: v.value
    }));

    return values.reduce((acc: IKeyValue, curr: IKeyValue) => {
      let { id, type, value } = curr;
      // type conversion
      switch (type) {
        case "boolean":
          value = value === "true" ? true : false;
          break;

        case "number":
          value = Number.parseFloat(value);

        default:
          break;
      }
      acc[id] = value;
      return acc;
    }, {});
    // const ids = this._data.map(v => v.id).filter(v => v != null);
    // return ids.reduce((acc: IKeyValue, curr, i) => {
    //   acc[curr] = values[i];
    //   return acc;
    // }, {});
  }

  get hidden() {
    return this.hasAttribute("hidden");
  }

  set hidden(val) {
    // Reflect the value of `disabled` as an attribute.
    const container: HTMLElement = this.root.querySelector(".properties-box");
    if (val) {
      this.setAttribute("hidden", "");
      container.style.display == "none";
    } else {
      this.removeAttribute("hidden");
      container.style.display == "block";
    }
  }

  populate(data: IProperty[]) {
    const container = this.root.querySelector(".properties-box");
    container.innerHTML = "";

    data.forEach(line => {
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

      let type = line.type;
      let options = line.options;
      if (line.type === "boolean") {
        type = "select";
        options = ["false", "true"];
      }

      switch (type) {
        case "text":
        case "number":
          value = document.createElement("input");
          value.classList.add("property-value");
          value.setAttribute("type", type);
          value.setAttribute("value", v);
          value.setAttribute("data-id", line.id);
          value.setAttribute("data-type", line.type);
          break;

        case "select":
          value = document.createElement("select");
          value.classList.add("property-value");
          value.setAttribute("data-id", line.id);
          value.setAttribute("data-type", line.type);
          options.forEach(o => {
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
          value.setAttribute("data-id", line.id);
          value.setAttribute("data-type", line.type);
          value.innerText = v;
          break;
      }

      if (line.onChange) {
        value.addEventListener("change", line.onChange);
      }

      container.append(name, value);
    });

    const submit = document.createElement("div");
    submit.classList.add("properties-submit");
    const save = document.createElement("div");
    save.classList.add("properties-save");
    save.innerText = "Save";
    save.addEventListener("click", () => {
      const changeEvent = new Event("change", {
        bubbles: true,
        cancelable: false
      });
      this.dispatchEvent(changeEvent);
    });
    submit.append(save);
    container.append(submit);
  }
}
