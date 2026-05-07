import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, TrendingUp, AlertTriangle, RotateCw, DollarSign, Lightbulb, PieChart, Table2 } from "lucide-react";

const items = [
  { to: "/", label: "Visão Geral", icon: LayoutDashboard },
  { to: "/cpk", label: "CPK", icon: TrendingUp },
  { to: "/desgaste", label: "Desgaste", icon: AlertTriangle },
  { to: "/recapagem", label: "Recapagem", icon: RotateCw },
  { to: "/financeiro", label: "Financeiro", icon: DollarSign },
  { to: "/insights", label: "Insights", icon: Lightbulb },
  { to: "/porcentagens", label: "Porcentagens", icon: PieChart },
  { to: "/tabela", label: "Tabela", icon: Table2 },
] as const;

export function Sidebar() {
  const { pathname } = useLocation();
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="px-6 py-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl glow flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
            <span className="text-primary-foreground font-display font-bold text-lg">T</span>
          </div>
          <div>
            <div className="font-display font-bold text-lg leading-tight">TireOps</div>
            <div className="text-xs text-muted-foreground">Fleet Intelligence</div>
          </div>
        </div>
      </div>
      <nav className="p-3 flex flex-col gap-1 flex-1">
        {items.map((it) => {
          const active = pathname === it.to;
          const Icon = it.icon;
          return (
            <Link key={it.to} to={it.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                active
                  ? "bg-secondary text-foreground glow"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}>
              <Icon className="size-4" />
              <span>{it.label}</span>
              {active && <span className="ml-auto size-1.5 rounded-full bg-primary" />}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-border text-xs text-muted-foreground">
        <div>v1.0 · Executive</div>
      </div>
    </aside>
  );
}
