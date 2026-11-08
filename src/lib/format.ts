// Formatação de números no padrão brasileiro.

const intFmt = new Intl.NumberFormat('pt-BR')

export function inteiro(n: number | null | undefined): string {
  return n == null ? '—' : intFmt.format(Math.round(n))
}

/** R$ em escala legível: R$ 2,85 tri, R$ 412,3 bi, R$ 18,2 mi, R$ 950 mil. */
export function reaisCompacto(n: number | null | undefined): string {
  if (n == null) return '—'
  const abs = Math.abs(n)
  const sinal = n < 0 ? '−' : ''
  const f = (v: number, d: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })
  if (abs >= 1e12) return `${sinal}R$ ${f(abs / 1e12, 2)} tri`
  if (abs >= 1e9) return `${sinal}R$ ${f(abs / 1e9, 1)} bi`
  if (abs >= 1e6) return `${sinal}R$ ${f(abs / 1e6, 1)} mi`
  if (abs >= 1e3) return `${sinal}R$ ${f(abs / 1e3, 0)} mil`
  return `${sinal}R$ ${f(abs, 0)}`
}

/** Quantidade em escala legível: 14,5 bi, 375,4 mi, 12 mil. */
export function quantidadeCompacta(n: number | null | undefined): string {
  if (n == null) return '—'
  const f = (v: number, d: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: d })
  if (n >= 1e9) return `${f(n / 1e9, 1)} bi`
  if (n >= 1e6) return `${f(n / 1e6, 1)} mi`
  if (n >= 1e3) return `${f(n / 1e3, 0)} mil`
  return f(n, 0)
}

export function reais(n: number | null | undefined): string {
  if (n == null) return '—'
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** 0.1535 -> "15,4%" */
export function percentual(proporcao: number | null | undefined, casas = 1): string {
  if (proporcao == null) return '—'
  return `${(proporcao * 100).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`
}

/** 2.4 -> "2,40%" (valores que já vêm em %) */
export function taxa(pct: number | null | undefined, casas = 2): string {
  if (pct == null) return '—'
  return `${pct.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`
}

export function decimal(n: number | null | undefined, casas = 2): string {
  if (n == null) return '—'
  return n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
}
