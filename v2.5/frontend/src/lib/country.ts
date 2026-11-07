import { useEffect, useState } from "react";

const KEY = "cardbook-country";

const ALIASES: Record<string, string> = {
  "united states": "United States",
  "united states of america": "United States",
  canada: "Canada",
  ca: "Canada",
  mexico: "Mexico",
  mx: "Mexico",
  usa: "United States",
  us: "United States",
  america: "United States",
  china: "China",
  cn: "China",
  prc: "China",
  中国: "China",
  singapore: "Singapore",
  sg: "Singapore",
  malaysia: "Malaysia",
  my: "Malaysia",
  australia: "Australia",
  aus: "Australia",
  au: "Australia",
  "new zealand": "New Zealand",
  nz: "New Zealand",
  japan: "Japan",
  jp: "Japan",
  日本: "Japan",
  "south korea": "South Korea",
  korea: "South Korea",
  kr: "South Korea",
};

export function canonicalCountry(input: string | null | undefined): string | null {
  const raw = input?.trim();
  if (!raw) return null;
  const key = raw.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ");
  return ALIASES[key] ?? raw.replace(/\s+/g, " ");
}

export function useCountry() {
  const [country, setCountry] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setCountry(canonicalCountry(localStorage.getItem(KEY)));
    setReady(true);
  }, []);

  function save(value: string) {
    const next = canonicalCountry(value);
    if (!next) return;
    localStorage.setItem(KEY, next);
    setCountry(next);
  }

  function clear() {
    localStorage.removeItem(KEY);
    setCountry(null);
  }

  return { country, ready, save, clear };
}
