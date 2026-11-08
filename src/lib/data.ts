// Tipos e acesso aos dados gerados pelo coletor (scripts/collect.mjs).
// Os JSONs ficam em src/data/ e são lidos em tempo de build.

import instituicoesJson from '@/data/instituicoes.json'
import listaJson from '@/data/instituicoes-lista.json'
import reclamacoesJson from '@/data/reclamacoes.json'
import jurosJson from '@/data/juros.json'
import pixJson from '@/data/pix.json'
import metaJson from '@/data/meta.json'

export interface Indicadores {
  ativoTotal?: number
  carteiraCredito?: number
  patrimonioLiquido?: number
  lucroLiquido?: number
  captacoes?: number
  indiceBasileia?: number
  indiceImobilizacao?: number
}

export interface Reclamacao {
  nome: string
  /** Nome popular da página ligada (ex.: "Nubank"), ou o nome do ranking. */
  exibicao?: string
  categoria: 'top15' | 'demais'
  indice: number | null
  respondidas: number | null
  procedentes: number | null
  clientes: number | null
  instituicao: string | null
  posicao?: number
  total?: number
  slug?: string | null
}

export interface Tarifa {
  codigo: string
  servico: string
  valor: number
  tipoValor: string
  unidade: string
  periodicidade: string
  vigencia: string
}

export interface JurosInstituicao {
  empresa: string
  segmento: 'PF' | 'PJ'
  modalidade: string
  taxaMes: number
  taxaAno: number
  posicao: number
}

export interface Instituicao {
  id: string
  slug: string
  /** Nome exibido: o popular quando houver (ex.: "Nubank"). */
  nome: string
  /** Nome no Banco Central (ex.: "NU PAGAMENTOS"). */
  nomeOficial: string
  cnpj8: string | null
  conglomerado: boolean
  tipo: string | null
  tipoNome: string
  segmentoTb: string | null
  segmento: string | null
  segmentoNome: string | null
  uf: string | null
  municipio: string | null
  inicioAtividade: string | null
  indicadores: Indicadores
  reclamacoes?: Reclamacao
  tarifas?: { instituicao: string; itens: Tarifa[] }
  juros?: JurosInstituicao[]
  chavesPix?: number
  rankingAtivo: number
}

export interface InstituicaoResumo {
  slug: string
  nome: string
  nomeOficial: string
  tipo: string | null
  tipoNome: string
  segmento: string | null
  uf: string | null
  ativoTotal: number | null
  basileia: number | null
  reclamacoes: number | null
}

export interface ModalidadeJuros {
  id: string
  segmento: 'PF' | 'PJ'
  modalidade: string
  taxas: { posicao: number; nome: string; taxaMes: number; taxaAno: number; slug: string | null }[]
}

export interface PixMes {
  anoMes: number
  label: string
  quantidade: number
  valor: number
  porNatureza: Record<string, { quantidade: number; valor: number }>
  fraude: {
    contestados: number | null
    aceitas: number | null
    aceitasPor100mil: number | null
    valorAceito: number | null
    devolvidosMed: number | null
    valorDevolvidoMed: number | null
    chavesMarcadas: number | null
  }
}

export const instituicoes = instituicoesJson as unknown as Instituicao[]
export const listaInstituicoes = listaJson as unknown as InstituicaoResumo[]
export const reclamacoes = reclamacoesJson as unknown as { periodo: string; itens: Reclamacao[] }
export const juros = jurosJson as unknown as {
  periodo: { inicio: string; fim: string }
  modalidades: ModalidadeJuros[]
}
export const pix = pixJson as unknown as {
  serie: PixMes[]
  chaves: { data: string | null; total: number; porTipo: Record<string, number> }
}
export const meta = metaJson as unknown as {
  geradoEm: string
  ifdata: string
  reclamacoes: string
  juros: { inicio: string; fim: string }
  pix: string
  totais: {
    instituicoes: number
    ativoTotal: number
    carteiraCredito: number
    comTarifas: number
    comReclamacoes: number
  }
}

/** "2026-10-16" -> "16/10/2026" */
export function dataBR(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}
