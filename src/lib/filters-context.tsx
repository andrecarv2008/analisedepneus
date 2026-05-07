import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { TIRES, type Tire, statusNorm, isRecap, fabricante } from "@/lib/tires";

export type Filters = {
  filial: string;
  fabricante: string;
  medida: string;
  vida: string;
  status: string;
  recapagem: string;
  desgaste: string;
  veiculo: string;
};

const empty: Filters = {
  filial: "all", fabricante: "all", medida: "all", vida: "all",
  status: "all", recapagem: "all", desgaste: "all", veiculo: "all",
};

type Ctx = {
  filters: Filters;
  set: <K extends keyof Filters>(k: K, v: Filters[K]) => void;
  reset: () => void;
  filtered: Tire[];
  all: Tire[];
};

const C = createContext<Ctx | null>(null);

export function FiltersProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<Filters>(empty);
  const set: Ctx["set"] = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  const reset = () => setFilters(empty);

  const filtered = useMemo(() => {
    return TIRES.filter((t) => {
      if (filters.filial !== "all" && t.fi !== filters.filial) return false;
      if (filters.fabricante !== "all" && fabricante(t.md) !== filters.fabricante) return false;
      if (filters.medida !== "all" && t.md !== filters.medida) return false;
      if (filters.vida !== "all" && String(t.v) !== filters.vida) return false;
      if (filters.status !== "all" && statusNorm(t) !== filters.status) return false;
      if (filters.recapagem === "apto" && !isRecap(t)) return false;
      if (filters.recapagem === "nao" && isRecap(t)) return false;
      if (filters.veiculo !== "all" && t.pl !== filters.veiculo) return false;
      return true;
    });
  }, [filters]);

  return <C.Provider value={{ filters, set, reset, filtered, all: TIRES }}>{children}</C.Provider>;
}

export function useFilters() {
  const v = useContext(C);
  if (!v) throw new Error("FiltersProvider missing");
  return v;
}
