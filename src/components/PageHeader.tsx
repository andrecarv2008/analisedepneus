export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6 animate-fade-up flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-8 w-1 rounded-full" style={{ background: "var(--gradient-primary)" }} />
          <h1 className="font-display text-3xl font-bold tracking-tight">
            <span className="text-gradient">{title}</span>
          </h1>
        </div>
        {subtitle && <p className="text-sm text-muted-foreground ml-4">{subtitle}</p>}
      </div>
    </div>
  );
}
