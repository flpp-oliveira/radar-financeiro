import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Reclamacao } from '@/lib/data'
import { decimal, inteiro, quantidadeCompacta } from '@/lib/format'
import { url } from '@/lib/url'

const sem = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Ranking de reclamações do BCB em duas listas, como o próprio Banco Central
 * publica: as 15 maiores instituições e as demais.
 */
export function ComplaintsRanking({ itens }: { itens: Reclamacao[] }) {
  const [cat, setCat] = useState<'top15' | 'demais'>('top15')
  const [busca, setBusca] = useState('')

  const lista = useMemo(() => {
    const q = sem(busca.trim())
    return itens
      .filter((r) => r.categoria === cat && (!q || sem(`${r.nome} ${r.exibicao ?? ""}`).includes(q)))
      .sort((a, b) => (a.posicao ?? 9999) - (b.posicao ?? 9999) || (b.procedentes ?? 0) - (a.procedentes ?? 0))
  }, [itens, cat, busca])
  const max = Math.max(...lista.map((r) => r.indice ?? 0), 1)
  const semIndice = lista.filter((r) => r.indice == null).length

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={cat} onValueChange={(v) => setCat(v as typeof cat)}>
          <TabsList>
            <TabsTrigger value="top15">15 maiores</TabsTrigger>
            <TabsTrigger value="demais">Demais instituições</TabsTrigger>
          </TabsList>
        </Tabs>
        <InputGroup className="sm:max-w-xs">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar instituição…" aria-label="Buscar instituição" />
        </InputGroup>
      </div>

      <ol className="divide-y overflow-hidden rounded-none bg-card ring-1 ring-foreground/10">
        {lista.map((r) => {
          const conteudo = (
            <div className="grid grid-cols-[2.5rem_1fr] items-center gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,16rem)_7rem]">
              <span className="text-right font-heading text-lg font-semibold text-muted-foreground tabular">
                {r.posicao ? `${r.posicao}º` : '—'}
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium">{r.exibicao ?? r.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {inteiro(r.procedentes)} procedentes de {inteiro(r.respondidas)} · {quantidadeCompacta(r.clientes)} clientes
                </p>
              </div>
              <div className="col-start-2 h-2 overflow-hidden bg-muted sm:col-start-auto">
                {r.indice != null && (
                  <div
                    className="h-full bg-linear-to-r from-warn to-destructive"
                    style={{ width: `${(r.indice / max) * 100}%` }}
                  />
                )}
              </div>
              <span className="col-start-2 text-sm font-medium tabular sm:col-start-auto sm:text-right">
                {r.indice != null ? decimal(r.indice) : <span className="font-normal text-muted-foreground">sem índice</span>}
              </span>
            </div>
          )
          return (
            <li key={r.nome}>
              {r.slug ? (
                <a href={url(`/instituicoes/${r.slug}`)} className="block transition-colors hover:bg-muted/40">
                  {conteudo}
                </a>
              ) : (
                conteudo
              )}
            </li>
          )
        })}
        {!lista.length && <li className="px-4 py-12 text-center text-muted-foreground">Nenhuma instituição encontrada.</li>}
      </ol>
      {semIndice > 0 && (
        <p className="text-sm text-muted-foreground">
          {semIndice} instituições aparecem sem índice: o Banco Central só calcula o índice quando há um número mínimo de
          reclamações procedentes no período.
        </p>
      )}
    </div>
  )
}
