// Referências de mercado calculadas no build, para dar contexto aos números
// de cada instituição (ex.: "a tarifa deste banco vs. a mediana dos bancos").
import { instituicoes, juros } from '@/lib/data'

function mediana(valores: number[]): number | null {
  if (!valores.length) return null
  const v = [...valores].sort((a, b) => a - b)
  const m = Math.floor(v.length / 2)
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2
}

/** Mediana do valor de cada serviço (código BCB), só tarifas em reais. */
export const medianaTarifa: Map<string, number> = (() => {
  const porCodigo = new Map<string, number[]>()
  for (const i of instituicoes) {
    for (const t of i.tarifas?.itens ?? []) {
      if (t.tipoValor !== 'Real' || !(t.valor > 0)) continue
      if (!porCodigo.has(t.codigo)) porCodigo.set(t.codigo, [])
      porCodigo.get(t.codigo)!.push(t.valor)
    }
  }
  const out = new Map<string, number>()
  for (const [c, vs] of porCodigo) if (vs.length >= 5) out.set(c, mediana(vs)!)
  return out
})()

/** Quantas instituições aparecem no ranking de cada modalidade de juros. */
export const totalPorModalidade: Map<string, number> = new Map(
  juros.modalidades.map((m) => [`${m.segmento}|${m.modalidade}`, m.taxas.length]),
)

export const BASILEIA_MINIMO = 0.105
