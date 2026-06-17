import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Printer, X, CheckCircle2 } from "lucide-react";
import { shouldAutoPrint, type AutoPrintDocType } from "@/utils/printPreferences";

export interface AutoPrintDetailRow {
  label: string;
  value: string;
  highlight?: boolean;
}

interface AutoPrintModalState {
  open: boolean;
  title: string;
  description: string;
  details: AutoPrintDetailRow[];
  buildHtml: (() => string) | null;
}

interface AutoPrintModalContextValue {
  prompt: (
    title: string,
    description: string,
    details: AutoPrintDetailRow[],
    buildHtml: () => string
  ) => void;
}

const AutoPrintModalContext = createContext<AutoPrintModalContextValue | null>(null);

export function AutoPrintModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AutoPrintModalState>({
    open: false,
    title: "",
    description: "",
    details: [],
    buildHtml: null,
  });

  const prompt = useCallback(
    (title: string, description: string, details: AutoPrintDetailRow[], buildHtml: () => string) => {
      setState({ open: true, title, description, details, buildHtml });
    },
    []
  );

  const handlePrint = useCallback(() => {
    if (state.buildHtml) {
      const html = state.buildHtml();
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(html);
        w.document.close();
      }
    }
    setState((prev) => ({ ...prev, open: false }));
  }, [state.buildHtml]);

  const handleSkip = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  const hasDetails = state.details.length > 0;

  return (
    <AutoPrintModalContext.Provider value={{ prompt }}>
      {children}
      <Dialog open={state.open} onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-md [&>button]:hidden"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader className="items-center text-center gap-2">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-success" />
            </div>
            <DialogTitle className="text-xl">{state.title}</DialogTitle>
            {state.description && (
              <DialogDescription className="text-base">
                {state.description}
              </DialogDescription>
            )}
          </DialogHeader>

          {hasDetails && (
            <div className="rounded-lg border border-border bg-muted/30 overflow-hidden">

              <Table>
                <TableBody>
                  {state.details.map((row, index) => (
                    <TableRow
                      key={index}
                      className={row.highlight ? "bg-success/5" : undefined}
                    >
                      <TableCell className="py-3 px-4 text-muted-foreground font-medium w-1/2">
                        {row.label}
                      </TableCell>
                      <TableCell
                        className={`py-3 px-4 text-right font-semibold ${
                          row.highlight ? "text-success" : "text-foreground"
                        }`}
                      >
                        {row.value}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleSkip}
              className="w-full sm:w-auto"
            >
              <X className="w-4 h-4 mr-2" />
              Skip
            </Button>
            <Button
              onClick={handlePrint}
              className="w-full sm:w-auto"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AutoPrintModalContext.Provider>
  );
}

export function useAutoPrintModal() {
  const ctx = useContext(AutoPrintModalContext);
  if (!ctx) {
    throw new Error(
      "useAutoPrintModal must be used within an AutoPrintModalProvider"
    );
  }
  return ctx;
}

/**
 * Opens a centered, blocking "Print?" modal for the given document type.
 * Only opens when both the global auto-print master switch AND the
 * per-document toggle are enabled.
 */
export function useAutoPrintModalPrompt() {
  const { prompt } = useAutoPrintModal();
  return useCallback(
    (
      docType: AutoPrintDocType,
      title: string,
      description: string,
      buildHtml: () => string,
      details?: AutoPrintDetailRow[]
    ) => {
      if (!shouldAutoPrint(docType)) return;
      prompt(title, description, details || [], buildHtml);
    },
    [prompt]
  );
}
