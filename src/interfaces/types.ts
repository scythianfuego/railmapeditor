import { Point } from "./Point";
import {
  Hex as HoneycombHex,
  HexFactory as HoneycombHexFactory,
  Grid as HoneycombGrid,
  Point as HoneycombPoint,
  GridFactory
} from "honeycomb-grid";
import IRail from "./IRail";

export type HexParams = { size: number };
export type GridTools = GridFactory<HoneycombHex<HexParams>>;
export type Hex = HoneycombHex<HexParams>;
export type HexFactory = HoneycombHexFactory<HexParams>;
export type Grid = HoneycombGrid;
export type Point = HoneycombPoint;

export type Tool = (hex: Hex) => IRail;
export type Tools = { [index: number]: Tool[] };
