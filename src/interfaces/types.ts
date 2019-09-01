import { Hex as HoneycombHex, Grid, GridFactory } from "honeycomb-grid";
import IRail from "./IRail";

export type HexParams = { size: number };
export type GridTools = GridFactory<HoneycombHex<HexParams>>;
export type Hex = HoneycombHex<HexParams>;
export type Grid = Grid;

export type Tool = (hex: Hex) => IRail;
export type Tools = { [index: number]: Tool[] };