declare module "*.css";

declare module "lzma/src/lzma_worker-min.js" {
  export namespace LZMA {
    export function compress(
      data: string | number[],
      mode?: number,
      on_finish?: (result: number[], error: Error) => void,
      on_progress?: (percent: number) => void
    ): number[];
    export function decompress(
      data: number[],
      on_finish?: (result: number[], error: Error) => void,
      on_progress?: (percent: number) => void
    ): string | number[];
  }
}
