import { useMemo, useState } from 'react'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { ModalidadeJuros } from '@/lib/data'
import { taxa } from '@/lib/format'
import { url } from '@/lib/url'
import { cn } from '@/lib/utils'

/** Ranking de taxas por modalidade: escolhe PF/PJ e a modalidade; barras por taxa. */
export function InterestExplorer({ modalidades }: { modalidades: ModalidadeJuros[] }) {
  const [segmento, setSegmento] = useState<'PF' | 'PJ'>('PF')
  const opcoes = useMemo(() => modalidades.filter((m) => m.segmento === segmento), [modalidades, segmento])
  const padrao = opcoes.find((m) => /rotativo/i.test(m.modalidade)) ?? opcoes[0]
  const [id, setId] = useState(padrao?.id)
  const atual = opcoes.find((m) => m.id === id) ?? opcoes[0]
  const [escala, setEscala] = useState<'mes' | 'ano'>('mes')

  const taxas = atual?.taxas ?? []
  const valor = (t: (typeof taxas)[number]) => (escala === 'mes' ? t.taxaMes : t.taxaAno)
  const max = Math.max(...taxas.map(valor), 0.0001)
  const min = taxas.length ? Math.min(...taxas.map(valor)) : 0
  const mediana = taxas.length ? [...taxas.map(valor)].sort((a, b) => a - b)[Math.floor(taxas.length / 2)] : 0

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <ToggleGroup
          type="single"
          variant="outline"
          value={segmento}
          onValueChange={(v) => {
            if (!v) return
            setSegmento(v as 'PF' | 'PJ')
            const nova = modalidades.filter((m) => m.segmento === v)
            setId((nova.find((m) => /rotativo|cheque especial/i.test(m.modalidade)) ?? nova[0])?.id)
          }}
          aria-label="Pessoa física ou jurídica"
        >
          <ToggleGroupItem value="PF" className="data-[state=on]:bg-primary/10 data-[state=on]:text-primary">
            Pessoa física
          </ToggleGroupItem>
          <ToggleGroupItem value="PJ" className="data-[state=on]:bg-primary/10 data-[state=on]:text-primary">
            Empresas
          </ToggleGroupItem>
        </ToggleGroup>
        <Select value={atual?.id} onValueChange={setId}>
          <SelectTrigger className="w-full md:w-[30rem]" aria-label="Modalidade de crédito">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>{segmento === 'PF' ? 'Pessoa física' : 'Empresas'}</SelectLabel>
              {opcoes.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.modalidade}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <ToggleGroup
          type="single"
          variant="outline"
          value={escala}
          onValueChange={(v) => v && setEscala(v as 'mes' | 'ano')}
          className="md:ml-auto"
          aria-label="Taxa ao mês ou ao ano"
        >
          <ToggleGroupItem value="mes">ao mês</ToggleGroupItem>
          <ToggleGroupItem value="ano">ao ano</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { l: 'Menor taxa', v: min, c: 'text-ok' },
          { l: 'Mediana', v: mediana, c: '' },
          { l: 'Maior taxa', v: max, c: 'text-destructive' },
        ].map((k) => (
          <div key={k.l} className="rounded-none bg-card p-4 ring-1 ring-foreground/10">
            <p className="text-xs text-muted-foreground">{k.l}</p>
            <p className={cn('mt-1 font-heading text-2xl font-semibold tabular', k.c)}>{taxa(k.v)}</p>
            <p className="text-xs text-muted-foreground">{escala === 'mes' ? 'ao mês' : 'ao ano'}</p>
          </div>
        ))}
      </div>

      <ol className="space-y-1 rounded-none bg-card p-2 ring-1 ring-foreground/10">
        {taxas.map((t) => {
          const linha = (
            <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_5.5rem] items-center gap-3 rounded-none px-2 py-2 sm:grid-cols-[2.25rem_minmax(0,18rem)_1fr_5.5rem]">
              <span className="text-right text-sm text-muted-foreground tabular">{t.posicao}º</span>
              <span className="truncate text-sm font-medium">{t.nome}</span>
              <div className="col-span-3 col-start-2 h-2 overflow-hidden bg-muted sm:col-span-1 sm:col-start-auto">
                <div
                  className="h-full bg-linear-to-r from-info to-primary"
                  style={{ width: `${(valor(t) / max) * 100}%` }}
                />
              </div>
              <span className="row-start-1 text-right text-sm font-semibold tabular sm:row-start-auto">{taxa(valor(t))}</span>
            </div>
          )
          return (
            <li key={`${t.posicao}-${t.nome}`}>
              {t.slug ? (
                <a href={url(`/instituicoes/${t.slug}`)} className="block rounded-none transition-colors hover:bg-muted/50">
                  {linha}
                </a>
              ) : (
                linha
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
