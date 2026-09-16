"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type FilterPickItem = { id: string; title: string; hint?: string; search?: string };

export function FilterPickField({
  items,
  value,
  onChange,
  placeholder = "输入关键字筛选",
  emptyText = "没有匹配，换个字再试",
  allowEmpty,
  emptyLabel = "（空）",
}: {
  items: FilterPickItem[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  emptyText?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
}) {
  const listId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const selected = items.find((x) => x.id === value);
  const [query, setQuery] = useState(selected?.title ?? (allowEmpty && !value ? emptyLabel : ""));
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);

  useEffect(() => {
    const hit = items.find((x) => x.id === value);
    if (hit) setQuery(hit.title);
    else if (allowEmpty && !value) setQuery("");
  }, [value, items, allowEmpty]);

  const filtered = useMemo(() => {
    const n = query.trim().toLowerCase();
    const rows = n
      ? items.filter((x) => (x.search ?? `${x.title} ${x.hint ?? ""}`).toLowerCase().includes(n))
      : items;
    return rows.slice(0, 60);
  }, [items, query]);

  useEffect(() => {
    setHi(0);
  }, [query]);

  useEffect(() => {
    function hide(e: PointerEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", hide);
    return () => document.removeEventListener("pointerdown", hide);
  }, []);

  function pick(id: string, title: string) {
    onChange(id);
    setQuery(title);
    setOpen(false);
  }

  return (
    <div ref={boxRef} className="relative">
      <Input
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={placeholder}
        value={open || !selected ? query : selected.title}
        onFocus={(e) => {
          setOpen(true);
          e.currentTarget.select();
        }}
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          setOpen(true);
          const exact = items.find((x) => x.title === next);
          if (exact) onChange(exact.id);
          else if (value) onChange("");
        }}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
            setOpen(true);
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHi((i) => Math.min(i + 1, Math.max(0, filtered.length - 1)));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHi((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            const hit = filtered[hi];
            if (hit) {
              e.preventDefault();
              pick(hit.id, hit.title);
            }
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border bg-popover py-1 text-sm shadow-md"
        >
          {allowEmpty ? (
            <li>
              <button
                type="button"
                className="flex min-h-10 w-full items-center px-2.5 text-left text-muted-foreground hover:bg-muted"
                onClick={() => pick("", "")}
              >
                {emptyLabel}
              </button>
            </li>
          ) : null}
          {filtered.length === 0 ? (
            <li className="px-2.5 py-2 text-muted-foreground">{emptyText}</li>
          ) : (
            filtered.map((x, i) => (
              <li key={x.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={x.id === value}
                  className={cn(
                    "flex min-h-11 w-full flex-col items-start justify-center px-2.5 py-1.5 text-left hover:bg-muted",
                    i === hi && "bg-muted",
                  )}
                  onMouseEnter={() => setHi(i)}
                  onClick={() => pick(x.id, x.title)}
                >
                  <span>{x.title}</span>
                  {x.hint ? <span className="text-xs text-muted-foreground">{x.hint}</span> : null}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
