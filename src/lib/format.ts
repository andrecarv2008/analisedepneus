export const fmtNum = (n: number, d = 0) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n || 0);

export const fmtMoney = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n || 0);

export const fmtMoneyK = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `R$ ${(n / 1_000).toFixed(1)}k`;
  return fmtMoney(n);
};

export const fmtPct = (n: number, d = 1) =>
  `${(n || 0).toFixed(d)}%`;

export const fmtCpk = (n: number) =>
  `R$ ${(n || 0).toFixed(3)}`;
