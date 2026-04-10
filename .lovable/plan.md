

# Horários Quebrados no Agendamento de Visitas

## Objetivo
Substituir a lista de horários cheios (08:00, 09:00...) por horários com intervalos de 15 minutos (08:00, 08:15, 08:30, 08:45, 09:00...) tanto no agendamento quanto na gestão de disponibilidade.

## Arquivos alterados

### 1. `src/components/visitas/AvailabilityManager.tsx`
- Expandir `DEFAULT_HORARIOS` para incluir intervalos de 15 minutos:
  `"08:00", "08:15", "08:30", "08:45", "09:00", ... "18:00", "18:15", "18:30", "18:45"`
- Ajustar o grid de botões de `grid-cols-3` para `grid-cols-4` para acomodar mais opções
- Agrupar visualmente os horários por hora (separadores ou labels de hora)

### 2. `src/components/visitas/ScheduleForm.tsx`
- Alterar os horários padrão (fallback quando não há disponibilidade cadastrada) de cheios para intervalos de 15 minutos nas 3 ocorrências (linhas ~116, ~134, ~184, ~206)
- O select de horário já funciona com qualquer string "HH:mm", então não precisa de mudança estrutural

### 3. `src/hooks/useDisponibilidade.ts`
- Nenhuma alteração necessária — já armazena `horarios_disponiveis: string[]` livre

## Detalhes técnicos
- Gerar horários com: `Array.from({length: 45}, (_, i) => { const h = Math.floor(i/4)+8; const m = (i%4)*15; return \`\${h.toString().padStart(2,'0')}:\${m.toString().padStart(2,'0')}\` })`
- O parsing em `onSubmit` já usa `split(":")` para horas e minutos, então suporta `:15`, `:30`, `:45` sem mudanças

