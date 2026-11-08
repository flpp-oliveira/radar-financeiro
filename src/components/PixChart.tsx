import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { quantidadeCompacta, reaisCompacto } from '@/lib/format'

type Ponto = { label: string; valor: number }

const config = {
  valor: { label: 'Valor', color: 'var(--chart-1)' },
} satisfies ChartConfig

/**
 * Série mensal do Pix (área ou barras), com o shadcn Chart (Recharts).
 * `formato` define como os números aparecem no eixo e no tooltip.
 */
export function PixChart({
  dados,
  formato = 'quantidade',
  tipo = 'area',
  altura = 260,
  compacto = false,
  cor = 'var(--chart-1)',
}: {
  dados: Ponto[]
  formato?: 'quantidade' | 'reais'
  tipo?: 'area' | 'barra'
  altura?: number
  compacto?: boolean
  cor?: string
}) {
  const fmt = formato === 'reais' ? reaisCompacto : quantidadeCompacta
  const cfg = { valor: { ...config.valor, color: cor } } satisfies ChartConfig
  const tooltip = (
    <ChartTooltip
      cursor={false}
      content={<ChartTooltipContent formatter={(v) => <span className="font-medium tabular">{fmt(Number(v))}</span>} />}
    />
  )
  return (
    // aspect-auto: o ChartContainer vem com aspect-video, que com a altura fixa
    // forçaria a largura (estourando a tela no celular).
    <ChartContainer config={cfg} className="aspect-auto w-full" style={{ height: altura }}>
      {tipo === 'area' ? (
        <AreaChart data={dados} margin={{ left: compacto ? 0 : 4, right: 8, top: 8 }}>
          <defs>
            <linearGradient id={`fill-${formato}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-valor)" stopOpacity={0.45} />
              <stop offset="95%" stopColor="var(--color-valor)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          {!compacto && <CartesianGrid vertical={false} strokeDasharray="3 3" />}
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} hide={compacto} />
          {!compacto && <YAxis tickLine={false} axisLine={false} width={72} tickFormatter={(v) => fmt(v)} />}
          {tooltip}
          <Area dataKey="valor" type="monotone" stroke="var(--color-valor)" strokeWidth={2} fill={`url(#fill-${formato})`} />
        </AreaChart>
      ) : (
        <BarChart data={dados} margin={{ left: 4, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} width={72} tickFormatter={(v) => fmt(v)} />
          {tooltip}
          <Bar dataKey="valor" fill="var(--color-valor)" radius={[6, 6, 0, 0]} />
        </BarChart>
      )}
    </ChartContainer>
  )
}
