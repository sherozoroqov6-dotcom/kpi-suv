import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, X } from "lucide-react";

type Option = { value: string; label: string };

type Props = {
  value: string;
  onChange: (val: string) => void;
  options: Option[];
  placeholder?: string;
  compact?: boolean;
};

export function MultiEmployeeSelect({
  value,
  onChange,
  options,
  placeholder = "Tanlang",
  compact = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected: string[] = value
    ? value.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const labelOf = (val: string) => options.find((o) => o.value === val)?.label ?? val;

  const toggle = (optValue: string) => {
    const next = selected.includes(optValue)
      ? selected.filter((s) => s !== optValue)
      : [...selected, optValue];
    onChange(next.join(","));
  };

  const remove = (optValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((s) => s !== optValue).join(","));
  };

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (compact) {
    return (
      <div ref={ref} className="relative w-full">
        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          className="w-full h-7 text-xs bg-transparent border-0 outline-none cursor-pointer px-1 flex items-center justify-between gap-1 rounded focus:ring-1 focus:ring-ring"
        >
          <span className="truncate text-left flex-1 text-gray-900">
            {selected.length === 0
              ? <span className="text-muted-foreground">{placeholder}</span>
              : selected.length === 1
              ? labelOf(selected[0])
              : `${labelOf(selected[0])} +${selected.length - 1}`}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
        </button>

        {open && (
          <div className="absolute z-50 left-0 top-full mt-1 w-52 bg-white border border-border rounded-lg shadow-lg overflow-hidden">
            <div className="p-1.5 border-b">
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Qidirish..."
                className="w-full text-xs px-2 py-1 border border-border rounded outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="max-h-44 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-xs text-muted-foreground p-2 text-center">Topilmadi</p>
              ) : (
                filtered.map((o) => {
                  const checked = selected.includes(o.value);
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => toggle(o.value)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs text-left hover:bg-accent transition-colors ${checked ? "bg-primary/5" : ""}`}
                    >
                      <span className={`h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 ${checked ? "bg-primary border-primary" : "border-muted-foreground"}`}>
                        {checked && <Check className="h-2.5 w-2.5 text-white" />}
                      </span>
                      <span className="truncate">{o.label}</span>
                    </button>
                  );
                })
              )}
            </div>
            {selected.length > 0 && (
              <div className="border-t p-1.5 flex flex-wrap gap-1">
                {selected.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-0.5 text-[10px] bg-primary/10 text-primary rounded px-1.5 py-0.5 font-medium"
                  >
                    {labelOf(s).split(" ")[0]}
                    <button type="button" onClick={(e) => remove(s, e)}>
                      <X className="h-2 w-2" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full min-h-9 rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm text-left flex items-start gap-2 focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <div className="flex-1 flex flex-wrap gap-1">
          {selected.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            selected.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs rounded px-2 py-0.5 font-medium"
              >
                {labelOf(s)}
                <button type="button" onClick={(e) => remove(s, e)}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))
          )}
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      </button>

      {open && (
        <div className="absolute z-50 left-0 top-full mt-1 w-full bg-white border border-border rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Xodim qidirish..."
              className="w-full text-sm px-3 py-1.5 border border-border rounded-md outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground p-3 text-center">Xodim topilmadi</p>
            ) : (
              filtered.map((o) => {
                const checked = selected.includes(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => toggle(o.value)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-accent transition-colors ${checked ? "bg-primary/5" : ""}`}
                  >
                    <span className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${checked ? "bg-primary border-primary" : "border-muted-foreground"}`}>
                      {checked && <Check className="h-3 w-3 text-white" />}
                    </span>
                    <span>{o.label}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
