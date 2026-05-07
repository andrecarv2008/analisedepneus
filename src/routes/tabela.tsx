import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useFilters } from "@/lib/filters-context";
import { PageHeader } from "@/components/PageHeader";
import { ChartCard } from "@/components/ChartCard";
import { FilterBar } from "@/components/layout/FilterBar";
import { fmtCpk, fmtMoney, fmtNum } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Search, ArrowUpDown } from "lucide-react";

export const Route = createFileRoute("/tabela")({
  component: Page,
  head: () => ({ meta: [{ title: "Tabela Geral · Análise de Pneus - Grupo Mateus" }, { name: "description", content: "Tabela completa de pneus." }] }),
});

type Sort = { key: string; dir: "asc" | "desc" };

function Page() {
  const { filtered } = useFilters();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>({ key: "pl", dir: "asc" });

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return filtered.filter(
      (t) =>
        !term ||
        t.pl?.toLowerCase().includes(term) ||
        String(t.fg || "").toLowerCase().includes(term) ||
        t.fi?.toLowerCase().includes(term) ||
        t.md?.toLowerCase().includes(term) ||
        String(t.cf || "").toLowerCase().includes(term),
    );
  }, [filtered, q]);

  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a: any, b: any) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (typeof av === "number" && typeof bv === "number") return sort.dir === "asc" ? av - bv : bv - av;
      return sort.dir === "asc"
        ? String(av ?? "").localeCompare(String(bv ?? ""))
        : String(bv ?? "").localeCompare(String(av ?? ""));
    });
    return arr.slice(0, 1000);
  }, [rows, sort]);

  const Th = ({ label, k, align = "left" }: { label: string; k: string; align?: "left" | "right" | "center" }) => (
    <th
      className={`py-2 px-2 cursor-pointer hover:text-foreground select-none whitespace-nowrap text-${align}`}
      onClick={() => setSort((s) => ({ key: k, dir: s.key === k && s.dir === "asc" ? "desc" : "asc" }))}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className="size-3 opacity-50" />
      </span>
    </th>
  );

  // 7 vidas: para cada vida exibe KM, Custo e CPK (igual ao arquivo importado)
  const vidas = [1, 2, 3, 4, 5, 6, 7];

  return (
    <>
      <PageHeader title="Tabela Geral de Pneus" subtitle={`${fmtNum(rows.length)} pneus — exibindo até 1.000 (todos os campos do arquivo)`} />
      <FilterBar />

      <ChartCard
        title="Pneus — base completa"
        subtitle="Reflete fielmente os campos do arquivo importado"
        action={
          <div className="relative w-64">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar placa, fogo, filial, medida…" className="pl-9 h-9" />
          </div>
        }
      >
        <div className="overflow-auto max-h-[720px] rounded-lg border border-border/60">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-card z-10 text-[10px] text-muted-foreground uppercase border-b border-border">
              <tr>
                <Th label="CF" k="cf" />
                <Th label="Filial" k="fi" />
                <Th label="Placa" k="pl" />
                <Th label="Pos." k="po" />
                <Th label="Fogo" k="fg" />
                <Th label="Medida" k="md" />
                <Th label="Vida" k="v" align="center" />
                <Th label="Status" k="st" />
                <Th label="MM" k="mm" align="right" />
                <Th label="KT" k="kt" align="right" />
                <Th label="KP" k="kp" align="right" />
                <Th label="CT" k="ct" align="right" />
                {vidas.map((v) => (
                  <th key={`h-${v}`} colSpan={3} className="text-center py-2 px-2 border-l border-border/60 text-[10px] uppercase whitespace-nowrap">
                    Vida {v}
                  </th>
                ))}
                {[1, 2, 3, 4, 5].map((s) => (
                  <th key={`sh-${s}`} className="text-right py-2 px-2 whitespace-nowrap text-[10px] uppercase">
                    SL{s}
                  </th>
                ))}
              </tr>
              <tr className="text-[9px] text-muted-foreground/80 border-b border-border">
                <th colSpan={12}></th>
                {vidas.map((v) => (
                  <>
                    <th key={`km-${v}`} className="text-right px-1 border-l border-border/60">KM</th>
                    <th key={`cv-${v}`} className="text-right px-1">Custo</th>
                    <th key={`cpk-${v}`} className="text-right px-1">CPK</th>
                  </>
                ))}
                <th colSpan={5}></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t, i) => (
                <tr key={i} className="border-t border-border/40 hover:bg-secondary/40">
                  <td className="py-2 px-2 text-muted-foreground">{t.cf}</td>
                  <td className="px-2 text-muted-foreground whitespace-nowrap">{t.fi}</td>
                  <td className="px-2 font-medium">{t.pl}</td>
                  <td className="px-2">{t.po}</td>
                  <td className="px-2">{t.fg}</td>
                  <td className="px-2 text-muted-foreground whitespace-nowrap">{t.md}</td>
                  <td className="px-2 text-center">{t.v}ª</td>
                  <td className="px-2 text-muted-foreground whitespace-nowrap">{t.st}</td>
                  <td className="px-2 text-right">{t.mm != null ? t.mm.toFixed(1) : "—"}</td>
                  <td className="px-2 text-right">{fmtNum(t.kt)}</td>
                  <td className="px-2 text-right">{fmtNum(t.kp)}</td>
                  <td className="px-2 text-right">{fmtMoney(t.ct)}</td>
                  {vidas.map((v) => {
                    const idx = v - 1;
                    const km = t.km[idx] || 0;
                    const cv = t.cv[idx] || 0;
                    const cpk = t.cpk[idx] || 0;
                    const dim = !km && !cv ? "text-muted-foreground/40" : "";
                    return (
                      <>
                        <td key={`km-${i}-${v}`} className={`px-1 text-right border-l border-border/60 ${dim}`}>{km ? fmtNum(km) : "—"}</td>
                        <td key={`cv-${i}-${v}`} className={`px-1 text-right ${dim}`}>{cv ? fmtMoney(cv) : "—"}</td>
                        <td key={`cpk-${i}-${v}`} className={`px-1 text-right ${dim}`}>{cpk ? fmtCpk(cpk) : "—"}</td>
                      </>
                    );
                  })}
                  {[0, 1, 2, 3, 4].map((s) => (
                    <td key={`sl-${i}-${s}`} className="px-1 text-right text-muted-foreground">
                      {t.sl?.[s] != null ? Number(t.sl[s]).toFixed(1) : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </>
  );
}
