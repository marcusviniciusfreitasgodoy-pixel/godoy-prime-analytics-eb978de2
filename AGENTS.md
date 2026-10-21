
- Amostras de ITBI acima de 1.000 linhas são lidas em páginas via `supabase/functions/_shared/fetchPaged.ts` (ordenação por id): a base SMF passa de 5.000 linhas por bairro em 60 meses.
- Calibration queries and the two CSVs feed the outlier generator; generate candidates outside the runtime module and apply only after acceptance, because failed market-coverage checks must not change live filters.
