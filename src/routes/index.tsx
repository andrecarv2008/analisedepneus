import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useFilters } from "@/lib/filters-context";
import { cpkAcumulado } from "@/lib/tires";
import { PageHeader } from "@/components/PageHeader";
import { FilterBar } from "@/components/layout/FilterBar";
import { fmtCpk, fmtMoneyK, fmtNum, fmtPct } from "@/lib/format";
import { ChevronDown } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Visão Geral · TireOps" },
      { name: "description", content: "Visão executiva — ciclos encerrados." },
    ],
  }),
});

type VidaAgg = {
  v: number;
  pneus: number;
  custo: number;     // custo de ciclos encerrados
  km: number;        // km real de ciclos encerrados
  kmProj: number;    // km projetado de ciclos encerrados (kpv[0..v-2])
  cpk: number;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground/80 mb-3 font-medium">
        {title}
      </div>
      {children}
    </div>
  );
}

function MetricCell({
  label, value, tone, sub,
}: { label: string; value: React.ReactNode; tone?: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-display text-2xl md:text-[28px] font-bold tracking-tight" style={tone ? { color: tone } : undefined}>
        {value}
      </div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function FlatCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl p-5 border transition-colors ${className}`}
      style={{
        background: "oklch(0.21 0.02 255 / 0.6)",
        borderColor: "oklch(1 0 0 / 0.06)",
      }}
    >
      {children}
    </div>
  );
}

const colorByCpk = (cpk: number) => {
  if (!cpk) return "var(--muted-foreground)";
  if (cpk < 0.05) return "var(--success)";
  if (cpk < 0.06) return "var(--success)";
  if (cpk < 0.07) return "var(--warning)";
  return "var(--destructive)";
};

const colorByPerf = (p: number) => {
  if (!p) return "var(--muted-foreground)";
  if (p >= 95) return "var(--success)";
  if (p >= 70) return "var(--warning)";
  return "var(--destructive)";
};

function Dashboard() {
  const { filtered } = useFilters();
  const [selVida, setSelVida] = useState<number>(2);

  const data = useMemo(() => {
    const total = filtered.length;
    let custoEnc = 0, kmEnc = 0, kmProjEnc = 0, pneusComEnc = 0;
    const filiais = new Set<string>();

    const porVida = new Map<number, VidaAgg>();
    const ensure = (v: number) => {
      let e = porVida.get(v);
      if (!e) { e = { v, pneus: 0, custo: 0, km: 0, kmProj: 0, cpk: 0 }; porVida.set(v, e); }
      return e;
    };

    for (const t of filtered) {
      filiais.add(t.fi);
      const v = t.v || 1;
      const agg = ensure(v);
      agg.pneus += 1;

      const closed = Math.max(0, v - 1);
      let c = 0, k = 0, kp = 0;
      for (let i = 0; i < closed; i++) {
        const ci = t.cv[i] || 0, ki = t.km[i] || 0, kpi = t.kpv[i] || 0;
        if (ci > 0 && ki > 0) { c += ci; k += ki; }
        kp += kpi;
      }
      agg.custo += c;
      agg.km += k;
      agg.kmProj += kp;

      if (closed > 0 && k > 0) {
        custoEnc += c; kmEnc += k; kmProjEnc += kp; pneusComEnc += 1;
      }
    }

    for (const a of porVida.values()) a.cpk = a.km > 0 ? a.custo / a.km : 0;

    const cpkGlobal = kmEnc > 0 ? custoEnc / kmEnc : 0;
    const perfGlobal = kmProjEnc > 0 ? (kmEnc / kmProjEnc) * 100 : 0;

    const vidas = [...porVida.values()].sort((a, b) => a.v - b.v).filter((v) => v.v >= 1 && v.v <= 7);

    return { total, custoEnc, kmEnc, kmProjEnc, pneusComEnc, cpkGlobal, perfGlobal, vidas, filiais: filiais.size };
  }, [filtered]);

  const sel = data.vidas.find((v) => v.v === selVida) ?? data.vidas[0];

  return (
    <>
      <PageHeader title="Visão Geral" subtitle="Inteligência executiva — ciclos encerrados, custos acumulados e performance real." />
      <FilterBar />

      {/* KPIs principais */}
      <Section title="Visão geral da frota — ciclos encerrados">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          <FlatCard>
            <MetricCell
              label="CPK real global"
              value={<span style={{ color: "var(--success)" }}>{fmtCpk(data.cpkGlobal)}</span>}
              sub="por km · ciclos enc."
            />
          </FlatCard>
          <FlatCard>
            <MetricCell
              label="Custo total enc."
              value={fmtMoneyK(data.custoEnc)}
              sub={`${fmtNum(data.pneusComEnc)} pneus com enc.`}
            />
          </FlatCard>
          <FlatCard>
            <MetricCell
              label="KM real acumulado"
              value={<span style={{ color: "var(--info)" }}>{fmtMoneyK(data.kmEnc).replace("R$ ", "")}</span>}
              sub="km rodados encerrados"
            />
          </FlatCard>
          <FlatCard>
            <MetricCell
              label="KM projetado enc."
              value={fmtMoneyK(data.kmProjEnc).replace("R$ ", "")}
              sub="projetado nas vidas enc."
            />
          </FlatCard>
          <FlatCard>
            <MetricCell
              label="Performance global"
              value={<span style={{ color: colorByPerf(data.perfGlobal) }}>{fmtPct(data.perfGlobal)}</span>}
              sub={`${fmtMoneyK(data.kmEnc - data.kmProjEnc).replace("R$ ", "")} km vs projetado`}
            />
          </FlatCard>
          <FlatCard>
            <MetricCell
              label="Total pneus"
              value={fmtNum(data.total)}
              sub={`em ${data.filiais} filiais`}
            />
          </FlatCard>
        </div>
      </Section>

      {/* Distribuição por vida atual */}
      <Section title="Distribuição por vida atual">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {data.vidas.slice(0, 5).map((v) => {
            const pct = (v.pneus / Math.max(data.total, 1)) * 100;
            const isSel = sel?.v === v.v;
            const cpkColor = colorByCpk(v.cpk);
            return (
              <button
                key={v.v}
                onClick={() => setSelVida(v.v)}
                className="text-left rounded-xl p-4 border transition-all hover:translate-y-[-1px]"
                style={{
                  background: isSel
                    ? "oklch(0.24 0.04 255 / 0.7)"
                    : "oklch(0.21 0.02 255 / 0.5)",
                  borderColor: isSel ? "var(--primary)" : "oklch(1 0 0 / 0.06)",
                  boxShadow: isSel ? "0 0 0 1px var(--primary), 0 8px 24px -12px var(--primary)" : undefined,
                }}
              >
                <div className="text-xs text-muted-foreground mb-2">{v.v}ª vida</div>
                <div className="font-display text-2xl font-bold">{fmtPct(pct)}</div>
                <div className="text-xs text-muted-foreground mt-1">{fmtNum(v.pneus)} pneus</div>
                <div className="mt-3 text-sm font-medium" style={{ color: cpkColor }}>
                  {v.cpk > 0 ? fmtCpk(v.cpk) : "—"}
                </div>
                <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(1 0 0 / 0.06)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, pct * 2)}%`,
                      background: cpkColor,
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Detalhe da vida selecionada */}
      {sel && (
        <FlatCard className="mb-6">
          <div className="font-display text-lg font-bold mb-5">
            {sel.v}ª Vida — {fmtNum(sel.pneus)} pneus{sel.v > 1 ? " com ciclos encerrados" : ""}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-start">
            <MetricCell
              label="CPK acumulado"
              value={<span style={{ color: colorByCpk(sel.cpk) }}>{sel.cpk > 0 ? fmtCpk(sel.cpk) : "—"}</span>}
            />
            <MetricCell label="Custo enc." value={fmtMoneyK(sel.custo)} />
            <MetricCell
              label="KM real enc."
              value={<span style={{ color: "var(--info)" }}>{fmtMoneyK(sel.km).replace("R$ ", "")}</span>}
            />
            <MetricCell label="KM projetado" value={fmtMoneyK(sel.kmProj).replace("R$ ", "")} />
          </div>

          <div className="my-5 flex items-center justify-center">
            <div className="size-9 rounded-full border flex items-center justify-center"
              style={{ borderColor: "oklch(1 0 0 / 0.1)" }}>
              <ChevronDown className="size-4 text-muted-foreground" />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <MetricCell
              label="Performance"
              value={<span style={{ color: colorByPerf(sel.kmProj > 0 ? (sel.km / sel.kmProj) * 100 : 0) }}>
                {sel.kmProj > 0 ? fmtPct((sel.km / sel.kmProj) * 100) : "—"}
              </span>}
            />
            <MetricCell
              label="Diferença KM"
              value={<span style={{ color: sel.km - sel.kmProj >= 0 ? "var(--success)" : "var(--destructive)" }}>
                {fmtMoneyK(sel.km - sel.kmProj).replace("R$ ", "")} km
              </span>}
            />
            <MetricCell label="Total pneus" value={fmtNum(sel.pneus)} />
            <MetricCell label="Ciclo atual" value={`${sel.v}º ciclo`} />
          </div>
        </FlatCard>
      )}
    </>
  );
}
