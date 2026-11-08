import { useEffect, useState } from 'react'
import { Building2, FileWarning, Landmark, Percent, Search, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { url } from '@/lib/url'

type Item = { s: string; n: string; o: string; t: string; u: string | null }

const sem = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Busca rápida (⌘K / Ctrl+K) por instituição ou seção. O índice (/busca.json)
 * só é baixado na primeira abertura.
 */
export function SearchCommand() {
  const [open, setOpen] = useState(false)
  const [itens, setItens] = useState<Item[] | null>(null)
  const [mod, setMod] = useState('Ctrl')

  useEffect(() => {
    if (/Mac|iPhone|iPad/.test(navigator.platform)) setMod('⌘')
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!open || itens) return
    fetch(url('/busca.json'))
      .then((r) => r.json())
      .then(setItens)
      .catch(() => setItens([]))
  }, [open, itens])

  const go = (path: string) => {
    window.location.href = url(path)
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        // O estilo Sera deixa botões em maiúsculas e espaçados; este se comporta
        // como um campo de busca, então volta ao texto normal.
        className="h-9 w-full justify-start gap-2 text-sm font-normal tracking-normal normal-case text-muted-foreground md:w-64"
        aria-label="Buscar instituição"
      >
        <Search />
        <span className="flex-1 text-left">Buscar instituição…</span>
        <Kbd className="hidden sm:inline-flex">{mod} K</Kbd>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Buscar"
        description="Encontre uma instituição ou seção"
        className="sm:max-w-xl"
      >
        {/* Nesta versão do shadcn o CommandDialog não traz o <Command>. */}
        <Command
          filter={(value, search, keywords) => {
            const alvo = sem([value, ...(keywords ?? [])].join(' '))
            return sem(search)
              .split(/\s+/)
              .every((p) => alvo.includes(p))
              ? 1
              : 0
          }}
        >
          <CommandInput placeholder="Nome do banco, financeira, cooperativa…" />
          <CommandList>
            <CommandEmpty>{itens ? 'Nada encontrado.' : 'Carregando…'}</CommandEmpty>
            <CommandGroup heading="Seções">
              <CommandItem value="instituicoes" keywords={['bancos', 'lista']} onSelect={() => go('/instituicoes')}>
                <Building2 /> Todas as instituições
              </CommandItem>
              <CommandItem value="reclamacoes" keywords={['ranking']} onSelect={() => go('/reclamacoes')}>
                <FileWarning /> Ranking de reclamações
              </CommandItem>
              <CommandItem value="juros" keywords={['taxas', 'credito']} onSelect={() => go('/juros')}>
                <Percent /> Taxas de juros
              </CommandItem>
              <CommandItem value="pix" keywords={['fraudes', 'transacoes']} onSelect={() => go('/pix')}>
                <Zap /> Pix
              </CommandItem>
            </CommandGroup>
            {itens && itens.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Instituições">
                  {itens.map((i) => (
                    <CommandItem key={i.s} value={i.s} keywords={[i.n, i.o, i.t]} onSelect={() => go(`/instituicoes/${i.s}`)}>
                      <Landmark />
                      <span className="truncate">{i.n}</span>
                      <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                        {i.t}
                        {i.u ? ` · ${i.u}` : ''}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
