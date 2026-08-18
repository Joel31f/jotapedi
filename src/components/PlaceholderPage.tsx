import type { LucideIcon } from 'lucide-react'

export function PlaceholderPage({ title, icon: Icon, description }: { title: string; icon: LucideIcon; description: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-6" />
      </div>
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
