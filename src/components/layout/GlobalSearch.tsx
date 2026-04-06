import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, User, Package, FileText, FileCheck, X, Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: "client" | "product" | "invoice" | "cheque";
  url: string;
}

const typeIcons = {
  client: User,
  product: Package,
  invoice: FileText,
  cheque: FileCheck,
};

const typeLabels = {
  client: "Client",
  product: "Product",
  invoice: "Invoice",
  cheque: "Cheque",
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Search
  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const searchTerm = `%${q}%`;
      const [clients, products, invoices, cheques] = await Promise.all([
        supabase.from("clients").select("id, name, phone, city").ilike("name", searchTerm).limit(5),
        supabase.from("products").select("id, name, article_number, category").ilike("name", searchTerm).limit(5),
        supabase.from("invoices").select("id, invoice_number, total, status").ilike("invoice_number", searchTerm).limit(5),
        supabase.from("cheques").select("id, cheque_number, given_to, amount").ilike("cheque_number", searchTerm).limit(5),
      ]);

      const mapped: SearchResult[] = [
        ...(clients.data || []).map((c) => ({
          id: c.id,
          title: c.name,
          subtitle: `${c.phone}${c.city ? ` • ${c.city}` : ""}`,
          type: "client" as const,
          url: `/clients?selected=${c.id}`,
        })),
        ...(products.data || []).map((p) => ({
          id: p.id,
          title: p.name,
          subtitle: `Art# ${p.article_number} • ${p.category}`,
          type: "product" as const,
          url: `/inventory?search=${encodeURIComponent(p.name)}`,
        })),
        ...(invoices.data || []).map((i) => ({
          id: i.id,
          title: `Invoice ${i.invoice_number}`,
          subtitle: `Rs ${i.total.toLocaleString()} • ${i.status}`,
          type: "invoice" as const,
          url: `/invoices?search=${encodeURIComponent(i.invoice_number)}`,
        })),
        ...(cheques.data || []).map((ch) => ({
          id: ch.id,
          title: `Cheque #${ch.cheque_number}`,
          subtitle: `${ch.given_to} • Rs ${ch.amount.toLocaleString()}`,
          type: "cheque" as const,
          url: `/cheques?search=${encodeURIComponent(ch.cheque_number)}`,
        })),
      ];
      setResults(mapped);
      setSelectedIndex(0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setQuery("");
    navigate(result.url);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  return (
    <>
      {/* Trigger button in header */}
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 text-muted-foreground text-sm hover:bg-muted transition-colors border border-transparent hover:border-border"
      >
        <Search className="w-4 h-4" />
        <span>Search...</span>
        <kbd className="ml-2 text-xs bg-background px-1.5 py-0.5 rounded border border-border font-mono">
          ⌘K
        </kbd>
      </button>
      {/* Mobile trigger */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
      >
        <Search className="w-5 h-5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden [&>button]:hidden">
          <div className="flex items-center gap-2 px-4 border-b border-border">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search clients, products, invoices, cheques..."
              className="border-0 focus-visible:ring-0 h-12 text-base"
              autoFocus
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!loading && query.length >= 2 && results.length === 0 && (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No results found for "{query}"
              </div>
            )}

            {!loading && results.length > 0 && (
              <div className="py-2">
                {results.map((result, index) => {
                  const Icon = typeIcons[result.type];
                  return (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleSelect(result)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                        index === selectedIndex ? "bg-muted" : "hover:bg-muted/50"
                      )}
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{result.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                      </div>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded shrink-0">
                        {typeLabels[result.type]}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {!loading && query.length < 2 && (
              <div className="py-8 text-center text-muted-foreground text-sm">
                Type at least 2 characters to search
              </div>
            )}
          </div>

          <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
            <span><kbd className="font-mono bg-muted px-1 rounded">↑↓</kbd> Navigate</span>
            <span><kbd className="font-mono bg-muted px-1 rounded">↵</kbd> Select</span>
            <span><kbd className="font-mono bg-muted px-1 rounded">Esc</kbd> Close</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
