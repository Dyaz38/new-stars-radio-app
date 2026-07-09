import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  COUNTRIES,
  formatCountryLabel,
  popularCountries,
  searchCountries,
  type CountryOption,
} from "../constants/countries";

type BaseProps = {
  label?: string;
  hint?: string;
  compact?: boolean;
  className?: string;
};

type SingleProps = BaseProps & {
  mode: "single";
  value: string | null;
  onChange: (code: string | null) => void;
  allowGlobal?: boolean;
};

type MultipleProps = BaseProps & {
  mode: "multiple";
  value: string[];
  onChange: (codes: string[]) => void;
};

export type CountryPickerProps = SingleProps | MultipleProps;

function optionLabel(c: CountryOption): string {
  return `${c.name} (${c.code})`;
}

export function CountryPicker(props: CountryPickerProps) {
  const { label, hint, compact = false, className = "" } = props;
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) {
      const popular = popularCountries();
      const popularSet = new Set(popular.map((c) => c.code));
      const rest = COUNTRIES.filter((c) => !popularSet.has(c.code));
      return { popular, rest: rest.slice(0, 30) };
    }
    return { popular: [], rest: searchCountries(search, 50) };
  }, [search]);

  const inputCls = compact
    ? "w-full rounded-lg border border-gray-300 px-2 py-2 text-sm"
    : "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent";

  if (props.mode === "single") {
    const { value, onChange, allowGlobal = true } = props;
    const display =
      value == null || !value.trim()
        ? allowGlobal
          ? "Global (all countries)"
          : "Select country…"
        : formatCountryLabel(value);

    const pick = (code: string | null) => {
      onChange(code);
      setSearch("");
      setOpen(false);
    };

    return (
      <div ref={rootRef} className={`relative ${className}`}>
        {label ? (
          <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`${inputCls} text-left bg-white flex items-center justify-between gap-2`}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className="truncate">{display}</span>
          <span className="text-gray-400 shrink-0" aria-hidden>
            ▾
          </span>
        </button>
        {open ? (
          <div
            id={listId}
            role="listbox"
            className="absolute z-50 mt-1 w-full max-h-64 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
          >
            <div className="p-2 border-b border-gray-100">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country or code (e.g. Germany, DE)"
                autoFocus
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <ul className="max-h-48 overflow-y-auto text-sm">
              {allowGlobal && !search.trim() ? (
                <li>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-indigo-50 font-medium"
                    onClick={() => pick(null)}
                  >
                    Global (all countries)
                  </button>
                </li>
              ) : null}
              {filtered.popular.length > 0 ? (
                <>
                  <li className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                    Popular
                  </li>
                  {filtered.popular.map((c) => (
                    <li key={c.code}>
                      <button
                        type="button"
                        className={`w-full px-3 py-2 text-left hover:bg-indigo-50 ${
                          value === c.code ? "bg-indigo-50 font-medium" : ""
                        }`}
                        onClick={() => pick(c.code)}
                      >
                        {optionLabel(c)}
                      </button>
                    </li>
                  ))}
                </>
              ) : null}
              {filtered.rest.length > 0 ? (
                <>
                  <li className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                    {search.trim() ? "Matches" : "More countries"}
                  </li>
                  {filtered.rest.map((c) => (
                    <li key={c.code}>
                      <button
                        type="button"
                        className={`w-full px-3 py-2 text-left hover:bg-indigo-50 ${
                          value === c.code ? "bg-indigo-50 font-medium" : ""
                        }`}
                        onClick={() => pick(c.code)}
                      >
                        {optionLabel(c)}
                      </button>
                    </li>
                  ))}
                </>
              ) : null}
              {search.trim() && filtered.popular.length === 0 && filtered.rest.length === 0 ? (
                <li className="px-3 py-3 text-gray-500">No countries match “{search}”.</li>
              ) : null}
            </ul>
          </div>
        ) : null}
        {hint ? <p className="text-xs text-gray-500 mt-1">{hint}</p> : null}
      </div>
    );
  }

  const { value, onChange } = props;
  const selectedSet = useMemo(() => new Set(value.map((c) => c.toUpperCase())), [value]);

  const addCode = (code: string) => {
    const up = code.toUpperCase();
    if (selectedSet.has(up)) return;
    onChange([...value, up]);
    setSearch("");
    setOpen(false);
  };

  const removeCode = (code: string) => {
    onChange(value.filter((c) => c.toUpperCase() !== code.toUpperCase()));
  };

  return (
    <div ref={rootRef} className={className}>
      {label ? (
        <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      ) : null}
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((code) => (
            <span
              key={code}
              className="inline-flex items-center gap-1 rounded-full bg-indigo-100 text-indigo-900 px-2.5 py-1 text-xs font-medium"
            >
              {formatCountryLabel(code)}
              <button
                type="button"
                onClick={() => removeCode(code)}
                className="rounded-full hover:bg-indigo-200 px-1 leading-none"
                aria-label={`Remove ${formatCountryLabel(code)}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500 mb-2">No countries selected — ad runs worldwide.</p>
      )}
      <div className="relative">
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search to add country (e.g. France, Germany, Namibia)"
          className={inputCls}
          aria-autocomplete="list"
          aria-controls={listId}
        />
        {open && (search.trim() || filtered.popular.length > 0) ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg text-sm"
          >
            {!search.trim()
              ? filtered.popular.map((c) => (
                  <li key={c.code}>
                    <button
                      type="button"
                      disabled={selectedSet.has(c.code)}
                      className="w-full px-3 py-2 text-left hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={() => addCode(c.code)}
                    >
                      {optionLabel(c)}
                    </button>
                  </li>
                ))
              : filtered.rest.map((c) => (
                  <li key={c.code}>
                    <button
                      type="button"
                      disabled={selectedSet.has(c.code)}
                      className="w-full px-3 py-2 text-left hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={() => addCode(c.code)}
                    >
                      {optionLabel(c)}
                    </button>
                  </li>
                ))}
          </ul>
        ) : null}
      </div>
      {hint ? <p className="text-xs text-gray-500 mt-1">{hint}</p> : null}
    </div>
  );
}
