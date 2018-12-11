import css from "raw-loader!./propertyEditor.css";

export interface IProperty {
  label: string;
  type: "label" | "text" | "select" | "boolean";
  id?: string;
  value?: number | string | boolean;
  options?: string[];
}

type KeyValue = {
  [index: string]: any;
};

export default class PropertyEditor extends HTMLElement {
  // private data:
  public render: any;
  private _data: IProperty[];

  public set data(data: any) {
    this._data = data;
    this.create(data);
  }

  public get data() {
    return this.data;
  }

  constructor() {
    super();

    const shadowRoot = this.attachShadow({ mode: "open" });
    shadowRoot.innerHTML = `<style>${css}</style>
      <div class="properties-box"></div>`;

    this.render = () => {
      console.log("r");
    };
  }

  public get userInput() {
    const values: string[] = Array.from(
      document.querySelectorAll(".property-value")
    ).map((v: HTMLInputElement) => v.value);

    const ids = this._data.map(v => v.id);
    return ids.reduce((acc: KeyValue, curr, i) => {
      acc[curr] = values[i];
      return acc;
    }, {});
  }

  connectedCallback() {}

  create(data: IProperty[]) {
    const container = this.shadowRoot.querySelector(".properties-box");
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
