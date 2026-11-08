// Acesso às APIs de dados abertos do Banco Central (Olinda e RDR).
// Todas as fontes são públicas; ver https://dadosabertos.bcb.gov.br

const OLINDA = 'https://olinda.bcb.gov.br/olinda/servico'
const USER_AGENT = 'RadarFinanceiro-coletor/0.1'

/** GET com timeout e novas tentativas (as APIs do BCB às vezes oscilam). */
export async function fetchRetry(url, { tries = 3, timeoutMs = 120_000, as = 'json' } = {}) {
  let lastErr
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: as === 'json' ? 'application/json' : '*/*' },
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`)
      if (as === 'json') return await res.json()
      return Buffer.from(await res.arrayBuffer())
    } catch (err) {
      lastErr = err
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)))
    }
  }
  throw lastErr
}

/** Monta e consulta um recurso OData do Olinda; devolve `value`. */
export async function olinda(servico, versao, recurso, params = {}, query = {}) {
  const fnArgs = Object.keys(params)
  const path = fnArgs.length
    ? `${recurso}(${fnArgs.map((k) => `${k}=@${k}`).join(',')})`
    : recurso
  // Montado à mão: o Olinda exige espaços como %20 (URLSearchParams usaria "+").
  const pares = Object.entries({ $format: 'json', ...query })
  for (const [k, v] of Object.entries(params)) pares.push([`@${k}`, typeof v === 'string' ? `'${v}'` : String(v)])
  const qs = pares.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')
  const url = `${OLINDA}/${servico}/versao/${versao}/odata/${path}?${qs}`
  const json = await fetchRetry(url)
  return json.value ?? []
}

/** Executa tarefas com concorrência limitada. */
export async function pool(items, size, fn) {
  const out = new Array(items.length)
  let i = 0
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++
        out[idx] = await fn(items[idx], idx)
      }
    }),
  )
  return out
}

/** "202606" -> "jun/2026" */
export function labelAnoMes(am) {
  const s = String(am)
  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  return `${meses[Number(s.slice(4, 6)) - 1]}/${s.slice(0, 4)}`
}

/** Anos-mês (YYYYMM) dos últimos `n` meses terminando em `fim`. */
export function ultimosMeses(fim, n) {
  const out = []
  let y = Math.floor(fim / 100)
  let m = fim % 100
  for (let k = 0; k < n; k++) {
    out.unshift(y * 100 + m)
    m--
    if (m === 0) { m = 12; y-- }
  }
  return out
}

/** Minúsculas, sem acentos e sem sufixos societários — para casar nomes entre fontes. */
export function chaveNome(nome) {
  return String(nome ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\(CONGLOMERADO\)/g, '')
    // No IF.data os conglomerados vêm como "NU PAGAMENTOS - PRUDENCIAL"; no
    // ranking de reclamações, só "NU PAGAMENTOS".
    .replace(/\s-\s(PRUDENCIAL|FINANCEIRO)\s*$/g, '')
    .replace(/\b(S\.?\/?A\.?|LTDA|IP|SCFI|SCD|CFI)\b/g, '')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
}

export function slugify(nome) {
  return String(nome)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\(conglomerado\)/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/** "6,01" -> 6.01 ; " " -> null */
export function numBR(v) {
  const s = String(v ?? '').trim()
  if (!s) return null
  const n = Number(s.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
