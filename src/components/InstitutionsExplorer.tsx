import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Search, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { InstituicaoResumo } from '@/lib/data'
import { percentual, reaisCompacto } from '@/lib/format'
import { url } from '@/lib/url'
import { cn } from '@/lib/utils'

type Ordem = 'ativoTotal' | 'basileia' | 'reclamacoes' | 'nome'
const POR_PAGINA = 50
const SEGMENTOS = ['S1', 'S2', 'S3', 'S4', 'S5'] as const

const sem = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Lista de instituições com busca, filtros (tipo e porte) e ordenação. */
export function InstitutionsExplorer({ itens }: { itens: InstituicaoResumo[] }) {
  const [busca, setBusca] = useState('')
  const [tipo, setTipo] = useState('todos')
  const [segmentos, setSegmentos] = useState<string[]>([])
  const [ordem, setOrdem] = useState<Ordem>('ativoTotal')
  const [desc, setDesc] = useState(true)
  const [pagina, setPagina] = useState(1)

  const tipos = useMemo(() => {
    const m = new Map<string, number>()
    for (const i of itens) m.set(i.tipoNome, (m.get(i.tipoNome) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [itens])

  const filtradas = useMemo(() => {
    const q = sem(busca.trim())
    const lista = itens.filter(
      (i) =>
        (!q || sem(`${i.nome} ${i.nomeOficial}`).includes(q)) &&
        (tipo === 'todos' || i.tipoNome === tipo) &&
        (!segmentos.length || (i.segmento && segmentos.includes(i.segmento))),
    )
    const dir = desc ? -1 : 1
    return lista.sort((a, b) => {
      if (ordem === 'nome') return a.nome.localeCompare(b.nome) * -dir
      const va = a[ordem]
      const vb = b[ordem]
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1
      return (va - vb) * dir
    })
  }, [itens, busca, tipo, segmentos, ordem, desc])

  const total = filtradas.length
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA))
  const visiveis = filtradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)
  const reset = () => setPagina(1)

  const ordenar = (o: Ordem) => {
    if (o === ordem) setDesc((d) => !d)
    else {
      setOrdem(o)
      setDesc(o !== 'nome')
    }
    reset()
  }

  const Cabecalho = ({ o, children, className }: { o: Ordem; children: React.ReactNode; className?: string }) => (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => ordenar(o)}
        className={cn('inline-flex items-center gap-1 hover:text-foreground', ordem === o && 'text-foreground')}
      >
        {children}
        {ordem === o && (desc ? <ArrowDown className="size-3.5" /> : <ArrowUp className="size-3.5" />)}
      </button>
    </TableHead>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <InputGroup className="lg:max-w-sm">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value)
              reset()
            }}
            placeholder="Buscar pelo nome…"
            aria-label="Buscar instituição pelo nome"
          />
          {busca && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton size="icon-xs" aria-label="Limpar busca" onClick={() => setBusca('')}>
                <X />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>
        <Select
          value={tipo}
          onValueChange={(v) => {
            setTipo(v)
            reset()
          }}
        >
          <SelectTrigger className="w-full lg:w-72" aria-label="Filtrar por tipo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {tipos.map(([t, n]) => (
              <SelectItem key={t} value={t}>
                {t} ({n})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ToggleGroup
          type="multiple"
          variant="outline"
          value={segmentos}
          onValueChange={(v) => {
            setSegmentos(v)
            reset()
          }}
          aria-label="Filtrar por porte (segmento prudencial)"
        >
          {SEGMENTOS.map((s) => (
            <ToggleGroupItem key={s} value={s} className="data-[state=on]:bg-primary/10 data-[state=on]:text-primary">
              {s}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <p className="text-sm text-muted-foreground">
        {total.toLocaleString('pt-BR')} instituições
        {(busca || tipo !== 'todos' || segmentos.length > 0) && (
          <Button
            variant="link"
            size="sm"
            className="ml-1 h-auto p-0"
            onClick={() => {
              setBusca('')
              setTipo('todos')
              setSegmentos([])
              reset()
            }}
          >
            limpar filtros
          </Button>
        )}
      </p>

      <div className="overflow-hidden rounded-none ring-1 ring-foreground/10">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-14 text-right">#</TableHead>
              <Cabecalho o="nome">Instituição</Cabecalho>
              <TableHead className="hidden md:table-cell">Tipo</TableHead>
              <Cabecalho o="ativoTotal" className="text-right">
                Ativo total
              </Cabecalho>
              <Cabecalho o="basileia" className="hidden text-right sm:table-cell">
                Basileia
              </Cabecalho>
              <Cabecalho o="reclamacoes" className="hidden text-right lg:table-cell">
                Reclamações
              </Cabecalho>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiveis.map((i, k) => (
              <TableRow key={i.slug} className="group">
                <TableCell className="text-right text-muted-foreground tabular">
                  {(pagina - 1) * POR_PAGINA + k + 1}
                </TableCell>
                <TableCell className="max-w-0 w-full">
                  <a href={url(`/instituicoes/${i.slug}`)} className="block truncate font-medium group-hover:text-primary">
                    {i.nome}
                  </a>
                  <span className="text-xs text-muted-foreground md:hidden">{i.tipoNome}</span>
                </TableCell>
                <TableCell className="hidden whitespace-nowrap md:table-cell">
                  <span className="text-muted-foreground">{i.tipoNome}</span>
                  {i.segmento && (
                    <Badge variant="outline" className="ml-2">
                      {i.segmento}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap tabular">{reaisCompacto(i.ativoTotal)}</TableCell>
                <TableCell className="hidden text-right tabular sm:table-cell">{percentual(i.basileia)}</TableCell>
                <TableCell className="hidden text-right tabular lg:table-cell">
                  {i.reclamacoes != null ? i.reclamacoes.toLocaleString('pt-BR') : <span className="text-muted-foreground">—</span>}
                </TableCell>
              </TableRow>
            ))}
            {!visiveis.length && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  Nenhuma instituição encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {paginas > 1 && (
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">
            Página {pagina} de {paginas}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={pagina === 1} onClick={() => setPagina((p) => p - 1)}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={pagina === paginas} onClick={() => setPagina((p) => p + 1)}>
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
