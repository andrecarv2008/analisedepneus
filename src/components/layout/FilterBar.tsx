import { useFilters } from "@/lib/filters-context";
import { TIRES, fabricante, uniq } from "@/lib/tires";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter, RotateCcw } from "lucide-react";

function S({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1.5 min-w-[140px]">
      <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 bg-secondary/40 border-border"><SelectValue /></SelectTrigger>
        <SelectContent className="max-h-72">
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

export function FilterBar() {
  const { filters, set, reset } = useFilters();

  const filiais = uniq(TIRES.map((t) => t.fi)).filter(Boolean).sort();
  const fabs = uniq(TIRES.map((t) => fabricante(t.md))).filter(Boolean).sort();
  const medidas = uniq(TIRES.map((t) => t.md)).filter(Boolean).sort();
  const veics = uniq(TIRES.map((t) => t.pl)).filter(Boolean).sort();

  const all = [{ value: "all", label: "Todos" }];

  return (
    <div className="glass rounded-2xl p-4 mb-6 animate-fade-up">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="size-4 text-primary" />
        <span className="text-sm font-medium">Filtros Globais</span>
        <Button variant="ghost" size="sm" onClick={reset} className="ml-auto h-8">
          <RotateCcw className="size-3.5 mr-1" /> Limpar
        </Button>
      </div>
      <div className="flex flex-wrap gap-3">
        <S label="Filial" value={filters.filial} onChange={(v) => set("filial", v)}
          options={[...all, ...filiais.map((f) => ({ value: f, label: f }))]} />
        <S label="Fabricante" value={filters.fabricante} onChange={(v) => set("fabricante", v)}
          options={[...all, ...fabs.map((f) => ({ value: f, label: f }))]} />
        <S label="Medida" value={filters.medida} onChange={(v) => set("medida", v)}
          options={[...all, ...medidas.map((f) => ({ value: f, label: f }))]} />
        <S label="Vida" value={filters.vida} onChange={(v) => set("vida", v)}
          options={[...all, ...[1,2,3,4,5,6,7].map((n) => ({ value: String(n), label: `${n}ª vida` }))]} />
        <S label="Status" value={filters.status} onChange={(v) => set("status", v)}
          options={[{ value: "all", label: "Todos" }, { value: "ativo", label: "Ativo" }, { value: "recapagem", label: "Recapagem" }, { value: "sucata", label: "Sucata" }]} />
        <S label="Recapagem" value={filters.recapagem} onChange={(v) => set("recapagem", v)}
          options={[{ value: "all", label: "Todos" }, { value: "apto", label: "Aptos (≤4mm)" }, { value: "nao", label: "Não aptos" }]} />
        <S label="Veículo" value={filters.veiculo} onChange={(v) => set("veiculo", v)}
          options={[...all, ...veics.map((f) => ({ value: f, label: f }))]} />
      </div>
    </div>
  );
}
