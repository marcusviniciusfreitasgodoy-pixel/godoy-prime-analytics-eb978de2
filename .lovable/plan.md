

## Plano: Remover vias públicas do campo `ruas_internas`

### Problema
Três vias públicas estão cadastradas indevidamente como ruas internas de condomínios:
- **AVENIDA DAS AMERICAS** (ou variantes AVN DAS AMERICAS)
- **AVN AFONSO ARINOS DE MELO FRANCO** (ou variantes)
- **AVN GENERAL FELICISSIMO CARDOSO** (ou variantes)

### Operações

1. **Identificar** todos os condomínios afetados via query diagnóstica (unnest + filtro por nome da rua)
2. **Atualizar** cada registro removendo apenas a via pública do array, preservando as demais ruas internas — usando `array_remove()` em 3 UPDATEs sequenciais

### SQL planejado

```sql
-- Remover AVENIDA DAS AMERICAS e variantes
UPDATE condominios_mapeamento
SET ruas_internas = array_remove(ruas_internas, rua_publica)
FROM unnest(ARRAY['AVN DAS AMERICAS', 'AVENIDA DAS AMERICAS', 'AVN AMERICAS']) AS rua_publica
WHERE ativo = true AND rua_publica = ANY(ruas_internas);

-- Remover AFONSO ARINOS DE MELO FRANCO
UPDATE condominios_mapeamento
SET ruas_internas = array_remove(ruas_internas, rua_publica)
FROM unnest(ARRAY['AVN AFONSO ARINOS DE MELO FRANCO', 'AVENIDA AFONSO ARINOS DE MELO FRANCO']) AS rua_publica
WHERE ativo = true AND rua_publica = ANY(ruas_internas);

-- Remover GENERAL FELICISSIMO CARDOSO
UPDATE condominios_mapeamento
SET ruas_internas = array_remove(ruas_internas, rua_publica)
FROM unnest(ARRAY['AVN GENERAL FELICISSIMO CARDOSO', 'AVENIDA GENERAL FELICISSIMO CARDOSO']) AS rua_publica
WHERE ativo = true AND rua_publica = ANY(ruas_internas);
```

### Segurança
- Apenas o campo `ruas_internas` será modificado — nenhum registro será deletado
- Apenas registros ativos (`ativo = true`) serão afetados
- Nenhuma alteração de código necessária

### Etapa de verificação
Após a limpeza, uma query de conferência listará os condomínios afetados para confirmar que as vias foram removidas corretamente.

