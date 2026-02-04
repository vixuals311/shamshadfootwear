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

interface CityComboboxProps {
  value: string;
  onChange: (value: string) => void;
  existingCities: string[];
  placeholder?: string;
}

export function CityCombobox({
  value,
  onChange,
  existingCities,
  placeholder = "Select or add city...",
}: CityComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Get unique cities (case-insensitive) - normalize to proper case
  const uniqueCities = useMemo(() => {
    const cityMap = new Map<string, string>();
    existingCities.forEach((city) => {
      if (city && city !== "N/A") {
        const lowerCity = city.toLowerCase().trim();
        // Keep the first occurrence's casing as the "canonical" version
        if (!cityMap.has(lowerCity)) {
          cityMap.set(lowerCity, city.trim());
        }
      }
    });
    return Array.from(cityMap.values()).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  }, [existingCities]);

  // Check if the search value matches any existing city (case-insensitive)
  const searchMatchesExisting = useMemo(() => {
    const searchLower = searchValue.toLowerCase().trim();
    return uniqueCities.some(
      (city) => city.toLowerCase() === searchLower
    );
  }, [searchValue, uniqueCities]);

  // Filter cities based on search
  const filteredCities = useMemo(() => {
    if (!searchValue) return uniqueCities;
    const searchLower = searchValue.toLowerCase().trim();
    return uniqueCities.filter((city) =>
      city.toLowerCase().includes(searchLower)
    );
  }, [searchValue, uniqueCities]);

  const handleSelect = (selectedCity: string) => {
    onChange(selectedCity);
    setOpen(false);
    setSearchValue("");
  };

  const handleAddNew = () => {
    if (searchValue.trim()) {
      // Capitalize first letter of each word
      const formattedCity = searchValue
        .trim()
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
      onChange(formattedCity);
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
            placeholder="Search or type new city..."
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
                  No cities found.
                </p>
              )}
            </CommandEmpty>
            <CommandGroup>
              {filteredCities.map((city) => (
                <CommandItem
                  key={city}
                  value={city}
                  onSelect={() => handleSelect(city)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value.toLowerCase() === city.toLowerCase()
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  {city}
                </CommandItem>
              ))}
              {/* Show "Add new" option if search doesn't match existing */}
              {searchValue.trim() && !searchMatchesExisting && filteredCities.length > 0 && (
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
