

# Plano: Melhorar Apresentacao - Responsividade, Branding e Formulario de Contato

## Resumo

Reescrever a pagina `/apresentacao` com melhorias visuais, responsividade mobile, branding alinhado ao manual da marca (logo symbol no hero, cores Navy #0C2340 e Gold #D4AF37), botoes com contraste adequado, WhatsApp correto (21964075124), e formulario de contato/agendamento com envio por email para marcus@godoyprime.com.br com copia para o cliente.

---

## Alteracoes

### 1. `src/pages/Apresentacao.tsx` (reescrever)

**Hero Section:**
- Trocar logo: usar `godoy-logo-symbol.png` (simbolo GR) em vez de `godoy-logo-pdf.png` (logo completo com texto pequeno que fica ilegivel)
- Manter `godoy-logo-pdf.png` no footer
- Botoes com contraste forte: "Explorar Demonstracao" em bg Gold (#D4AF37) com texto Navy, "WhatsApp" em bg branco com texto Navy
- WhatsApp URL corrigido: `https://wa.me/5521964075124?text=...`

**Responsividade Mobile:**
- Hero: padding reduzido, fonte h1 menor (text-2xl em mobile), botoes full-width em mobile (w-full sm:w-auto)
- Cards de features: grid 1 col mobile, 2 tablet, 3 desktop
- Secao diferenciais: grid 1 col mobile, 3 desktop
- Formulario: layout responsivo com campos em 1 col mobile, 2 colunas tablet+

**Formulario de Contato/Agendamento (nova secao antes do CTA final):**
- Campos: Nome, Email, Telefone, Interesse (select: Compra/Venda/Ambos), Mensagem (textarea)
- Ao submeter: chama edge function `send-lead-notification` com type "initial" (ja existente e funcional)
- Tambem envia email de confirmacao ao cliente usando `send-pdf-email` function adaptada ou diretamente via nova logica simples no `send-lead-notification`
- Alternativa mais simples: criar chamada ao `send-lead-notification` que ja envia para marcus@godoyprime.com.br, e adicionar um segundo envio de confirmacao ao cliente

**Contraste dos botoes:**
- Hero: botao primario com bg-[#D4AF37] text-[#0C2340] font-bold, botao WhatsApp com bg-white text-[#0C2340]
- CTA final: mesmo padrao
- Todos os botoes com min-h-12 para toque facil em mobile

### 2. Edge Function `send-lead-notification/index.ts`

**Adicionar envio de copia ao cliente:**
- Apos enviar email para contato@godoyprime.com.br, enviar segundo email para o leadEmail com template de confirmacao ("Recebemos seu contato, em breve retornaremos")
- Usar mesmo Resend client ja configurado

---

## Arquivos a Editar

| Arquivo | Acao |
|---|---|
| `src/pages/Apresentacao.tsx` | Reescrever com responsividade, logo symbol, formulario, WhatsApp correto, botoes com contraste |
| `supabase/functions/send-lead-notification/index.ts` | Adicionar envio de email de confirmacao ao cliente (copia) |

## Detalhes Tecnicos

### Formulario - Validacao
- Usar zod para validar nome (min 2, max 100), email, telefone (min 10), interesse (enum), mensagem (max 500)
- Estados: idle, sending, success, error com feedback visual

### Email de Confirmacao ao Cliente
No `send-lead-notification`, apos o envio principal, adicionar:
```
await resend.emails.send({
  from: "Godoy Prime <marcus@godoyprime.com.br>",
  to: [data.leadEmail],
  subject: "Recebemos seu contato - Godoy Prime Realty",
  html: templateConfirmacao
});
```

### Responsividade
- Botoes: `w-full sm:w-auto` + `min-h-[48px]` para touch targets
- Formulario: `grid grid-cols-1 sm:grid-cols-2 gap-4`
- Hero texto: `text-2xl sm:text-3xl lg:text-5xl`
- Padding geral: `px-4 sm:px-6`

