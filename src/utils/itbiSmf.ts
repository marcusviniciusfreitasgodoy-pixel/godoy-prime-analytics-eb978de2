// Reexporta a leitura das planilhas de ITBI da SMF, compartilhada com a edge
// function ingest-itbi-smf. Ver supabase/functions/_shared/itbiSmf.ts.
// Importar sob demanda (import()) : o módulo traz a tabela de nomes de rua (~150 KB).
export * from "../../supabase/functions/_shared/itbiSmf.ts";
