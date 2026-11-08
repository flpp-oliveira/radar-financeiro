// Cache em disco das respostas das APIs, só para acelerar o desenvolvimento:
// rodar o coletor de novo no mesmo dia não refaz centenas de requisições.
// Em produção (CI) o cache começa vazio e tudo é buscado de novo.
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DIR = join(process.cwd(), '.cache', 'bcb')
const TTL_MS = 20 * 60 * 60 * 1000
mkdirSync(DIR, { recursive: true })

export async function cached(key, fn) {
  if (process.env.NO_CACHE) return fn()
  const file = join(DIR, createHash('sha1').update(key).digest('hex') + '.json')
  try {
    if (Date.now() - statSync(file).mtimeMs < TTL_MS) return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    // sem cache
  }
  const data = await fn()
  writeFileSync(file, JSON.stringify(data))
  return data
}
