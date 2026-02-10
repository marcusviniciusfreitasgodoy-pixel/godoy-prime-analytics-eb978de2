

## Modulo de Proposta de Compra com Assinatura Digital e Upload de CNH

### Visao Geral

Criar um sistema completo de proposta de compra que:
1. Aparece automaticamente no formulario de feedback quando o cliente marca "Gostaria de fazer uma proposta? Sim"
2. Oferece dois modelos de proposta para escolha
3. Tambem esta disponivel de forma avulsa (rota publica) para o corretor encaminhar a qualquer cliente
4. Inclui assinatura digital (reutilizando o componente `PublicSignatureCanvas` ja existente)
5. Inclui upload de CNH (foto do documento) usando o storage ja configurado
6. Pre-preenche automaticamente campos ja disponiveis na ficha de visita

---

### Mudancas para o usuario

**No formulario de feedback:**
- Quando o cliente marca "Gostaria de fazer uma proposta? Sim", aparece imediatamente um card com dois modelos de proposta para escolha
- **Modelo 1 - Proposta Simplificada**: Campos essenciais (valor, sinal, forma de pagamento)
- **Modelo 2 - Proposta Completa**: Todos os campos do template fornecido (incluindo parcelas, financiamento, permuta, validade, clausula de documento posterior)
- Campos ja preenchidos na ficha de visita sao pre-populados automaticamente (nome, CPF, telefone, email, endereco do imovel, valor ofertado)
- Area de assinatura digital obrigatoria
- Upload de CNH obrigatorio (foto frente e verso)

**Rota avulsa para corretores:**
- Nova rota publica `/proposta/:codigo` acessivel por link
- O corretor pode gerar um link e enviar ao cliente
- O cliente preenche, assina e envia a CNH diretamente

**No dashboard do corretor:**
- As propostas recebidas aparecem vinculadas a ficha de visita
- Status da proposta visivel no card da ficha

---

### Secao Tecnica

**1. Nova tabela no banco de dados: `propostas_compra`**

```sql
CREATE TABLE public.propostas_compra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_visita_id UUID REFERENCES fichas_visita(id),
  codigo TEXT NOT NULL UNIQUE,
  modelo TEXT NOT NULL CHECK (modelo IN ('simplificado', 'completo')),
  
  -- Identificacao da proposta
  numero_proposta TEXT,
  data_hora TIMESTAMPTZ DEFAULT now(),
  cidade_uf TEXT,
  
  -- Proponente
  nome_completo TEXT NOT NULL,
  cpf_cnpj TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT,
  
  -- Imovel
  endereco_resumido TEXT NOT NULL,
  unidade TEXT,
  matricula TEXT,
  
  -- Valor e pagamento
  valor_ofertado NUMERIC,
  moeda TEXT DEFAULT 'BRL',
  sinal_entrada TEXT,
  parcelas TEXT,
  financiamento TEXT,
  outras_condicoes TEXT,
  
  -- Validade
  validade_proposta TIMESTAMPTZ,
  forma_aceite TEXT DEFAULT 'assinatura',
  
  -- Assinatura e documentos
  assinatura_proponente TEXT,
  cnh_url TEXT,
  
  -- Aceite vendedor
  aceite_vendedor_nome TEXT,
  aceite_vendedor_cpf TEXT,
  aceite_vendedor_assinatura TEXT,
  aceite_vendedor_data TIMESTAMPTZ,
  
  -- Meta
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aceita', 'recusada', 'expirada')),
  organization_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

Politicas RLS:
- INSERT publico (para clientes sem autenticacao poderem enviar)
- SELECT para usuarios autenticados da mesma organizacao
- UPDATE para usuarios autenticados da mesma organizacao

**2. Storage bucket para CNH**

Criar bucket `documentos-proposta` (privado) para armazenar as fotos de CNH.

**3. Novos arquivos**

| Arquivo | Descricao |
|---|---|
| `src/components/visitas/ProposalForm.tsx` | Formulario principal da proposta com os dois modelos |
| `src/components/visitas/ProposalModelSelector.tsx` | Seletor visual dos dois modelos de proposta |
| `src/components/visitas/CNHUpload.tsx` | Componente de upload de foto da CNH |
| `src/pages/PropostaPublica.tsx` | Pagina publica para proposta avulsa (rota `/proposta/:codigo`) |
| `src/hooks/usePropostas.ts` | Hook para CRUD de propostas |
| `src/types/proposta.ts` | Tipos TypeScript para o modulo |

**4. Arquivos modificados**

| Arquivo | Mudanca |
|---|---|
| `src/components/visitas/FeedbackForm.tsx` | Adicionar card condicional de proposta quando `gostaria_fazer_proposta === true` |
| `src/pages/FeedbackVisita.tsx` | Passar dados da ficha para o FeedbackForm (para pre-preenchimento) |
| `src/App.tsx` | Adicionar rota publica `/proposta/:codigo` |
| `src/pages/Visitas.tsx` | Adicionar indicador de propostas recebidas nos cards |

**5. Fluxo de pre-preenchimento**

Dados copiados automaticamente da ficha de visita para a proposta:

| Campo da proposta | Origem |
|---|---|
| nome_completo | `ficha.nome_visitante` |
| cpf_cnpj | `ficha.cpf_visitante` |
| telefone | `ficha.telefone_visitante` |
| email | `ficha.email_visitante` |
| endereco_resumido | `ficha.endereco_imovel` |
| valor_ofertado | `feedback.valor_ofertaria` (do campo "valor que ofertaria") |

**6. Dois modelos de proposta**

- **Simplificado**: Nome, CPF, telefone, endereco do imovel, valor ofertado, sinal/entrada, forma de pagamento, validade, assinatura, CNH
- **Completo**: Todos os campos do template fornecido (numero proposta, cidade/UF, unidade, matricula, parcelas detalhadas, financiamento, permuta, forma de aceite do vendedor, clausula de documento posterior)

**7. Componente CNHUpload**

- Aceita imagens (JPG, PNG) e PDF
- Limite de 5MB por arquivo
- Upload para bucket `documentos-proposta` via Supabase Storage
- Salva apenas a URL no banco de dados (nao armazena o arquivo no banco)

**8. Link avulso para corretor**

- O corretor pode copiar um link no formato `/proposta/VIS-XXXXX` e enviar por WhatsApp/email
- A pagina publica busca os dados da ficha pelo codigo e pre-preenche o que for possivel
- Se nao houver dados disponiveis, o cliente preenche manualmente todos os campos

