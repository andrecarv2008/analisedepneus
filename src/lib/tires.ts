import raw from "@/data/tires.json";

export type Tire = {
  cf: string | number | null;
  fi: string;
  pl: string;
  po: string;
  fg: string | number | null;
  md: string;
  km: number[];      // 1..7
  kt: number;        // KM total já percorrido
  kp: number;        // KM projetado total
  kpv: number[];     // projetado por vida
  st: string;
  v: number;         // vida atual
  ct: number;        // custo total
  cv: number[];      // custo por vida
  cpk: number[];     // cpk por vida
  sl: (number | null)[];
  mm: number | null;
};

export const TIRES = raw as unknown as Tire[];

/** CPK acumulado considerando apenas ciclos encerrados (vidas anteriores à vida atual). */
export function cpkAcumulado(t: Tire): { cpk: number; custo: number; km: number } {
  // vidas encerradas = todas com índice < (v-1) em zero-based, ou seja vidas 1..v-1
  const closed = Math.max(0, (t.v || 1) - 1);
  let custo = 0, km = 0;
  for (let i = 0; i < closed; i++) {
    const c = t.cv[i] || 0;
    const k = t.km[i] || 0;
    if (c > 0 && k > 0) { custo += c; km += k; }
  }
  if (t.v === 1) {
    // 1ª vida: usa a própria vida
    const c = t.cv[0] || 0;
    const k = t.km[0] || 0;
    if (c > 0 && k > 0) return { cpk: c / k, custo: c, km: k };
    return { cpk: 0, custo: 0, km: 0 };
  }
  return { cpk: km > 0 ? custo / km : 0, custo, km };
}

export function cpkProjetado(t: Tire): number {
  if (t.kp > 0 && t.ct > 0) return t.ct / t.kp;
  return 0;
}

export function performance(t: Tire): number {
  if (t.kp > 0) return (t.kt / t.kp) * 100;
  return 0;
}

/** Soma KM real, KM projetado, custo e nº de ciclos encerrados (vidas anteriores à atual) de um pneu.
 *  Ignora campos vazios (0). Não inclui a vida ativa nem projeções futuras. */
export function encerradoStats(t: Tire): { kmReal: number; kmProj: number; custo: number; ciclos: number } {
  const closed = Math.max(0, (t.v || 1) - 1);
  let kmReal = 0, kmProj = 0, custo = 0, ciclos = 0;
  for (let i = 0; i < closed; i++) {
    const k = t.km[i] || 0;
    const kp = t.kpv[i] || 0;
    const c = t.cv[i] || 0;
    if (k > 0 && kp > 0) {
      kmReal += k; kmProj += kp; custo += c; ciclos += 1;
    }
  }
  return { kmReal, kmProj, custo, ciclos };
}

export function isRecap(t: Tire): boolean {
  return (t.mm ?? 99) <= 4;
}

export function statusNorm(t: Tire): "ativo" | "recapagem" | "sucata" | "outro" {
  const s = (t.st || "").toLowerCase();
  if (s.includes("ativ")) return "ativo";
  if (s.includes("recap")) return "recapagem";
  if (s.includes("sucat") || s.includes("descart")) return "sucata";
  return "outro";
}

export function isDianteiro(po: string): "D" | "E" | null {
  const p = (po || "").toUpperCase().trim();
  // 1DD = 1ª eixo dianteiro direito; 1DE = dianteiro esquerdo
  if (p === "1DD" || p === "1D") return "D";
  if (p === "1DE" || p === "1E") return "E";
  return null;
}

export type DesgastePair = {
  pl: string;
  fi: string;
  mmD: number;
  mmE: number;
  diff: number;
  severidade: "alta" | "média" | "baixa";
};

export function calcularDesgasteIrregular(tires: Tire[]): DesgastePair[] {
  const byPlaca = new Map<string, { D?: Tire; E?: Tire }>();
  for (const t of tires) {
    const side = isDianteiro(t.po);
    if (!side) continue;
    const e = byPlaca.get(t.pl) || {};
    e[side] = t;
    byPlaca.set(t.pl, e);
  }
  const out: DesgastePair[] = [];
  for (const [pl, { D, E }] of byPlaca) {
    if (!D || !E || D.mm == null || E.mm == null) continue;
    const diff = Math.abs(D.mm - E.mm);
    if (diff >= 1.6) {
      out.push({
        pl, fi: D.fi, mmD: D.mm, mmE: E.mm, diff,
        severidade: diff >= 3 ? "alta" : diff >= 2.2 ? "média" : "baixa",
      });
    }
  }
  return out.sort((a, b) => b.diff - a.diff);
}

export function fabricante(md: string): string {
  return (md || "").split(/\s+/)[0] || "—";
}

export function uniq<T>(arr: T[]): T[] { return [...new Set(arr)]; }
