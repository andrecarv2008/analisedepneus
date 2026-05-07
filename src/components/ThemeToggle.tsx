import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme-context";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
    >
      {isDark ? <Sun className="size-4 text-warning" /> : <Moon className="size-4 text-info" />}
      <span className="hidden sm:inline">{isDark ? "Claro" : "Escuro"}</span>
    </button>
  );
}
