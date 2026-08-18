import type { ReactNode } from 'react'

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-1">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              J
            </div>
            <span className="text-xl font-semibold text-foreground">Jotapedi</span>
          </div>
          <h1 className="mt-4 text-lg font-medium text-foreground">{title}</h1>
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">{children}</div>
      </div>
    </div>
  )
}
