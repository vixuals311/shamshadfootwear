import { Printer, ChevronDown, FileText, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { PaperSize } from "@/utils/printUtils";
import { getPrintDefault, type PrintDocType } from "@/utils/printPreferences";

interface PrintButtonProps {
  docType: PrintDocType;
  onPrint: (size: PaperSize) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "outline" | "secondary" | "ghost";
  iconOnly?: boolean;
}

/**
 * Split print button:
 *  - Main click prints with the user's saved default for this doc type.
 *  - Caret opens a menu to override paper size for this print only.
 */
export function PrintButton({
  docType,
  onPrint,
  disabled,
  label = "Print",
  className,
  size = "sm",
  variant = "outline",
  iconOnly = false,
}: PrintButtonProps) {
  const handleDefault = () => {
    onPrint(getPrintDefault(docType));
  };

  return (
    <div className={cn("inline-flex items-stretch", className)}>
      <Button
        variant={variant}
        size={size}
        onClick={handleDefault}
        disabled={disabled}
        className="rounded-r-none gap-2"
        type="button"
      >
        <Printer className="w-4 h-4" />
        {!iconOnly && <span className="hidden sm:inline">{label}</span>}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            disabled={disabled}
            className="rounded-l-none border-l-0 px-2"
            type="button"
            aria-label="Choose paper size"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="text-xs">Print as…</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onPrint("A4")} className="gap-2">
            <FileText className="w-4 h-4" /> A4 (full page)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onPrint("slip80")} className="gap-2">
            <Receipt className="w-4 h-4" /> Slip 80mm
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}