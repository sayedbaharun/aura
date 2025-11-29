/**
 * Utilities for parsing and manipulating GitHub Flavored Markdown tables
 */

export interface ParsedTable {
  headers: string[];
  rows: string[][];
  alignments: ('left' | 'center' | 'right' | null)[];
}

/**
 * Parse a markdown table string into structured data
 * Supports GFM table format with alignment indicators
 */
export function parseMarkdownTable(markdown: string): ParsedTable | null {
  const lines = markdown.trim().split('\n').filter(line => line.trim());

  if (lines.length < 2) {
    return null; // Need at least header and separator rows
  }

  // Parse header row
  const headerLine = lines[0];
  if (!headerLine.includes('|')) {
    return null;
  }

  const headers = headerLine
    .split('|')
    .map(cell => cell.trim())
    .filter((cell, index, arr) => {
      // Remove empty cells at start/end (from leading/trailing pipes)
      return cell !== '' || (index !== 0 && index !== arr.length - 1);
    });

  // Parse separator row to detect alignments
  const separatorLine = lines[1];
  if (!separatorLine.includes('|') || !separatorLine.includes('-')) {
    return null;
  }

  const separatorCells = separatorLine
    .split('|')
    .map(cell => cell.trim())
    .filter((cell, index, arr) => {
      return cell !== '' || (index !== 0 && index !== arr.length - 1);
    });

  const alignments: ('left' | 'center' | 'right' | null)[] = separatorCells.map(cell => {
    const leftColon = cell.startsWith(':');
    const rightColon = cell.endsWith(':');

    if (leftColon && rightColon) return 'center';
    if (rightColon) return 'right';
    if (leftColon) return 'left';
    return null;
  });

  // Ensure header count matches separator count
  if (headers.length !== alignments.length) {
    // Adjust headers or alignments to match
    const columnCount = Math.max(headers.length, alignments.length);
    while (headers.length < columnCount) headers.push('');
    while (alignments.length < columnCount) alignments.push(null);
    headers.length = columnCount;
    alignments.length = columnCount;
  }

  // Parse data rows
  const rows: string[][] = [];
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes('|')) continue;

    const cells = line
      .split('|')
      .map(cell => cell.trim())
      .filter((cell, index, arr) => {
        return cell !== '' || (index !== 0 && index !== arr.length - 1);
      });

    // Pad or trim to match header count
    while (cells.length < headers.length) cells.push('');
    cells.length = headers.length;

    rows.push(cells);
  }

  return {
    headers,
    rows,
    alignments,
  };
}

/**
 * Serialize a ParsedTable back to markdown format
 */
export function serializeMarkdownTable(table: ParsedTable): string {
  const { headers, rows, alignments } = table;

  // Calculate column widths for better formatting
  const columnWidths = headers.map((header, colIndex) => {
    const headerWidth = header.length;
    const maxRowWidth = Math.max(
      0,
      ...rows.map(row => (row[colIndex] || '').length)
    );
    return Math.max(3, headerWidth, maxRowWidth); // Minimum width of 3
  });

  // Helper to pad cell content
  const padCell = (content: string, width: number, alignment: 'left' | 'center' | 'right' | null) => {
    const padding = width - content.length;
    if (padding <= 0) return content;

    if (alignment === 'center') {
      const leftPad = Math.floor(padding / 2);
      const rightPad = padding - leftPad;
      return ' '.repeat(leftPad) + content + ' '.repeat(rightPad);
    } else if (alignment === 'right') {
      return ' '.repeat(padding) + content;
    } else {
      return content + ' '.repeat(padding);
    }
  };

  // Create separator cells based on alignment
  const createSeparator = (width: number, alignment: 'left' | 'center' | 'right' | null) => {
    const dashes = '-'.repeat(width);
    if (alignment === 'center') return ':' + dashes.substring(2) + ':';
    if (alignment === 'right') return dashes.substring(1) + ':';
    if (alignment === 'left') return ':' + dashes.substring(1);
    return dashes;
  };

  // Build header row
  const headerRow = '| ' + headers.map((header, i) =>
    padCell(header, columnWidths[i], alignments[i])
  ).join(' | ') + ' |';

  // Build separator row
  const separatorRow = '| ' + alignments.map((alignment, i) =>
    createSeparator(columnWidths[i], alignment)
  ).join(' | ') + ' |';

  // Build data rows
  const dataRows = rows.map(row =>
    '| ' + row.map((cell, i) =>
      padCell(cell, columnWidths[i], alignments[i])
    ).join(' | ') + ' |'
  );

  return [headerRow, separatorRow, ...dataRows].join('\n');
}

/**
 * Find a table in text based on cursor position
 * Returns the parsed table, start index, and end index
 */
export function findTableInText(
  text: string,
  cursorPosition: number
): { table: ParsedTable; startIndex: number; endIndex: number } | null {
  const lines = text.split('\n');
  let currentIndex = 0;
  let tableStartLine = -1;
  let tableEndLine = -1;
  let cursorLine = -1;

  // Find which line the cursor is on
  for (let i = 0; i < lines.length; i++) {
    const lineLength = lines[i].length + 1; // +1 for newline
    if (currentIndex <= cursorPosition && cursorPosition <= currentIndex + lineLength) {
      cursorLine = i;
      break;
    }
    currentIndex += lineLength;
  }

  if (cursorLine === -1) return null;

  // Check if cursor line is part of a table
  if (!lines[cursorLine].includes('|')) {
    return null;
  }

  // Find table boundaries by scanning up and down
  // Scan up to find start
  tableStartLine = cursorLine;
  for (let i = cursorLine - 1; i >= 0; i--) {
    if (lines[i].includes('|')) {
      tableStartLine = i;
    } else {
      break;
    }
  }

  // Scan down to find end
  tableEndLine = cursorLine;
  for (let i = cursorLine + 1; i < lines.length; i++) {
    if (lines[i].includes('|')) {
      tableEndLine = i;
    } else {
      break;
    }
  }

  // Extract table text
  const tableLines = lines.slice(tableStartLine, tableEndLine + 1);
  const tableText = tableLines.join('\n');

  // Parse the table
  const parsedTable = parseMarkdownTable(tableText);
  if (!parsedTable) return null;

  // Calculate start and end indices in original text
  const startIndex = lines.slice(0, tableStartLine).join('\n').length + (tableStartLine > 0 ? 1 : 0);
  const endIndex = startIndex + tableText.length;

  return {
    table: parsedTable,
    startIndex,
    endIndex,
  };
}

/**
 * Helper to create an empty table
 */
export function createEmptyTable(rows: number = 3, cols: number = 3): ParsedTable {
  return {
    headers: Array(cols).fill('').map((_, i) => `Header ${i + 1}`),
    rows: Array(rows).fill(null).map(() => Array(cols).fill('')),
    alignments: Array(cols).fill(null),
  };
}
