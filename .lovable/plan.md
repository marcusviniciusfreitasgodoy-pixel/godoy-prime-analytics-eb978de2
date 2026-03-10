

## Plano: Atualizar ruas internas de 7 condomínios

### Estado Atual vs Esperado

| Condomínio | Status | Ruas Internas | Ação |
|---|---|---|---|
| **Malibu** | ✅ Correto | 7 ruas já cadastradas | Nenhuma |
| **Santa Mônica Jardins** | ⚠️ Acentuação | 6 ruas — falta acento em "Millôr" e "García Márquez" | Corrigir grafia |
| **Del Lago** | ❌ Vazio | `ruas_internas = []` | Adicionar 6 ruas |
| **Quintas do Rio** | ❌ Vazio | `ruas_internas = []` | Adicionar 6 ruas |
| **Pedra de Itaúna** | ❌ Vazio | `ruas_internas = []` | Adicionar 5 ruas |
| **Novo Leblon** | ❌ Não existe | Sem registro na base | Criar registro + 5 ruas |
| **Interlagos de Itaúna** | ❌ Não existe | Sem registro na base | Criar registro + 4 ruas |

### Detalhes das Operações

**1. Santa Mônica Jardins** (`dbc68746`) — corrigir acentos:
- "Millor" → "Millôr"
- "Garcia Marquez" → "García Márquez"

**2. Del Lago** (`d19c831d`) — adicionar ruas internas:
- Rua Rachel de Queiroz, Rua Vinicius de Moraes, Rua Cecília Meireles, Rua Clarice Lispector, Rua Jorge Amado, Rua Guimarães Rosa

**3. Quintas do Rio** (`1e10338c`) — adicionar ruas internas:
- Rua Hermano Ribeiro da Silva, Rua Paulo Santos, Rua Sérgio Buarque de Holanda, Rua Lúcio Costa, Rua Affonso Eduardo Reidy, Rua Burle Marx

**4. Pedra de Itaúna** (`d606bb18`) — adicionar ruas internas:
- Rua Pedra de Itaúna, Rua Desembargador Luiz Paulo da Silva Araújo, Rua Jornalista Henrique Cordeiro, Rua Professor Coutinho Fróis, Rua José Américo de Almeida

**5. Novo Leblon** — criar registro novo:
- Logradouro principal: a definir (provavelmente Avenida das Américas ou Estrada do Pontal)
- Microbairro: Barra Central (ou Recreio, dependendo da localização exata)
- Ruas: Rua Fala Amendoeira, Rua Guimarães Rosa, Rua Jorge Amado, Rua Clarice Lispector, Rua João Cabral de Melo Neto

**6. Interlagos de Itaúna** — criar registro novo:
- Logradouro principal: a definir
- Microbairro: a definir
- Ruas: Rua Rogério Jonas Zylbersztajn, Rua Escritor Rodrigo Melo Franco, Rua Ministro Aliomar Baleeiro, Rua Ministro Victor Nunes Leal

### Implementação

Todas as operações são apenas dados (UPDATE/INSERT via insert tool). Nenhuma alteração de código necessária.

- 3x UPDATE para ruas internas (Santa Mônica, Del Lago, Quintas do Rio, Pedra de Itaúna)
- 2x INSERT para novos condomínios (Novo Leblon, Interlagos de Itaúna) — precisarei confirmar logradouro principal e microbairro antes de criar

### Pergunta antes de executar

Para os condomínios **Novo Leblon** e **Interlagos de Itaúna** que não existem na base:
- Qual o **logradouro principal** (endereço de entrada) de cada um?
- Em qual **microbairro** se enquadram?
- Possuem **coordenadas** (latitude/longitude)?

