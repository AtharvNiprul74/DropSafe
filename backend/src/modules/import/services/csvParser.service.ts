import { ValidationError } from '../../../core/errors/AppError';

export interface ParsedCsvResult {
  headers: string[];
  rows: Record<string, string>[];
  totalRawRows: number;
}

/**
 * Resilient, RFC 4180 compliant CSV parser with support for:
 * - UTF-8 Byte Order Mark (BOM) stripping
 * - Windows (\r\n) and Unix (\n) line endings
 * - Quoted fields containing commas, spaces, and escaped quotes ("")
 * - Trimming empty lines and normalising headers
 */
export class CsvParserService {
  /**
   * Parse CSV from a string or Buffer
   */
  public parse(content: string | Buffer): ParsedCsvResult {
    let text = typeof content === 'string' ? content : content.toString('utf-8');

    // 1. Strip UTF-8 Byte Order Mark (BOM) if present
    if (text.charCodeAt(0) === 0xfeff) {
      text = text.slice(1);
    }

    // 2. Binary / encoding check: look for excessive null bytes or control characters
    if (text.includes('\0')) {
      throw new ValidationError('File encoding error: Binary or corrupted file detected');
    }

    if (!text.trim()) {
      throw new ValidationError('File content error: CSV file is empty');
    }

    // 3. Tokenize lines considering quoted multi-line fields
    const lines = this.tokenizeLines(text);

    if (lines.length === 0) {
      throw new ValidationError('File content error: No data rows found in CSV');
    }

    // 4. Extract headers
    const rawHeaders = this.parseCsvLine(lines[0]);
    if (rawHeaders.length === 0 || rawHeaders.every((h) => !h.trim())) {
      throw new ValidationError('Fatal Stage 1 Error: CSV file does not contain valid headers');
    }

    const headers = rawHeaders.map((h) => h.trim());

    // 5. Parse data rows
    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue; // skip blank lines

      const values = this.parseCsvLine(line);
      const rowObj: Record<string, string> = {};

      for (let j = 0; j < headers.length; j++) {
        rowObj[headers[j]] = values[j] !== undefined ? values[j].trim() : '';
      }

      rows.push(rowObj);
    }

    return {
      headers,
      rows,
      totalRawRows: rows.length,
    };
  }

  /**
   * Tokenize full CSV text into logical lines, preserving newlines within double quotes
   */
  private tokenizeLines(csvText: string): string[] {
    const lines: string[] = [];
    let currentLine = '';
    let insideQuote = false;

    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];

      if (char === '"') {
        if (insideQuote && nextChar === '"') {
          // Escaped quote
          currentLine += '""';
          i++; // skip next quote
        } else {
          insideQuote = !insideQuote;
          currentLine += '"';
        }
      } else if ((char === '\n' || char === '\r') && !insideQuote) {
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip \n in \r\n
        }
        if (currentLine.trim().length > 0) {
          lines.push(currentLine);
        }
        currentLine = '';
      } else {
        currentLine += char;
      }
    }

    if (currentLine.trim().length > 0) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Parse a single logical CSV line into cell values
   */
  private parseCsvLine(line: string): string[] {
    const cells: string[] = [];
    let currentCell = '';
    let insideQuote = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (insideQuote && nextChar === '"') {
          currentCell += '"';
          i++; // skip escaped quote
        } else {
          insideQuote = !insideQuote;
        }
      } else if (char === ',' && !insideQuote) {
        cells.push(currentCell);
        currentCell = '';
      } else {
        currentCell += char;
      }
    }

    cells.push(currentCell);
    return cells;
  }
}

export const csvParserService = new CsvParserService();
