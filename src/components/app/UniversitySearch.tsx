import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { UNIVERSITIES } from "@/data/universities";

interface UniversitySearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function UniversitySearch({ value, onChange }: UniversitySearchProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Sync search with current value when the popover opens so the student
  // sees their existing selection and can edit it immediately.
  useEffect(() => {
    if (open) setSearch(value);
  }, [open, value]);

  const trimmed = search.trim();

  /**
   * Custom filter: keeps items whose name starts with the search query
   * (same as cmdk default) but hides the manual-entry sentinel when the
   * search exactly matches a known university — in that case the student
   * can just pick the match from the list.
   */
  const filter = (itemValue: string, query: string) => {
    if (itemValue.startsWith("__manual__")) {
      const manualText = itemValue.slice("__manual__".length);
      if (manualText.toLowerCase() === query.toLowerCase()) return 0;
      return query.length > 0 ? 1 : 0;
    }
    return itemValue.toLowerCase().startsWith(query.toLowerCase()) ? 1 : 0;
  };

  const handleSelect = (selectedValue: string) => {
    if (selectedValue.startsWith("__manual__")) {
      onChange(selectedValue.slice("__manual__".length));
    } else {
      onChange(selectedValue);
    }
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          className={cn(
            "flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5 text-[13.5px] outline-none transition-colors focus:border-terracotta",
            !value && "text-muted-foreground",
          )}
          aria-label="Select university or college"
        >
          <span className="truncate">{value || "Search or type your university…"}</span>
          {value ? (
            <span
              role="button"
              aria-label="Clear university"
              className="ml-2 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setOpen(false);
              }}
            >
              <X className="h-3.5 w-3.5" />
            </span>
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command filter={filter}>
          <CommandInput placeholder="Search universities…" aria-label="Search universities" />
          <CommandList>
            <CommandEmpty>No matching universities found.</CommandEmpty>
            <CommandGroup heading="Universities">
              {UNIVERSITIES.map((uni) => (
                <CommandItem key={uni} value={uni} onSelect={handleSelect}>
                  <Check className={cn("h-4 w-4", value === uni ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{uni}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>

          {/* Manual entry — always visible, keyboard-navigable. */}
          {trimmed.length > 0 && (
            <button
              type="button"
              onClick={() => handleSelect(`__manual__${trimmed}`)}
              className="flex w-full items-center gap-2 border-t border-border px-2 py-2.5 text-left text-[13px] text-terracotta hover:bg-accent"
            >
              <span className="ml-6 font-semibold">Use &ldquo;{trimmed}&rdquo;</span>
            </button>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
