import Papa from 'papaparse';

export interface CsvTable {
  headers: string[];
  rows: string[][];
  delimiter: string;
}

export function decodeBytes(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

export function parseCsv(text: string): CsvTable {
  const result = Papa.parse<string[]>(text, {
    delimitersToGuess: [';', ',', '\t'],
    skipEmptyLines: 'greedy',
  });
  const [headers = [], ...rows] = result.data;
  return { headers: headers.map((h) => h.trim()), rows, delimiter: result.meta.delimiter };
}
