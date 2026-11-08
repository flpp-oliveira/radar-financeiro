import { ArrowUpRight, Building2, FileWarning, Percent, Zap, type LucideIcon } from 'lucide-react'
import { MagicCard } from '@/components/ui/magic-card'

const ICONS: Record<string, LucideIcon> = { Building2, FileWarning, Percent, Zap }

/** Atalho para uma seção, com a borda que segue o mouse (MagicCard, Magic UI). */
export function ExploreCard({
  href,
  title,
  description,
  icon,
  stat,
}: {
  href: string
  title: string
  description: string
  icon: keyof typeof ICONS
  stat: string
}) {
  const Icon = ICONS[icon]
  return (
    <MagicCard
      className="h-full rounded-none"
      gradientFrom="var(--color-primary)"
      gradientTo="var(--color-info)"
      gradientColor="color-mix(in oklch, var(--color-primary) 18%, transparent)"
      gradientSize={260}
    >
      <a href={href} className="group flex h-full flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <span className="flex size-10 items-center justify-center rounded-none bg-primary/10 text-primary">
            <Icon className="size-5" />
          </span>
          <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
        </div>
        <div>
          <h3 className="font-heading text-lg font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <p className="mt-auto text-sm font-medium text-primary">{stat}</p>
      </a>
    </MagicCard>
  )
}
