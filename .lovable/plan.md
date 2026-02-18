

## Diagnostico de Seguranca - Itens Nivel "error"

### Issue encontrada

**Segredos expostos em arquivo de migracao** (`vault_secrets_hardcoded`)

O arquivo `supabase/migrations/20251205033247_...sql` contem hardcoded:
- URL do projeto fonte: `https://wlnwspjobfdjftyffqne.supabase.co`
- Chave `service_role` do projeto fonte (JWT completo)

Esses valores estao no historico do Git e podem ser acessados por qualquer pessoa com acesso ao repositorio.

---

### Por que nao pode ser corrigido automaticamente

Arquivos de migracao sao **imutaveis** -- nao podem ser editados ou deletados apos execucao. A chave ja esta no historico do Git.

---

### Plano de acao

#### 1. Acao manual obrigatoria (pelo dono do projeto)

O dono do projeto **fonte** (`wlnwspjobfdjftyffqne`) precisa:

1. Acessar o Dashboard Supabase do projeto fonte
2. Ir em **Settings > API** e rotacionar (regenerar) a `service_role` key
3. Atualizar o segredo `SUPABASE_SOURCE_SERVICE_KEY` no Lovable Cloud com a nova chave

Isso invalida a chave exposta, neutralizando o risco.

#### 2. Atualizar o finding de seguranca

Apos a rotacao, marcaremos o finding como resolvido no scanner. Se a rotacao nao for possivel agora, atualizaremos o finding com instrucoes detalhadas.

---

### Detalhes tecnicos

- **Arquivo afetado:** `supabase/migrations/20251205033247_31ebc268-0147-493a-bc8c-7558618b5df3.sql`
- **Linha 40:** JWT `service_role` hardcoded (projeto `wlnwspjobfdjftyffqne`)
- **Risco:** Qualquer pessoa com acesso ao repo pode usar essa chave para acessar dados do projeto fonte com privilegios elevados
- **Mitigacao atual:** A chave esta armazenada no Vault (criptografada em repouso), mas o risco vem do historico Git

### Resumo

| Item | Status |
|------|--------|
| Segredos hardcoded na migracao | Requer acao manual (rotacao de chave) |
| Itens nivel "warn" | Ignorados conforme solicitado |
| Total de erros encontrados | 1 |

