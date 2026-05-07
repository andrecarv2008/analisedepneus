import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useFilters } from "@/lib/filters-context";
import { cpkAcumulado, calcularDesgasteIrregular, isRecap, statusNorm } from "@/lib/tires";
import { PageHeader } from "@/components/PageHeader";
import { FilterBar } from "@/components/layout/FilterBar";
import { fmtCpk, fmtMoneyK, fmtNum, fmtPct } from "@/lib/format";
import { Lightbulb, AlertTriangle, TrendingUp, TrendingDown, Target, Zap } from "lucide-react";

export const Route = createFileRoute("/insights")({ component: Page,
  head: () => ({ meta: [{ title: "Insights Executivos · TireOps" }, { name: "description", content: "Insights automáticos da operação." }]}) });

type Insight = { icon: any; title: string; desc: string; severity: "info"|"success"|"warning"|"destructive"|"primary" };

function Page() {
  const { filtered } = useFilters();

  const insights: Insight[] = useMemo(() => {
    const list: Insight[] = [];

    // por filial
    const m = new Map<string,{c:number;k:number;n:number;kp:number}>();
    for(const t of filtered){
      const a = cpkAcumulado(t);
      const e = m.get(t.fi) || {c:0,k:0,n:0,kp:0};
      e.c+=a.custo;e.k+=a.km;e.n+=1;e.kp+=t.kp;
      m.set(t.fi,e);
    }
    const fil = [...m.entries()].map(([fi,e])=>({fi,cpk:e.k>0?e.c/e.k:0,perf:e.kp>0?(e.k/e.kp)*100:0,n:e.n})).filter(f=>f.cpk>0);
    const ranked = [...fil].sort((a,b)=>a.cpk-b.cpk);
    const melhor = ranked[0], pior = ranked[ranked.length-1];
    if(melhor) list.push({icon:Target,title:"Melhor Filial em CPK",desc:`${melhor.fi} opera com CPK de ${fmtCpk(melhor.cpk)} — referência operacional para o restante da frota.`,severity:"success"});
    if(pior) list.push({icon:AlertTriangle,title:"Filial Crítica em CPK",desc:`${pior.fi} apresenta CPK de ${fmtCpk(pior.cpk)} — ${fmtPct((pior.cpk-(melhor?.cpk||0))/(melhor?.cpk||1)*100)} acima da melhor filial.`,severity:"destructive"});

    const desg = calcularDesgasteIrregular(filtered);
    if(desg.length>0){
      const dM = new Map<string,number>();
      for(const d of desg) dM.set(d.fi,(dM.get(d.fi)||0)+1);
      const top = [...dM.entries()].sort((a,b)=>b[1]-a[1])[0];
      list.push({icon:AlertTriangle,title:"Desgaste Irregular Concentrado",desc:`Detectados ${desg.length} pares com desgaste irregular. Filial mais afetada: ${top[0]} (${top[1]} ocorrências). Sugere-se revisão de alinhamento.`,severity:"warning"});
    }

    const recap = filtered.filter(isRecap);
    if(recap.length>0){
      list.push({icon:Zap,title:"Oportunidade de Recapagem",desc:`${recap.length} pneus aptos para recapagem. Custo estimado: ${fmtMoneyK(recap.length*800)}, vs reposição estimada de ${fmtMoneyK(recap.length*2400)}. Economia potencial: ${fmtMoneyK(recap.length*1600)}.`,severity:"success"});
    }

    const validos = filtered.map(t=>({t,a:cpkAcumulado(t)})).filter(x=>x.a.cpk>0);
    const cpkMed = validos.reduce((s,x)=>s+x.a.cpk,0)/Math.max(validos.length,1);
    const altos = validos.filter(x=>x.a.cpk > cpkMed*1.5);
    if(altos.length>0){
      list.push({icon:TrendingUp,title:"Pneus com CPK Elevado",desc:`${altos.length} pneus operam com CPK 50% acima da média. Recomenda-se análise individual e possível substituição.`,severity:"warning"});
    }

    const sucata = filtered.filter(t=>statusNorm(t)==="sucata");
    if(sucata.length > filtered.length*0.05){
      list.push({icon:TrendingDown,title:"Alta Taxa de Sucateamento",desc:`${fmtPct(sucata.length/filtered.length*100)} da frota foi sucateada. Investigar padrões de uso e qualidade dos fabricantes.`,severity:"destructive"});
    }

    const kmTot = filtered.reduce((s,t)=>s+t.kt,0);
    const kmProjT = filtered.reduce((s,t)=>s+t.kp,0);
    const perf = kmProjT>0?(kmTot/kmProjT)*100:0;
    if(perf>=100) list.push({icon:TrendingUp,title:"Performance Acima do Projetado",desc:`A frota atinge ${fmtPct(perf)} da projeção, indicando excelente gestão de uso e manutenção.`,severity:"success"});
    else list.push({icon:TrendingDown,title:"Performance Abaixo do Projetado",desc:`A frota está em ${fmtPct(perf)} da projeção — gap de ${fmtNum(kmProjT-kmTot)} km. Avaliar rodízio e pressão de calibragem.`,severity:"warning"});

    list.push({icon:Lightbulb,title:"Previsão de Gastos Próximo Ciclo",desc:`Com base no CPK atual de ${fmtCpk(cpkMed)}, projeta-se um gasto de ${fmtMoneyK(cpkMed * kmProjT * 0.3)} no próximo trimestre operacional.`,severity:"info"});

    return list;
  }, [filtered]);

  const colorMap: Record<string,string> = {
    info:"var(--info)", success:"var(--success)", warning:"var(--warning)", destructive:"var(--destructive)", primary:"var(--primary)",
  };

  return (
    <>
      <PageHeader title="Insights Executivos" subtitle="Análise inteligente automática — padrões, riscos e oportunidades." />
      <FilterBar />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((it, i) => {
          const Icon = it.icon;
          const c = colorMap[it.severity];
          return (
            <div key={i} className="glass rounded-2xl p-5 animate-fade-up flex gap-4 hover:translate-y-[-2px] transition-transform">
              <div className="size-12 shrink-0 rounded-xl flex items-center justify-center"
                style={{ background: `color-mix(in oklab, ${c} 15%, transparent)`, color: c }}>
                <Icon className="size-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-display font-semibold text-base mb-1" style={{ color: c }}>{it.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{it.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
