// Worker da Cloudflare que serve o site estático (pasta dist/).
//
// Todo acesso passa por aqui (run_worker_first no wrangler.jsonc) só para
// ficar registrado na observabilidade (Workers Logs): caminho, status e tempo
// de resposta. O conteúdo em si vem dos assets gerados pelo Astro.
export default {
  async fetch(request, env) {
    const inicio = Date.now()
    const resposta = await env.ASSETS.fetch(request)
    const url = new URL(request.url)

    // Log estruturado: aparece filtrável no painel de Observability.
    console.log({
      tipo: 'acesso',
      caminho: url.pathname,
      status: resposta.status,
      ms: Date.now() - inicio,
      pais: request.cf?.country ?? null,
    })

    // Cache: páginas revalidam a cada hora (os dados mudam toda semana);
    // arquivos com hash no nome (/_astro/*) podem ficar em cache por 1 ano.
    const headers = new Headers(resposta.headers)
    if (url.pathname.startsWith('/_astro/')) {
      headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    } else if (resposta.status === 200) {
      headers.set('Cache-Control', 'public, max-age=0, s-maxage=3600, must-revalidate')
    }
    headers.set('X-Content-Type-Options', 'nosniff')
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

    return new Response(resposta.body, { status: resposta.status, headers })
  },
}
