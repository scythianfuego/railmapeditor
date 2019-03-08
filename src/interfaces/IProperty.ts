export interface IProperty {
  label: string;
  type: "label" | "text" | "number" | "select" | "boolean";
  id?: string;
  value?: number | string | boolean;
  options?: string[];
  onChange?: () => void;
}
