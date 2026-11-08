// Testes das funções que ligam as fontes do BCB (rodar com `npm test`).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chaveNome, labelAnoMes, numBR, slugify, ultimosMeses } from './bcb.mjs'

test('chaveNome casa o nome do ranking com o do IF.data', () => {
  // ranking: "NU PAGAMENTOS (conglomerado)"; IF.data: "NU PAGAMENTOS - PRUDENCIAL"
  assert.equal(chaveNome('NU PAGAMENTOS (conglomerado)'), chaveNome('NU PAGAMENTOS - PRUDENCIAL'))
  assert.equal(chaveNome('MERCADO PAGO IP (conglomerado)'), chaveNome('MERCADO PAGO IP - PRUDENCIAL'))
  assert.equal(chaveNome('PICPAY - FINANCEIRO'), 'PICPAY')
})

test('chaveNome ignora acentos, caixa e sufixos societários', () => {
  assert.equal(chaveNome('Caixa Econômica Federal'), 'CAIXA ECONOMICA FEDERAL')
  assert.equal(chaveNome('AGORACRED S/A SCFI'), 'AGORACRED')
  assert.equal(chaveNome('BANCO X S.A.'), 'BANCO X')
})

test('numBR lê números no formato brasileiro do CSV', () => {
  assert.equal(numBR('6,01'), 6.01)
  assert.equal(numBR('1.234,5'), 1234.5)
  assert.equal(numBR(' '), null)
  assert.equal(numBR(undefined), null)
})

test('ultimosMeses atravessa a virada do ano', () => {
  assert.deepEqual(ultimosMeses(202602, 4), [202511, 202512, 202601, 202602])
  assert.deepEqual(ultimosMeses(202610, 1), [202610])
})

test('labelAnoMes formata o mês em português', () => {
  assert.equal(labelAnoMes(202609), 'set/2026')
  assert.equal(labelAnoMes('202601'), 'jan/2026')
})

test('slugify gera endereços limpos', () => {
  assert.equal(slugify('Banco do Brasil'), 'banco-do-brasil')
  assert.equal(slugify('Itaú Unibanco'), 'itau-unibanco')
  assert.equal(slugify('PagBank (PagSeguro)'), 'pagbank-pagseguro')
})
