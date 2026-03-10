

## Plano: Corrigir ruas internas do Malibu e criar Americas Park / Mundo Novo

### Operações de dados (via insert tool)

1. **Atualizar Malibu** — remover AVN MALIBU, PRC TELE SANTANA e PRC ANTONIO CALLADO do array `ruas_internas`, mantendo apenas RUA MARGARIDA VALLADAO e RUA DARIO COELHO.

2. **Criar "Americas Park"** — novo registro em `condominios_mapeamento` com:
   - `logradouro_padrao`: mesmo do Malibu (Rua Engenheiro Mario Fernandes Guedes) ou a ser definido
   - `microbairro`: Barra Central
   - `ruas_internas`: ['AVN MALIBU', 'PRC TELE SANTANA', 'PRC ANTONIO CALLADO']
   - `ativo`: true
   - Coordenadas próximas ao Malibu (~-23.001, -43.392)

3. **Criar "Mundo Novo"** — novo registro sem ruas internas por enquanto, mesma região.

### Nenhuma mudança de código

O frontend já lê `condominios_mapeamento` com `ativo = true`. Nenhum componente precisa ser alterado.

