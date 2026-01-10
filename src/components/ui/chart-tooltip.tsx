import { cn } from "@/lib/utils";

export interface ChartTooltipEntry {
  dataKey: string;
  value: number;
  color?: string;
  name?: string;
}

export interface StandardChartTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  /** Mapa de dataKey → rótulo amigável */
  labelMap?: Record<string, string>;
  /** Função para formatar o valor (ex: formatCurrency) */
  valueFormatter?: (value: number, dataKey: string) => string;
  /** dataKeys que devem ser excluídos do tooltip (ex: áreas duplicadas) */
  excludeKeys?: Set<string> | string[];
  className?: string;
}

/**
 * Tooltip padronizado para todos os gráficos Recharts do app.
 * - Remove duplicatas automaticamente via excludeKeys
 * - Aplica labels amigáveis via labelMap
 * - Formata valores via valueFormatter
 */
export function StandardChartTooltip({
  active,
  payload,
  label,
  labelMap = {},
  valueFormatter,
  excludeKeys = [],
  className,
}: StandardChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const excludeSet = excludeKeys instanceof Set ? excludeKeys : new Set(excludeKeys);

  // Filtra entradas duplicadas ou excluídas
  const filtered = payload.filter((p: any) => {
    // Exclui por dataKey
    if (excludeSet.has(p.dataKey)) return false;
    // Exclui por name (para áreas com name diferente)
    if (excludeSet.has(p.name)) return false;
    return true;
  });

  if (!filtered.length) return null;

  const formatValue = (value: number, dataKey: string) => {
    if (valueFormatter) return valueFormatter(value, dataKey);
    if (typeof value === "number") {
      return value.toLocaleString("pt-BR");
    }
    return String(value);
  };

  const getLabel = (dataKey: string, name?: string) => {
    return labelMap[dataKey] || labelMap[name || ""] || name || dataKey;
  };

  return (
    <div
      className={cn(
        "rounded-lg border bg-background/95 backdrop-blur-sm px-3 py-2 shadow-md",
        "text-xs min-w-[120px]",
        className
      )}
    >
      {label && <div className="font-medium mb-1.5 text-foreground">{label}</div>}
      <div className="space-y-1">
        {filtered.map((p: any, i: number) => (
          <div key={`${p.dataKey}-${i}`} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: p.color || p.stroke || p.fill }}
              />
              <span className="text-muted-foreground truncate max-w-[100px]">
                {getLabel(p.dataKey, p.name)}
              </span>
            </div>
            <span className="font-medium text-foreground tabular-nums">
              {formatValue(p.value, p.dataKey)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Estilos padrão para Legend formatter
export const standardLegendLabels: Record<string, string> = {
  pessimistic: "Pessimista",
  probable: "Provável",
  optimistic: "Otimista",
  transacoes: "Transações",
  valorM2: "Preço/m²",
  geral: "Preço Médio",
  apartamento: "Apartamento",
  casa: "Casa",
  variacao: "Variação",
  realizadas: "Realizadas",
  agendadas: "Agendadas",
  canceladas: "Canceladas",
};

/**
 * Função utilitária para criar um formatter de legenda padronizado
 */
export function createLegendFormatter(customLabels?: Record<string, string>) {
  const labels = { ...standardLegendLabels, ...customLabels };
  return (value: string) => labels[value] || value;
}

/**
 * Formata valor em moeda brasileira
 */
export function formatCurrencyBR(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Formata valor em moeda compacta (ex: R$ 1.5M)
 */
export function formatCurrencyCompact(value: number): string {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}k`;
  }
  return `R$ ${value.toFixed(0)}`;
}
