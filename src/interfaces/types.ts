import { Point } from "./Point";

import IRail from "./IRail";

export type Tool = (point: number[]) => IRail;
export type Tools = { [index: number]: Tool[] };
