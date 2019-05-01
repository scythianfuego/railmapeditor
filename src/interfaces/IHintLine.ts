export default interface IHintLine {
  tag: string;
  text: string;
  action: number;
  show: number[];
  on?: number;

  active?: boolean;
  selected?: boolean;
}
