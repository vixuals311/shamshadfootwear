import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ReferenceComboboxProps {
  value: string;
  onChange: (value: string) => void;
  existingReferences: string[];
  placeholder?: string;
}

export function ReferenceCombobox({
  value,
  onChange,
  existingReferences,
  placeholder = "Select or type reference...",
}: ReferenceComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const uniqueRefs = useMemo(() => {
    const refMap = new Map<string, string>();
    existingReferences.forEach((ref) => {
      if (ref && ref !== "N/A") {
        const lower = ref.toLowerCase().trim();
        if (!refMap.has(lower)) {
          refMap.set(lower, ref.trim());
        }
      }
    });
    return Array.from(refMap.values()).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  }, [existingReferences]);

  const searchMatchesExisting = useMemo(() => {
    const searchLower = searchValue.toLowerCase().trim();
    return uniqueRefs.some((r) => r.toLowerCase() === searchLower);
  }, [searchValue, uniqueRefs]);

  const filteredRefs = useMemo(() => {
    if (!searchValue) return uniqueRefs;
    const searchLower = searchValue.toLowerCase().trim();
    return uniqueRefs.filter((r) => r.toLowerCase().includes(searchLower));
  }, [searchValue, uniqueRefs]);

  const handleSelect = (selected: string) => {
    onChange(selected);
    setOpen(false);
    setSearchValue("");
  };

  const handleAddNew = () => {
    if (searchValue.trim()) {
      onChange(searchValue.trim());
      setOpen(false);
      setSearchValue("");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value || <span className="text-muted-foreground">{placeholder}</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search or type new reference..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty className="py-2">
              {searchValue.trim() && !searchMatchesExisting ? (
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-left"
                  onClick={handleAddNew}
                >
                  <Plus className="h-4 w-4" />
                  Add "{searchValue.trim()}"
                </Button>
              ) : (
                <p className="text-center text-sm text-muted-foreground py-2">
                  No references found.
                </p>
              )}
            </CommandEmpty>
            <CommandGroup>
              {filteredRefs.map((ref) => (
                <CommandItem
                  key={ref}
                  value={ref}
                  onSelect={() => handleSelect(ref)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value.toLowerCase() === ref.toLowerCase()
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  {ref}
                </CommandItem>
              ))}
              {searchValue.trim() && !searchMatchesExisting && filteredRefs.length > 0 && (
                <CommandItem
                  value={`add-new-${searchValue}`}
                  onSelect={handleAddNew}
                  className="border-t mt-1 pt-2"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add "{searchValue.trim()}"
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
