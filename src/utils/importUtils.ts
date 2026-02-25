/**
 * CSV Import Utilities
 */

export const parseCSV = (text: string): { headers: string[]; rows: string[][] } => {
  const lines = text.split("\n").filter(line => line.trim());
  if (lines.length < 1) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
  const rows = lines.slice(1).map(line => parseLine(line).map(v => v.replace(/^"|"$/g, '').trim()));

  return { headers, rows };
};

export const findColumnIndex = (headers: string[], ...keywords: string[]): number => {
  return headers.findIndex(h => keywords.some(k => h.includes(k)));
};

export const parseNumericValue = (value: string | null | undefined): number => {
  if (!value) return 0;
  const cleaned = value.replace(/[^0-9.\-]/g, '');
  return parseFloat(cleaned) || 0;
};

export const triggerFileInput = (
  accept: string,
  onFile: (file: File) => void
) => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = accept;
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) onFile(file);
  };
  input.click();
};
