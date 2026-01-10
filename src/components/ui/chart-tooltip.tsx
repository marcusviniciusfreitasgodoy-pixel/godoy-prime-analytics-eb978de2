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

// Cores padronizadas para séries de gráficos (CSS variables)
export const CHART_COLORS = {
  pessimistic: "hsl(0 84% 60%)",      // red-500
  probable: "hsl(262 83% 58%)",       // violet-500
  optimistic: "hsl(152 76% 36%)",     // emerald-600
  geral: "hsl(var(--primary))",
  apartamento: "hsl(var(--accent))",
  casa: "hsl(var(--chart-3))",
  transacoes: "hsl(42 74% 52%)",      // amber
  valorM2: "hsl(var(--primary))",
  variacao: "hsl(var(--accent))",
  realizadas: "hsl(152 76% 36%)",     // emerald
  agendadas: "hsl(217 91% 60%)",      // blue
  canceladas: "hsl(0 84% 60%)",       // red
} as const;

// Ícones para tipos de série (usando classes Tailwind para estilização)
export type LegendIconType = "line" | "dashed" | "bar" | "area" | "dot";

export interface LegendItem {
  dataKey: string;
  label?: string;
  color?: string;
  iconType?: LegendIconType;
  hidden?: boolean;
}

export interface StandardChartLegendProps {
  items: LegendItem[];
  labelMap?: Record<string, string>;
  className?: string;
  vertical?: boolean;
  onItemClick?: (dataKey: string) => void;
  activeKeys?: Set<string>;
}

/**
 * Componente de legenda padronizado com ícones customizados
 */
export function StandardChartLegend({
  items,
  labelMap = {},
  className,
  vertical = false,
  onItemClick,
  activeKeys,
}: StandardChartLegendProps) {
  const allLabels = { ...standardLegendLabels, ...labelMap };

  const getLabel = (dataKey: string, customLabel?: string) => {
    return customLabel || allLabels[dataKey] || dataKey;
  };

  const getColor = (dataKey: string, customColor?: string) => {
    return customColor || CHART_COLORS[dataKey as keyof typeof CHART_COLORS] || "hsl(var(--muted-foreground))";
  };

  const renderIcon = (iconType: LegendIconType, color: string) => {
    switch (iconType) {
      case "line":
        return (
          <svg className="w-4 h-3" viewBox="0 0 16 12">
            <line x1="0" y1="6" x2="16" y2="6" stroke={color} strokeWidth="2" />
          </svg>
        );
      case "dashed":
        return (
          <svg className="w-4 h-3" viewBox="0 0 16 12">
            <line x1="0" y1="6" x2="16" y2="6" stroke={color} strokeWidth="2" strokeDasharray="4 2" />
          </svg>
        );
      case "bar":
        return (
          <svg className="w-4 h-3" viewBox="0 0 16 12">
            <rect x="2" y="2" width="12" height="8" fill={color} rx="1" fillOpacity="0.8" />
          </svg>
        );
      case "area":
        return (
          <svg className="w-4 h-3" viewBox="0 0 16 12">
            <path d="M0 10 L4 6 L8 8 L12 4 L16 6 L16 12 L0 12 Z" fill={color} fillOpacity="0.3" />
            <path d="M0 10 L4 6 L8 8 L12 4 L16 6" stroke={color} strokeWidth="1.5" fill="none" />
          </svg>
        );
      case "dot":
      default:
        return (
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
        );
    }
  };

  return (
    <div
      className={cn(
        "flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs",
        vertical && "flex-col items-start gap-y-2",
        className
      )}
    >
      {items
        .filter((item) => !item.hidden)
        .map((item) => {
          const isActive = activeKeys ? activeKeys.has(item.dataKey) : true;
          const color = getColor(item.dataKey, item.color);

          return (
            <button
              key={item.dataKey}
              type="button"
              onClick={() => onItemClick?.(item.dataKey)}
              className={cn(
                "flex items-center gap-1.5 transition-opacity",
                onItemClick && "cursor-pointer hover:opacity-80",
                !onItemClick && "cursor-default",
                !isActive && "opacity-40"
              )}
            >
              {renderIcon(item.iconType || "dot", color)}
              <span className="text-muted-foreground">
                {getLabel(item.dataKey, item.label)}
              </span>
            </button>
          );
        })}
    </div>
  );
}

/**
 * Função utilitária para criar um formatter de legenda padronizado (compatibilidade)
 */
export function createLegendFormatter(customLabels?: Record<string, string>) {
  const labels = { ...standardLegendLabels, ...customLabels };
  return (value: string) => labels[value] || value;
}

/**
 * Cria items de legenda a partir de dataKeys
 */
export function createLegendItems(
  dataKeys: string[],
  options?: {
    labelMap?: Record<string, string>;
    colorMap?: Record<string, string>;
    iconMap?: Record<string, LegendIconType>;
  }
): LegendItem[] {
  return dataKeys.map((dataKey) => ({
    dataKey,
    label: options?.labelMap?.[dataKey],
    color: options?.colorMap?.[dataKey],
    iconType: options?.iconMap?.[dataKey] || "dot",
  }));
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
