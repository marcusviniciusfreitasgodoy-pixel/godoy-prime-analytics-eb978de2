

## Adequacao da Ficha de Visita ao Modelo Alto Padrao com Clausula de Protecao de 180 Dias

### Resumo das mudancas

A ficha de visita atual sera reformulada para atender ao modelo profissional fornecido, incluindo novos campos no banco de dados, formulario atualizado e PDF completamente reescrito. A clausula juridica de intermediacao sera atualizada para 180 dias com linguagem equilibrada e juridicamente adequada.

---

### O que muda para voce

**Novos campos no formulario de criacao de ficha:**
- RG do visitante (opcional)
- Endereco do visitante (opcional)
- Acompanhantes (nome e CPF opcional, ate 2 pessoas)
- Condominio/Edificio do imovel
- Unidade (apto/casa/bloco/andar)
- Autorizacao LGPD para receber ofertas similares (SIM/NAO)

**Campos preenchidos automaticamente:**
- Dados da imobiliaria (nome, CNPJ, endereco, telefone, site) vindos das configuracoes da empresa
- CRECI e contato profissional do corretor selecionado, vindos do cadastro de perfis

**PDF totalmente reescrito com 7 secoes do modelo:**
1. Cabecalho com dados da intermediacao
2. Identificacao do Cliente (com acompanhantes)
3. Identificacao do Imovel (referencia minima)
4. Declaracao de Visita e Ciencia
5. Ciencia de Intermediacao e Janela de Protecao (180 dias)
6. LGPD (com opt-in para ofertas similares)
7. Assinaturas (cliente + corretor com CRECI)

**Pagina de detalhes da ficha:** exibira os novos campos (acompanhantes, condominio, unidade, opt-in LGPD)

---

### Secao Tecnica

**1. Migracoes no banco de dados**

Adicionar colunas a tabela `fichas_visita`:

```sql
ALTER TABLE public.fichas_visita
  ADD COLUMN rg_visitante TEXT,
  ADD COLUMN endereco_visitante TEXT,
  ADD COLUMN acompanhantes JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN condominio_edificio TEXT,
  ADD COLUMN unidade_imovel TEXT,
  ADD COLUMN aceita_ofertas_similares BOOLEAN DEFAULT false;
```

Estrutura do JSONB `acompanhantes`:
```json
[
  { "nome": "Fulano da Silva", "cpf": "000.000.000-00" },
  { "nome": "Ciclana Souza", "cpf": "" }
]
```

**2. Arquivos modificados**

| Arquivo | Mudanca |
|---|---|
| `src/types/visitas.ts` | Adicionar campos `rg_visitante`, `endereco_visitante`, `acompanhantes`, `condominio_edificio`, `unidade_imovel`, `aceita_ofertas_similares` nos tipos `FichaVisita` e `FichaVisitaInsert` |
| `src/pages/NovaFichaVisita.tsx` | Adicionar campos no formulario: RG, endereco, acompanhantes (dinamicos), condominio, unidade, checkbox LGPD; buscar CRECI do corretor selecionado |
| `src/pages/FichaVisitaPage.tsx` | Exibir novos campos na visualizacao e edicao; mostrar acompanhantes, condominio, unidade, status LGPD |
| `src/utils/fichaVisitaPdfExport.ts` | Reescrever completamente para seguir o template de 7 secoes; usar dados de `company_settings` para intermediacao; incluir clausula de 180 dias; incluir LGPD |
| `src/hooks/useVisitas.ts` | Garantir que novos campos sejam persistidos no insert/update |

**3. Clausula juridica no PDF (Secao 5)**

Texto exato que sera impresso:

> CIENCIA DE INTERMEDIACAO E JANELA DE PROTECAO: O(a) Cliente declara ciencia e reconhece que tomou conhecimento do imovel identificado neste termo por meio da intermediacao da Imobiliaria/Corretor(a) acima indicado(a), razao pela qual, caso venha a iniciar, retomar ou concluir tratativas relativas a este mesmo imovel, direta ou indiretamente, pelo prazo de 180 (cento e oitenta) dias contados da data desta visita, compromete-se a comunicar previamente a Imobiliaria/Corretor(a) para fins de registro e adequada conducao da negociacao, permanecendo a remuneracao de corretagem sujeita a disciplina dos instrumentos de intermediacao aplicaveis e/ou ajuste especifico entre as partes, nao constituindo este termo, por si so, reserva, proposta, promessa de compra e venda ou titulo de cobranca.

**4. Secoes do PDF reescrito**

1. **Cabecalho**: Logo + "FICHA DE VISITA / TERMO DE APRESENTACAO DE IMOVEL - BARRA DA TIJUCA/RJ" + numero registro + data/hora + cidade/UF
2. **Intermediacao**: Nome da imobiliaria, CNPJ, corretor, CRECI, contato (todos de `company_settings` e `profiles`)
3. **Secao 1 - Identificacao do Cliente**: Nome, CPF, RG, telefone, email, endereco, acompanhantes
4. **Secao 2 - Identificacao do Imovel**: Endereco resumido, condominio, unidade, codigo interno
5. **Secao 3 - Declaracao de Visita e Ciencia**: Texto padrao confirmando a visita
6. **Secao 4 - Nao Vinculacao**: Texto informando que o documento nao constitui proposta/reserva/contrato
7. **Secao 5 - Ciencia de Intermediacao e Janela de Protecao**: Clausula de 180 dias conforme fornecida
8. **Secao 6 - LGPD**: Texto de tratamento de dados + checkbox SIM/NAO para ofertas similares
9. **Secao 7 - Assinaturas**: Local/data, assinatura do cliente, assinatura do corretor com CRECI

**5. Pre-preenchimento do PDF**

Dados dinamicos injetados no PDF:

| Campo PDF | Origem |
|---|---|
| Imobiliaria / CNPJ | `company_settings` (company_name, company_cnpj) |
| Corretor / CRECI / Contato | `profiles` via `get_corretores_list` (full_name, creci, phone, email) |
| Nome / CPF / RG / Tel / Email / Endereco do cliente | `fichas_visita` |
| Acompanhantes | `fichas_visita.acompanhantes` (JSONB) |
| Endereco / Condominio / Unidade / Codigo do imovel | `fichas_visita` |
| Opt-in LGPD | `fichas_visita.aceita_ofertas_similares` |
| Assinaturas | `fichas_visita.assinatura_visitante / assinatura_corretor` |

**6. Sequencia de implementacao**

1. Migracao do banco (adicionar colunas)
2. Atualizar tipos TypeScript
3. Atualizar formulario de criacao (`NovaFichaVisita.tsx`)
4. Atualizar pagina de detalhes (`FichaVisitaPage.tsx`)
5. Reescrever PDF (`fichaVisitaPdfExport.ts`)
6. Atualizar hook `useVisitas.ts` para novos campos

