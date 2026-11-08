import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { NAV, url } from '@/lib/url'
import { cn } from '@/lib/utils'

/** Menu do celular (Sheet do shadcn). */
export function MobileNav({ atual }: { atual: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)} aria-label="Abrir menu">
        <Menu />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 gap-0 p-0">
          <SheetTitle className="border-b px-5 py-4 font-heading text-base">Radar Financeiro</SheetTitle>
          <SheetDescription className="sr-only">Navegação principal</SheetDescription>
          <nav className="flex flex-col gap-1 p-3">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={url(item.href)}
                className={cn(
                  'rounded-none px-3 py-2 text-sm transition-colors',
                  atual.startsWith(item.href)
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  )
}
