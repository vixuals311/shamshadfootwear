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
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { shouldAutoPrint, type AutoPrintDocType } from "@/utils/printPreferences";

interface AutoPrintModalState {
  open: boolean;
  title: string;
  description: string;
  buildHtml: (() => string) | null;
}

interface AutoPrintModalContextValue {
  prompt: (title: string, description: string, buildHtml: () => string) => void;
}

const AutoPrintModalContext = createContext<AutoPrintModalContextValue | null>(null);

export function AutoPrintModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AutoPrintModalState>({
    open: false,
    title: "",
    description: "",
    buildHtml: null,
  });

  const prompt = useCallback(
    (title: string, description: string, buildHtml: () => string) => {
      setState({ open: true, title, description, buildHtml });
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

  return (
    <AutoPrintModalContext.Provider value={{ prompt }}>
      {children}
      <Dialog open={state.open} onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-md [&>button]:hidden"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{state.title}</DialogTitle>
            <DialogDescription>{state.description}</DialogDescription>
          </DialogHeader>
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
      buildHtml: () => string
    ) => {
      if (!shouldAutoPrint(docType)) return;
      prompt(title, description, buildHtml);
    },
    [prompt]
  );
}
