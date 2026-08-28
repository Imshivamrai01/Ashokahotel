import * as XLSX from "xlsx";

/** Parse the first sheet of an .xlsx/.xls/.csv file into row objects (header-keyed). */
export function parseSheet(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, {
          defval: "",
          raw: false,
        });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsArrayBuffer(file);
  });
}

/** Download rows as a real .xlsx file. */
export function exportXlsx(
  rows: Record<string, unknown>[],
  filename: string,
  sheetName = "Sheet1",
): void {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

/** Download a sample template (header row + one example row) as .xlsx. */
export function downloadTemplate(
  headers: string[],
  example: Record<string, unknown>,
  filename: string,
): void {
  exportXlsx([example], filename);
  void headers;
}
