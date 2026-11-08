// Índice da busca rápida, gerado no build como arquivo estático (/busca.json).
// A paleta ⌘K só baixa este arquivo quando é aberta, em vez de embutir
// 1.400 instituições em todas as páginas.
import { listaInstituicoes } from '@/lib/data'

export function GET() {
  const itens = listaInstituicoes.map((i) => ({ s: i.slug, n: i.nome, o: i.nomeOficial, t: i.tipoNome, u: i.uf }))
  return new Response(JSON.stringify(itens), { headers: { 'Content-Type': 'application/json' } })
}
