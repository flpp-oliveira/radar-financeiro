# Radar Financeiro

O sistema financeiro brasileiro em dados públicos do Banco Central, organizados
para qualquer pessoa entender: porte e solidez de cada instituição, ranking de
reclamações, juros praticados, tarifas e os números do Pix.

## Seções

| Página | Conteúdo | Fonte (BCB) |
|---|---|---|
| `/instituicoes` | 1.398 conglomerados e instituições, com busca e filtros | IF.data |
| `/instituicoes/<nome>` | Uma página por instituição: resumo, indicadores, Basileia, reclamações, juros e tarifas (com mediana do mercado) | IF.data, RDR, taxas de juros, tarifas, Pix |
| `/reclamacoes` | Ranking de reclamações (15 maiores e demais) | Ranking RDR |
| `/juros` | Taxas por modalidade de crédito, PF e PJ | Taxas de juros |
| `/pix` | Transações, valores, quem paga quem, chaves e fraudes (MED) | Estatísticas do Pix |
| `/sobre` | Fontes, metodologia e limitações | — |

## Como funciona

1. **Coleta** (`npm run collect`): `scripts/collect.mjs` busca os dados nas APIs
   abertas do Banco Central, liga as fontes pela instituição (CNPJ e cadastro
   do IF.data) e grava JSONs em `src/data/`.
2. **Build** (`npm run build`): o Astro gera uma página estática para cada
   instituição, boa para busca no Google.
3. **Publicação**: o workflow `.github/workflows/deploy.yml` coleta, verifica e
   publica na **Cloudflare** (Workers + arquivos estáticos) a cada push e
   **toda segunda-feira**.

No ar em <https://radar-financeiro.felippeprofissionalsi.workers.dev>.

### Cloudflare e observabilidade

- `wrangler.jsonc` publica a pasta `dist/` com um Worker pequeno
  (`worker/index.js`) na frente, que registra cada acesso (caminho, status,
  tempo, país) nos **Workers Logs** e define cache e cabeçalhos de segurança.
  Logs e métricas ficam em *Workers & Pages → radar-financeiro → Observability*.
- **Web Analytics** (opcional, sem cookies): crie o site em *Analytics & Logs →
  Web Analytics* e salve o token na variável de repositório `CF_BEACON_TOKEN`.
- Para o deploy automático, o repositório precisa dos segredos
  `CLOUDFLARE_API_TOKEN` (modelo "Edit Cloudflare Workers") e
  `CLOUDFLARE_ACCOUNT_ID`. Sem eles, o workflow só testa e gera o build.
- Deploy manual: `npx wrangler login` e depois `npm run deploy`.

### Cuidados com as APIs do BCB (descobertos na prática)

- Nas funções do Pix, o parâmetro de data significa **"a partir de"**: a
  resposta traz vários meses, então agrupamos por `AnoMes`.
- O CSV do ranking de reclamações vem em **Latin-1** e as linhas de
  conglomerado **não têm CNPJ**: a ligação é pelo nome (sem o sufixo
  `- PRUDENCIAL` usado no IF.data).
- Tarifas exigem o CNPJ com **8 dígitos** (o do Banco do Brasil é `00000000`).
- O Olinda exige espaços como `%20` (não `+`) nos filtros.

## Desenvolvimento

```sh
npm install
npm run collect   # gera src/data/ (≈2 min na primeira vez; depois usa cache)
npm run dev       # http://localhost:4321
```

Outros comandos: `npm test` (testes do coletor), `npm run check` (tipos),
`npm run build`, `npm run preview` (build + Worker local com `wrangler dev`).

**Stack**: Astro + React, Tailwind CSS v4, shadcn/ui e Magic UI.

## Aviso

Projeto independente, sem vínculo com o Banco Central do Brasil. Os dados são
públicos (licença ODbL) e as informações têm caráter educativo, não sendo
recomendação de investimento ou de escolha de instituição.
