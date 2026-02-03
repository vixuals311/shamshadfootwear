import { format } from "date-fns";

/**
 * Converts an array of objects to CSV string
 */
export const convertToCSV = <T extends Record<string, any>>(
  data: T[],
  columns: { key: keyof T | string; header: string; format?: (value: any, row: T) => string }[]
): string => {
  if (data.length === 0) return "";

  // Header row
  const headers = columns.map((col) => `"${col.header}"`).join(",");

  // Data rows
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const keys = (col.key as string).split(".");
        let value: any = row;
        for (const k of keys) {
          value = value?.[k];
        }
        
        if (col.format) {
          value = col.format(value, row);
        }
        
        // Escape quotes and wrap in quotes
        if (value === null || value === undefined) {
          return '""';
        }
        return `"${String(value).replace(/"/g, '""')}"`;
      })
      .join(",")
  );

  return [headers, ...rows].join("\n");
};

/**
 * Downloads CSV content as a file
 */
export const downloadCSV = (csvContent: string, filename: string): void => {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${format(new Date(), "yyyy-MM-dd")}.csv`);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export data as CSV with automatic download
 */
export const exportToCSV = <T extends Record<string, any>>(
  data: T[],
  columns: { key: keyof T | string; header: string; format?: (value: any, row: T) => string }[],
  filename: string
): void => {
  const csvContent = convertToCSV(data, columns);
  downloadCSV(csvContent, filename);
};
