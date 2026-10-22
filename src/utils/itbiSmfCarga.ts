// Reexporta as etapas da carga do ITBI SMF, compartilhadas com a carga agendada.
// Ver supabase/functions/_shared/itbiSmfCarga.ts. Importar sob demanda (import()),
// como itbiSmf: o módulo puxa a tabela de nomes de rua (~150 KB).
export * from "../../supabase/functions/_shared/itbiSmfCarga.ts";
