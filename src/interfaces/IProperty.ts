export interface IProperty {
  label: string;
  type: "label" | "text" | "select" | "boolean";
  id?: string;
  value?: number | string | boolean;
  options?: string[];
  onChange?: () => void;
}
