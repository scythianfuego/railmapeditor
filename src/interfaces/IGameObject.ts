import IKeyValue from "./IKeyValue";

export default interface IGameObject extends IKeyValue {
  type: string;
  x: number;
  y: number;
  zindex: number;
}
