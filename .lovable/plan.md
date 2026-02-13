

## Carregar Campos Padrao nos Formularios

### Problema
As tabelas `form_config_sections` e `form_config_fields` estao vazias. O seed data da migracao anterior nao foi persistido. Por isso, a pagina "Configurar Formularios" mostra "0 secoes" em todas as abas.

### Solucao
Criar uma nova migracao SQL que insere os campos padrao (seed) para os 3 tipos de formulario, mapeando os campos que ja existem nos formularios hardcoded. Os campos do sistema serao marcados com `is_locked = true` para nao poderem ser excluidos.

### Campos que serao inseridos

**Ficha de Visita** (baseado em `NovaFichaVisita.tsx`):
- Secao "Identificacao do Cliente": nome_visitante, cpf_visitante, rg_visitante, telefone_visitante, email_visitante, endereco_visitante
- Secao "Identificacao do Imovel": endereco_imovel, condominio_edificio, unidade_imovel, codigo_imovel, nome_proprietario, valor_imovel
- Secao "Intermediacao": corretor_id (select), data_visita (date), notas (textarea)

**Feedback Cliente** (baseado em `FeedbackForm.tsx`):
- Secao "Avaliacao Geral": avaliacao_geral (rating), conexao_imovel (rating), atende_necessidades (checkbox)
- Secao "Efeito UAU": efeito_uau (checkbox), efeito_uau_detalhe (textarea)
- Secao "Pontos de Atencao": o_que_mais_gostou (textarea), o_que_menos_gostou (textarea), ponto_resistencia (textarea), sugestoes_melhoria (textarea)
- Secao "Interesse e Proposta": nivel_interesse (radio), percepcao_valor (radio), gostaria_fazer_proposta (checkbox)

**Feedback Corretor** (campos tipicos de avaliacao profissional):
- Secao "Qualificacao do Lead": qualificacao_lead (select), poder_decisao (select), prazo_compra (select)
- Secao "Percepcao de Interesse": interesse_real (rating), orcamento_adequado (select), forma_pagamento (select)
- Secao "Observacoes": observacoes (textarea), proximos_passos (textarea)

### Secao Tecnica

Uma unica migracao SQL com INSERTs nas tabelas `form_config_sections` e `form_config_fields`, todos com `is_locked = true` e `is_active = true`. Nenhuma alteracao de codigo e necessaria -- a pagina `ConfigurarFormularios.tsx` ja renderiza os dados dessas tabelas corretamente.
