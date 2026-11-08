// Links internos respeitando o `base` do Astro (ex.: /radar-financeiro/ no
// GitHub Pages). Use sempre url('/caminho') em vez de '/caminho'.
const base = import.meta.env.BASE_URL.replace(/\/$/, '')

export function url(path: string): string {
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

export const NAV = [
  { href: '/instituicoes', label: 'Instituições' },
  { href: '/reclamacoes', label: 'Reclamações' },
  { href: '/juros', label: 'Juros' },
  { href: '/pix', label: 'Pix' },
  { href: '/sobre', label: 'Sobre' },
] as const
