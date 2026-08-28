/**
 * Utility functions for table & location sorting, label formatting, and code generation.
 */

export function formatLocationLabel(rawLabel: string): string {
  const trimmed = rawLabel.trim();
  const tableMatch = trimmed.match(/^(?:Table\s*|T\s*[-_]?\s*)?(\d+)$/i);
  if (tableMatch) {
    return `Table ${parseInt(tableMatch[1], 10)}`;
  }
  return trimmed;
}

export function formatLocationCode(rawLabel: string): string {
  const trimmed = rawLabel.trim();
  const tableMatch = trimmed.match(/^(?:Table\s*|T\s*[-_]?\s*)?(\d+)$/i);
  if (tableMatch) {
    return `T${parseInt(tableMatch[1], 10)}`;
  }
  return trimmed.toUpperCase().replace(/\s+/g, "-");
}

export function naturalSortLocations<
  T extends { label?: string; code?: string; type?: string },
>(locations: T[]): T[] {
  const getSortKey = (loc: T) => {
    const label = (loc.label || loc.code || "").trim();
    // Match "Table 1", "T1", "T-1", "Table-1", "1"
    const match = label.match(/^(?:Table\s*|T\s*[-_]?\s*)?(\d+)$/i);
    if (match) {
      return { isTableNumber: true, num: parseInt(match[1], 10), text: label };
    }
    // Has number at the end e.g. "VIP 2", "Cabin 1", "Outdoor 3"
    const generalNumMatch = label.match(/^([A-Za-z\s-_]+?)\s*(\d+)$/);
    if (generalNumMatch) {
      return {
        isTableNumber: false,
        num: parseInt(generalNumMatch[2], 10),
        text: generalNumMatch[1].trim(),
      };
    }
    return { isTableNumber: false, num: Infinity, text: label };
  };

  return [...locations].sort((a, b) => {
    if (a.type && b.type && a.type !== b.type) {
      return a.type.localeCompare(b.type);
    }
    const keyA = getSortKey(a);
    const keyB = getSortKey(b);

    // Numbered tables come first in exact numerical ascending order: 1, 2, 3, 4...
    if (keyA.isTableNumber && keyB.isTableNumber) {
      return keyA.num - keyB.num;
    }
    if (keyA.isTableNumber) return -1;
    if (keyB.isTableNumber) return 1;

    // Other named sections alphabetically + numerically
    if (keyA.text.toLowerCase() !== keyB.text.toLowerCase()) {
      return keyA.text.localeCompare(keyB.text, undefined, { numeric: true });
    }
    return keyA.num - keyB.num;
  });
}
