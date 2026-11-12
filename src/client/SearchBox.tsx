import { useEffect, useId, useRef, useState } from "react";
import { Search, LoaderCircle, ChevronRight } from "lucide-react";
import { api } from "./api";
interface Props<T> {
  label: string;
  query: string;
  onQuery: (value: string) => void;
  endpoint: string;
  onPick: (value: T) => void;
  itemKey: (value: T) => string;
  itemTitle: (value: T) => string;
  itemDetail: (value: T) => string;
  placeholder: string;
  minLength?: number;
  hint: string;
}
export function SearchBox<T>({
  label,
  query,
  onQuery,
  endpoint,
  onPick,
  itemKey,
  itemTitle,
  itemDetail,
  placeholder,
  minLength = 2,
  hint,
}: Props<T>) {
  const id = useId(),
    list = `${id}-list`,
    statusId = `${id}-status`;
  const [items, setItems] = useState<T[]>([]),
    [open, setOpen] = useState(false),
    [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [searched, setSearched] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open || query.trim().length < minLength) {
      setItems([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setItems([]);
    setActive(-1);
    setSearched(false);
    const timer = setTimeout(() => {
      api<{ items: T[] }>(
        `${endpoint}${endpoint.includes("?") ? "&" : "?"}q=${encodeURIComponent(query.trim())}`,
        { signal: controller.signal },
      )
        .then((data) => {
          if (!controller.signal.aborted) {
            setItems(data.items);
            setSearched(true);
          }
        })
        .catch((e) => {
          if (!controller.signal.aborted) {
            setError(e.message);
            setSearched(true);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 280);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, endpoint, open, minLength]);
  const choose = (item: T) => {
    setOpen(false);
    setActive(-1);
    onPick(item);
  };
  const show = open && items.length > 0;
  return (
    <div
      className="field search-field"
      ref={root}
      onBlur={(e) => {
        if (!root.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <label htmlFor={id}>{label}</label>
      <div className={`search-input ${loading ? "is-loading" : ""}`}>
        <Search size={19} aria-hidden="true" />
        <input
          id={id}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={show}
          aria-controls={list}
          aria-describedby={statusId}
          aria-activedescendant={
            show && active >= 0 ? `${list}-${active}` : undefined
          }
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            onQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              return;
            }
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setOpen(true);
              setActive((i) =>
                items.length
                  ? (i + (e.key === "ArrowDown" ? 1 : -1) + items.length) %
                    items.length
                  : -1,
              );
            }
            if (e.key === "Enter") {
              e.preventDefault();
              if (show) choose(items[active >= 0 ? active : 0]);
              else setOpen(true);
            }
          }}
        />
        {loading && (
          <LoaderCircle size={18} className="spin" aria-label="Søker" />
        )}
      </div>
      <div
        id={statusId}
        className={error ? "search-status error-text" : "search-status"}
        role="status"
      >
        {error ||
          (loading
            ? "Søker i kilden …"
            : open && searched
              ? items.length
                ? `${items.length} forslag. Bruk piltaster og Enter, eller velg fra listen.`
                : "Ingen treff. Prøv en annen skrivemåte eller kode."
              : hint)}
      </div>
      {show && (
        <ul
          className="search-results"
          id={list}
          role="listbox"
          aria-label={`${label} – forslag`}
        >
          {items.map((item, i) => (
            <li role="presentation" key={itemKey(item)}>
              <button
                type="button"
                id={`${list}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(item)}
              >
                <span>
                  <strong>{itemTitle(item)}</strong>
                  <small>{itemDetail(item)}</small>
                </span>
                <ChevronRight size={17} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
