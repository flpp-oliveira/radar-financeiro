// Coletor do Radar Financeiro: busca dados abertos do Banco Central, liga as
// fontes pela instituição e grava JSONs limpos em src/data/, que as páginas
// usam no build. Rodar com `npm run collect`.
//
// Fontes (todas públicas — https://dadosabertos.bcb.gov.br):
//   IF.data ............ cadastro e indicadores (ativo, crédito, PL, lucro, Basileia)
//   Ranking RDR ........ índice de reclamações por instituição (trimestral)
//   Tarifas ............ tarifas de serviços para pessoa física, por instituição
//   Taxas de juros ..... ranking semanal por modalidade de crédito
//   Pix ................ transações, fraudes (MED) e chaves por participante
//
// Ligação entre fontes: a unidade de página é a do IF.data "Tipo 1"
// (conglomerado prudencial ou instituição independente). O cadastro diz a
// qual conglomerado pertence cada instituição individual (CNPJ de 8 dígitos),
// então tarifas, juros e chaves Pix (que vêm por instituição) e o ranking
// (que vem por conglomerado, pelo nome) chegam todos à mesma página.

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { cached } from './lib/cache.mjs'
import { APELIDOS } from './lib/apelidos.mjs'
import {
  chaveNome,
  fetchRetry,
  labelAnoMes,
  numBR,
  olinda,
  pool,
  slugify,
  ultimosMeses,
} from './lib/bcb.mjs'

const OUT = join(process.cwd(), 'src', 'data')
mkdirSync(OUT, { recursive: true })
const log = (...a) => console.log('[coleta]', ...a)
const write = (name, data) => {
  writeFileSync(join(OUT, name), JSON.stringify(data))
  log(`gravado ${name}`)
}

const hoje = new Date()
const anoMesAtual = hoje.getFullYear() * 100 + (hoje.getMonth() + 1)

// ---------------------------------------------------------------- IF.data

const TIPOS = {
  B1: 'Banco comercial ou múltiplo',
  B2: 'Banco de investimento ou câmbio',
  B3S: 'Cooperativa de crédito',
  B3C: 'Central de cooperativas',
  B4: 'Banco de desenvolvimento',
  N1: 'Financeira / crédito não bancário',
  N2: 'Mercado de capitais',
  N3: 'Não bancária',
  N4: 'Instituição de pagamento',
}
const SEGMENTOS = {
  S1: 'Porte grande ou atividade internacional relevante (≥ 10% do PIB)',
  S2: 'Porte relevante (1% a 10% do PIB)',
  S3: 'Porte médio (0,1% a 1% do PIB)',
  S4: 'Porte pequeno (< 0,1% do PIB)',
  S5: 'Porte muito pequeno, perfil de risco simplificado',
}
const COLUNAS = {
  'Ativo Total': 'ativoTotal',
  'Carteira de Crédito': 'carteiraCredito',
  'Patrimônio Líquido': 'patrimonioLiquido',
  'Lucro Líquido': 'lucroLiquido',
  Captações: 'captacoes',
  'Índice de Basileia': 'indiceBasileia',
  'Índice de Imobilização': 'indiceImobilizacao',
}

/** IF.data é trimestral e sai com ~2 meses de atraso: procura o mais recente. */
async function ultimoIfData() {
  let y = Math.floor(anoMesAtual / 100)
  let m = Math.floor(((anoMesAtual % 100) - 1) / 3) * 3 + 3
  for (let k = 0; k < 8; k++) {
    const am = y * 100 + m
    const cad = await cached(`ifdata-cad-${am}`, () => olinda('IFDATA', 'v1', 'IfDataCadastro', { AnoMes: am }))
    if (cad.length) return { am, cad }
    m -= 3
    if (m <= 0) { m += 12; y-- }
  }
  throw new Error('IF.data: nenhum período encontrado')
}

const { am: ifAm, cad } = await ultimoIfData()
log(`IF.data ${labelAnoMes(ifAm)}: ${cad.length} linhas de cadastro`)

const valores = await cached(`ifdata-val-${ifAm}-1`, () =>
  olinda('IFDATA', 'v1', 'IfDataValores', { AnoMes: ifAm, TipoInstituicao: 1, Relatorio: '1' }),
)
const indicadoresPorInst = new Map()
for (const v of valores) {
  const key = COLUNAS[v.NomeColuna]
  if (!key) continue
  if (!indicadoresPorInst.has(v.CodInst)) indicadoresPorInst.set(v.CodInst, {})
  indicadoresPorInst.get(v.CodInst)[key] = v.Saldo
}

const cadPorCod = new Map()
for (const c of cad) if (!cadPorCod.has(c.CodInst)) cadPorCod.set(c.CodInst, c)

// Instituições (unidade de página)
const instituicoes = []
const slugsUsados = new Set()
for (const [cod, ind] of indicadoresPorInst) {
  const c = cadPorCod.get(cod)
  if (!c || c.Situacao !== 'A') continue
  const cnpj8 = /^\d{8}$/.test(cod) ? cod : c.CnpjInstituicaoLider || null
  // "ITAU - PRUDENCIAL" -> "ITAU": o sufixo é técnico, não faz parte do nome.
  const nomeOficial = c.NomeInstituicao.replace(/\s-\s(PRUDENCIAL|FINANCEIRO)\s*$/i, '').trim()
  // Nome popular quando houver (Nubank, Banco do Brasil…): exibição, busca e URL.
  const nome = APELIDOS[nomeOficial] ?? nomeOficial
  let slug = slugify(nome) || cod.toLowerCase()
  if (slugsUsados.has(slug)) slug = `${slug}-${(cnpj8 ?? cod).toLowerCase()}`
  slugsUsados.add(slug)
  instituicoes.push({
    id: cod,
    slug,
    nome,
    nomeOficial,
    cnpj8,
    conglomerado: !/^\d{8}$/.test(cod),
    tipo: c.Tcb ?? null,
    tipoNome: TIPOS[c.Tcb] ?? 'Outro',
    segmentoTb: c.SegmentoTb ?? null,
    segmento: c.Sr ?? null,
    segmentoNome: SEGMENTOS[c.Sr] ?? null,
    uf: c.Uf ?? null,
    municipio: c.Municipio ?? null,
    inicioAtividade: c.DataInicioAtividade ? String(c.DataInicioAtividade).slice(0, 4) : null,
    indicadores: ind,
  })
}
const porId = new Map(instituicoes.map((i) => [i.id, i]))
log(`${instituicoes.length} instituições ativas`)

// Resolve um CNPJ de 8 dígitos (instituição individual) para a página.
const cnpjParaId = new Map()
for (const c of cad) {
  if (!/^\d{8}$/.test(c.CodInst)) continue
  if (porId.has(c.CodInst)) cnpjParaId.set(c.CodInst, c.CodInst)
  else if (porId.has(c.CodConglomeradoPrudencial)) cnpjParaId.set(c.CodInst, c.CodConglomeradoPrudencial)
}
for (const i of instituicoes) if (i.cnpj8 && !cnpjParaId.has(i.cnpj8)) cnpjParaId.set(i.cnpj8, i.id)
const resolveCnpj = (cnpj) => cnpjParaId.get(String(cnpj ?? '').replace(/\D/g, '').slice(0, 8)) ?? null

// Resolve um nome (ranking vem por nome de conglomerado) para a página.
const nomeParaId = new Map()
for (const c of cad) {
  const alvo = porId.has(c.CodInst)
    ? c.CodInst
    : porId.has(c.CodConglomeradoPrudencial)
      ? c.CodConglomeradoPrudencial
      : null
  if (alvo && !nomeParaId.has(chaveNome(c.NomeInstituicao))) nomeParaId.set(chaveNome(c.NomeInstituicao), alvo)
}
// Nomes compostos ("BTG PACTUAL/BANCO PAN"): tenta o nome inteiro e cada parte.
const resolveNome = (nome) => {
  for (const tentativa of [nome, ...String(nome).split('/')]) {
    const id = nomeParaId.get(chaveNome(tentativa))
    if (id) return id
  }
  return null
}

// ------------------------------------------------ Ranking de reclamações

const RDR = 'https://www3.bcb.gov.br/rdrweb/rest/ext/ranking'
const rdrIndice = await cached('rdr-indice', () => fetchRetry(RDR))
let rdrPeriodo = null
for (const ano of [...rdrIndice.anos].reverse()) {
  const tri = ano.periodicidades.find((p) => p.periodicidade === 'TRIMESTRAL')
  const per = tri && [...tri.periodos].reverse().find((p) => p.tipos.some((t) => t.tipo === 'Bancos e financeiras'))
  if (per) { rdrPeriodo = { ano: Number(ano.ano), tri: per.periodo }; break }
}
const rdrCsv = await cached(`rdr-${rdrPeriodo.ano}-${rdrPeriodo.tri}`, async () => {
  const buf = await fetchRetry(
    `${RDR}/arquivo?ano=${rdrPeriodo.ano}&periodicidade=TRIMESTRAL&periodo=${rdrPeriodo.tri}&tipo=${encodeURIComponent('Bancos e financeiras')}`,
    { as: 'buffer' },
  )
  return new TextDecoder('latin1').decode(buf) // o CSV do BCB vem em Latin-1
})
const linhasCsv = rdrCsv.split(/\r?\n/).filter((l) => l.trim())
const reclamacoes = []
for (const linha of linhasCsv.slice(1)) {
  const c = linha.split(';')
  if (c.length < 13) continue
  const nome = c[5].replace(/\s*\(conglomerado\)\s*/i, '').trim()
  const id = (c[4].trim() && resolveCnpj(c[4])) || resolveNome(nome)
  reclamacoes.push({
    nome,
    categoria: /^Top/.test(c[2]) ? 'top15' : 'demais',
    indice: numBR(c[6]),
    respondidas: numBR(c[7]),
    procedentes: numBR(c[8]),
    clientes: numBR(c[11]),
    instituicao: id,
  })
}
// Posição: dentro de cada categoria, maior índice = 1º (como no ranking do BCB).
for (const cat of ['top15', 'demais']) {
  reclamacoes
    .filter((r) => r.categoria === cat && r.indice != null)
    .sort((a, b) => b.indice - a.indice)
    .forEach((r, i, arr) => { r.posicao = i + 1; r.total = arr.length })
}
for (const r of reclamacoes) if (r.instituicao && porId.has(r.instituicao)) porId.get(r.instituicao).reclamacoes = r
log(`reclamações ${rdrPeriodo.tri}º tri/${rdrPeriodo.ano}: ${reclamacoes.length} linhas, ${reclamacoes.filter((r) => r.instituicao).length} ligadas`)

// --------------------------------------------------------------- Juros

const JUROS = ['taxaJuros', 'v2']
const ultimoJuros = await cached('juros-ultimo', () =>
  olinda(...JUROS, 'TaxasJurosDiariaPorInicioPeriodo', {}, { $top: '1', $orderby: 'InicioPeriodo desc' }),
)
const jurosPeriodo = { inicio: ultimoJuros[0].InicioPeriodo, fim: ultimoJuros[0].FimPeriodo }
const jurosLinhas = await cached(`juros-${jurosPeriodo.inicio}`, () =>
  olinda(...JUROS, 'TaxasJurosDiariaPorInicioPeriodo', {}, { $top: '10000', $filter: `InicioPeriodo eq '${jurosPeriodo.inicio}'` }),
)
const modalidades = new Map()
for (const j of jurosLinhas) {
  const key = `${j.Segmento}|${j.Modalidade}`
  if (!modalidades.has(key)) {
    modalidades.set(key, {
      id: slugify(`${j.Segmento === 'PESSOA FÍSICA' ? 'pf' : 'pj'} ${j.Modalidade}`),
      segmento: j.Segmento === 'PESSOA FÍSICA' ? 'PF' : 'PJ',
      modalidade: j.Modalidade,
      taxas: [],
    })
  }
  const id = resolveCnpj(j.cnpj8)
  modalidades.get(key).taxas.push({
    posicao: j.Posicao,
    nome: j.InstituicaoFinanceira,
    taxaMes: j.TaxaJurosAoMes,
    taxaAno: j.TaxaJurosAoAno,
    instituicao: id,
  })
  if (id && porId.has(id)) {
    const inst = porId.get(id)
    // Conglomerados têm várias empresas no ranking (Itaú, Itaucard, Hipercard…):
    // guarda o nome para mostrar de qual delas é cada taxa.
    ;(inst.juros ??= []).push({
      empresa: j.InstituicaoFinanceira,
      segmento: j.Segmento === 'PESSOA FÍSICA' ? 'PF' : 'PJ',
      modalidade: j.Modalidade,
      taxaMes: j.TaxaJurosAoMes,
      taxaAno: j.TaxaJurosAoAno,
      posicao: j.Posicao,
    })
  }
}
const juros = [...modalidades.values()]
  .map((m) => ({ ...m, taxas: m.taxas.sort((a, b) => a.posicao - b.posicao) }))
  .sort((a, b) => a.segmento.localeCompare(b.segmento) || a.modalidade.localeCompare(b.modalidade))
log(`juros ${jurosPeriodo.inicio}: ${juros.length} modalidades, ${jurosLinhas.length} taxas`)

// -------------------------------------------------------------- Tarifas

const TARIFAS = ['Informes_ListaTarifasPorInstituicaoFinanceira', 'v1']
// Grupos 03 e 15 são agregações dos demais.
const grupos = (await cached('tarifas-grupos', () => olinda(...TARIFAS, 'GruposConsolidados'))).filter(
  (g) => !['03', '15'].includes(g.Codigo),
)
const instTarifa = new Map()
for (const g of grupos) {
  const lista = await cached(`tarifas-grupo-${g.Codigo}`, () =>
    olinda(...TARIFAS, 'ListaInstituicoesDeGrupoConsolidado', { CodigoGrupoConsolidado: g.Codigo }),
  )
  for (const i of lista) if (resolveCnpj(i.Cnpj)) instTarifa.set(i.Cnpj, i.Nome)
}
log(`tarifas: ${instTarifa.size} instituições ligadas; buscando...`)
await pool([...instTarifa.keys()], 8, async (cnpj) => {
  const lista = await cached(`tarifas-pf-${cnpj}`, () =>
    olinda(...TARIFAS, 'ListaTarifasPorInstituicaoFinanceira', { PessoaFisicaOuJuridica: 'F', CNPJ: cnpj }).catch(() => []),
  )
  if (!lista.length) return
  const inst = porId.get(resolveCnpj(cnpj))
  // Conglomerados têm várias instituições com tarifas (banco, holding,
  // financeira…): fica a tabela mais completa, em geral a do banco de varejo.
  if (inst.tarifas && inst.tarifas.itens.length >= lista.length) return
  inst.tarifas = {
    instituicao: instTarifa.get(cnpj),
    itens: lista
      .map((t) => ({
        codigo: t.CodigoServico,
        servico: t.Servico,
        valor: t.ValorMaximo,
        tipoValor: t.TipoValor,
        unidade: t.Unidade,
        periodicidade: t.Periodicidade,
        vigencia: t.DataVigencia,
      }))
      .sort((a, b) => a.servico.localeCompare(b.servico)),
  }
})
log(`tarifas: ${instituicoes.filter((i) => i.tarifas).length} páginas com tarifas`)

// ------------------------------------------------------------------ Pix

const PIX = ['Pix_DadosAbertos', 'v1']
// Atenção: nestas funções o parâmetro Database significa "a partir deste mês"
// (YYYYMM) — a resposta traz todos os meses seguintes, cada linha com o seu
// AnoMes. Por isso fazemos UMA consulta a partir do início da janela e
// agrupamos por AnoMes (consultar mês a mês somaria meses repetidos).
const PIX_MESES = 13
const pixInicio = ultimosMeses(anoMesAtual, PIX_MESES + 2)[0]
const [pixTx, pixFraude] = await Promise.all([
  cached(`pix-tx-desde-${pixInicio}`, () => olinda(...PIX, 'EstatisticasTransacoesPix', { Database: String(pixInicio) })),
  cached(`pix-fraude-desde-${pixInicio}`, () => olinda(...PIX, 'EstatisticasFraudesPix', { Database: String(pixInicio) })),
])
const txPorMes = new Map()
for (const t of pixTx) {
  if (!txPorMes.has(t.AnoMes)) txPorMes.set(t.AnoMes, [])
  txPorMes.get(t.AnoMes).push(t)
}
const fraudePorMes = new Map(pixFraude.map((f) => [f.AnoMes, f]))
const pixMeses = [...txPorMes.keys()].sort((a, b) => a - b).slice(-PIX_MESES)
if (!pixMeses.length) throw new Error('Pix: nenhum mês encontrado')
const pixFim = pixMeses.at(-1)

const serie = pixMeses.map((am) => {
  const porNatureza = {}
  let quantidade = 0
  let valor = 0
  for (const t of txPorMes.get(am)) {
    quantidade += t.QUANTIDADE
    valor += t.VALOR
    const n = (porNatureza[t.NATUREZA] ??= { quantidade: 0, valor: 0 })
    n.quantidade += t.QUANTIDADE
    n.valor += t.VALOR
  }
  const f = fraudePorMes.get(am) ?? {}
  return {
    anoMes: am,
    label: labelAnoMes(am),
    quantidade,
    valor,
    porNatureza,
    fraude: {
      contestados: f.QtdePixcontestados ?? null,
      aceitas: f.Qtdecontestacoesaceitas ?? null,
      aceitasPor100mil: f.Qtdecontestacoesaceitasacada100mil ?? null,
      valorAceito: f.ValorPixcontestadosaceitos ?? null,
      devolvidosMed: f.QuantidadedevolvidaintegralmentepormeiodoMED ?? null,
      valorDevolvidoMed: f.ValorPixdevolvidosintegralmente ?? null,
      chavesMarcadas: f.QtdeChavesPixcommarcacoesdefraude ?? null,
    },
  }
})

// Chaves: posição no último dia do mês mais recente com dados.
const ultimoDia = (am) => new Date(Math.floor(am / 100), am % 100, 0).toISOString().slice(0, 10)
let chaves = []
let chavesData = null
for (const am of [...pixMeses].reverse().slice(0, 3)) {
  chaves = await cached(`pix-chaves-${am}`, () => olinda(...PIX, 'ChavesPix', { Data: ultimoDia(am) }))
  if (chaves.length) {
    // Como nas outras funções do Pix, a data pode significar "a partir de":
    // fica só a posição mais recente da resposta, para não somar datas.
    chavesData = chaves.reduce((max, c) => (c.Data > max ? c.Data : max), '')
    chaves = chaves.filter((c) => c.Data === chavesData)
    break
  }
}
const chavesPorTipo = {}
let chavesTotal = 0
const chavesPorIspb = new Map()
for (const c of chaves) {
  chavesTotal += c.qtdChaves
  chavesPorTipo[c.TipoChave] = (chavesPorTipo[c.TipoChave] ?? 0) + c.qtdChaves
  chavesPorIspb.set(c.ISPB, (chavesPorIspb.get(c.ISPB) ?? 0) + c.qtdChaves)
}
for (const [ispb, qtd] of chavesPorIspb) {
  const inst = porId.get(resolveCnpj(ispb))
  if (inst) inst.chavesPix = (inst.chavesPix ?? 0) + qtd
}
log(`Pix: ${pixMeses.length} meses até ${labelAnoMes(pixFim)}, ${chavesTotal.toLocaleString('pt-BR')} chaves`)

// ---------------------------------------------------------------- Saída

const ordenadas = [...instituicoes].sort((a, b) => (b.indicadores.ativoTotal ?? 0) - (a.indicadores.ativoTotal ?? 0))
ordenadas.forEach((i, k) => { i.rankingAtivo = k + 1 })

write('instituicoes.json', ordenadas)
write(
  'instituicoes-lista.json',
  ordenadas.map((i) => ({
    slug: i.slug,
    nome: i.nome,
    nomeOficial: i.nomeOficial,
    tipo: i.tipo,
    tipoNome: i.tipoNome,
    segmento: i.segmento,
    uf: i.uf,
    ativoTotal: i.indicadores.ativoTotal ?? null,
    basileia: i.indicadores.indiceBasileia ?? null,
    reclamacoes: i.reclamacoes?.indice ?? null,
  })),
)
write('reclamacoes.json', {
  periodo: `${rdrPeriodo.tri}º trimestre de ${rdrPeriodo.ano}`,
  itens: reclamacoes.map((r) => {
    const inst = r.instituicao ? porId.get(r.instituicao) : null
    // Exibe o nome popular quando a linha foi ligada a uma página (ex.: "Nubank").
    return { ...r, exibicao: inst?.nome ?? r.nome, slug: inst?.slug ?? null }
  }),
})
write('juros.json', {
  periodo: jurosPeriodo,
  modalidades: juros.map((m) => ({
    ...m,
    taxas: m.taxas.map((t) => ({ ...t, slug: t.instituicao ? porId.get(t.instituicao)?.slug ?? null : null })),
  })),
})
write('pix.json', { serie, chaves: { data: chavesData, total: chavesTotal, porTipo: chavesPorTipo } })

const soma = (k) => instituicoes.reduce((s, i) => s + (i.indicadores[k] ?? 0), 0)
write('meta.json', {
  geradoEm: new Date().toISOString(),
  ifdata: labelAnoMes(ifAm),
  reclamacoes: `${rdrPeriodo.tri}º tri/${rdrPeriodo.ano}`,
  juros: jurosPeriodo,
  pix: labelAnoMes(pixFim),
  totais: {
    instituicoes: instituicoes.length,
    ativoTotal: soma('ativoTotal'),
    carteiraCredito: soma('carteiraCredito'),
    comTarifas: instituicoes.filter((i) => i.tarifas).length,
    comReclamacoes: instituicoes.filter((i) => i.reclamacoes).length,
  },
})
log('pronto.')
