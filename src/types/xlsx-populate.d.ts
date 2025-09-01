// src/types/xlsx-populate.d.ts
declare module "xlsx-populate" {
  namespace XlsxPopulate {
    type Color = string;

    interface Range {
      value(v?: any): any;
      style(name: any, value?: any): this;
    }

    interface Sheet {
      name(name?: string): string | this;
      cell(row: number, col: number): Range;
      row(index: number): Range;
      column(index: number): Range;
      range(r1: number, c1: number, r2: number, c2: number): Range;
      addSheet?(name: string): Sheet; // algunos tipos
      autoFilter?(r1: number, c1: number, r2: number, c2: number): this;
      freezePanes?(row: number, col: number): this;
    }

    interface Workbook {
      sheet(indexOrName?: number | string): Sheet;
      addSheet(name: string): Sheet;
      outputAsync(): Promise<ArrayBuffer>;
    }

    function fromBlankAsync(): Promise<Workbook>;
  }

  const XlsxPopulate: {
    fromBlankAsync: typeof XlsxPopulate.fromBlankAsync;
  };

  export default XlsxPopulate;
}
