import { toast } from "sonner";
import { shouldAutoPrint, type AutoPrintDocType } from "./printPreferences";

/**
 * Show a sticky "Print?" toast after a record is saved. Only fires when both
 * the global auto-print master switch AND the per-document toggle are ON.
 *
 * `buildHtml` is called lazily on click so it captures the latest snapshot
 * of the saved record (e.g. number, totals) without re-running side effects.
 */
export function promptAutoPrint(
  docType: AutoPrintDocType,
  title: string,
  description: string,
  buildHtml: () => string,
) {
  if (!shouldAutoPrint(docType)) return;

  const id = toast(title, {
    description,
    duration: Infinity, // sticky until dismissed
    action: {
      label: "Print",
      onClick: () => {
        try {
          const html = buildHtml();
          const w = window.open("", "_blank");
          if (w) {
            w.document.write(html);
            w.document.close();
          }
        } finally {
          toast.dismiss(id);
        }
      },
    },
    cancel: {
      label: "Skip",
      onClick: () => toast.dismiss(id),
    },
  });
}
