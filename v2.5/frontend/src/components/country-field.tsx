import { useState } from "react";
import { useCountry } from "@/lib/country";

export function CountryAsk({ tone }: { tone: "front" | "rift" | "magic" | "fab" }) {
  const { country, ready, save, clear } = useCountry();
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  if (!ready) return null;

  const front = tone === "front";
  const rift = tone === "rift";
  const label = front ? "text-[#c6ff3a]" : rift ? "text-fg" : "text-[#f4f1e8]";
  const muted = front ? "text-[#c6ff3a]" : rift ? "text-muted" : "text-[#c8c2b4]";
  const field = front
    ? "border-[#c6ff3a] bg-black text-[#c6ff3a] placeholder:text-[#5d8a22]"
    : rift
      ? "border-border bg-surface text-fg placeholder:text-faint"
      : "border-[#33362c] bg-[#171910] text-[#f4f1e8] placeholder:text-[#8d887c]";
  const button = front || !rift ? "bg-[#c6ff3a] text-black" : "bg-primary text-primary-fg";

  if (country && !editing) {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className={`text-sm ${muted}`}>
          Playing in <span className={`font-semibold ${label}`}>{country}</span>
        </p>
        <button type="button" className={`h-11 shrink-0 px-2 text-sm font-semibold ${front ? "text-[#c6ff3a]" : "text-[#c6ff3a]"}`} onClick={() => { setDraft(country); setEditing(true); }}>
          Change
        </button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        save(draft);
        setEditing(false);
      }}
    >
      <div>
        <p className={`text-xs font-semibold tracking-widest uppercase ${muted}`}>Your country</p>
        <p className={`mt-1 text-sm leading-relaxed ${muted}`}>
          Key it in. Local Riftbound, Magic, and Flesh and Blood decks follow this.
        </p>
      </div>
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Singapore, United States, Japan"
        aria-label="Country"
        className={`h-11 w-full rounded-xl border px-3 text-base ${field}`}
      />
      <div className="flex gap-2">
        <button type="submit" className={`h-11 flex-1 rounded-xl text-sm font-semibold ${button}`}>
          Save country
        </button>
        {country ? (
          <button
            type="button"
            className={`h-11 rounded-xl px-4 text-sm font-semibold ${muted}`}
            onClick={() => {
              setEditing(false);
            }}
          >
            Cancel
          </button>
        ) : null}
        {country ? (
          <button type="button" className={`h-11 rounded-xl px-3 text-sm font-semibold ${muted}`} onClick={clear}>
            Clear
          </button>
        ) : null}
      </div>
    </form>
  );
}
