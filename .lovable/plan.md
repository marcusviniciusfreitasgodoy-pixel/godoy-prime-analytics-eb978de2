
# Plano: Adicionar card de Gestao de Leads nos features da Apresentacao

## O que sera feito

Adicionar um novo card na secao "Modulos" da pagina `/apresentacao` destacando o CRM integrado de Gestao de Leads.

## Alteracao em `src/pages/Apresentacao.tsx`

O array `features` ja contem um item "Gestao de Leads" (linha 30). Sera atualizada apenas a descricao para destacar melhor o CRM integrado com captura automatica e notificacoes:

**Atual:**
```
{ icon: Building2, title: "Gestão de Leads", desc: "Captação automática de leads via avaliação pública com acompanhamento de conversão." }
```

**Novo:**
```
{ icon: Building2, title: "Gestão de Leads & CRM", desc: "CRM integrado com captação automática de leads, notificações por email e WhatsApp, filtros avançados e acompanhamento de conversão com exportação CSV." }
```

Apenas uma linha sera editada. Nenhum outro arquivo precisa ser alterado.
