# Sistema de Gestão de Leads - Documentação

## Visão Geral

O sistema de Gestão de Leads permite gerenciar contatos do WhatsApp de forma profissional e organizada, com campos 100% personalizáveis conforme a necessidade de cada negócio.

## Características Principais

### ✅ Seleção Inteligente de Instância
- **Modal automático** quando há múltiplas instâncias conectadas
- Seleção automática quando há apenas uma instância
- Botão "Trocar Instância" para alternar entre instâncias facilmente
- Badge visual mostrando a instância ativa

### ✅ Campos Personalizáveis
- **20 campos customizáveis** (lead_field01 a lead_field20)
- Cada campo pode armazenar até **255 caracteres**
- Configuração dinâmica através da interface
- Nomes dos campos salvos localmente e na API

### ✅ Campos Padrão do Sistema
- `lead_name` - Nome do lead
- `lead_fullName` - Nome completo
- `lead_email` - Email
- `lead_personalId` - CPF/CNPJ
- `lead_status` - Status do lead (novo, qualificado, negociação, ganho, perdido)
- `lead_notes` - Observações sobre o lead
- `lead_tags` - Tags/etiquetas (array)
- `lead_isTicketOpen` - Ticket aberto (boolean)
- `lead_assignedAttendant_id` - ID do atendente responsável
- `lead_kanbanOrder` - Ordem no kanban

### ✅ Visualizações Disponíveis
1. **Grade** - Cards organizados em grid responsivo
2. **Lista** - Visualização em lista vertical
3. **Kanban** - Organização por status (funil de vendas)

### ✅ Filtros e Busca
- Busca por nome, email, telefone
- Filtro por status
- Estatísticas em tempo real por status

## Como Usar

### 0. Selecionar Instância (quando houver múltiplas)

Ao acessar a página de Leads:

- **Se você tem apenas 1 instância**: Ela será selecionada automaticamente
- **Se você tem múltiplas instâncias**: Um modal aparecerá para você escolher qual usar
- **Para trocar de instância**: Clique no botão "Trocar Instância" no topo da página

A instância selecionada fica visível em um badge azul ao lado do título da página.

### 1. Configurar Campos Personalizados

1. Acesse **WhatsApp > Gestão de Leads**
2. Clique no botão **"Configurar Campos"**
3. Defina o nome de cada campo personalizado que deseja usar
   - Exemplos: "Empresa", "Cargo", "Setor", "Origem", "Produto Interesse", etc.
4. Clique em **"Salvar Configuração"**

A configuração é salva:
- **Localmente** no navegador (localStorage)
- **Na API** através do endpoint `/instance/updateFieldsMap`

### 2. Editar um Lead

1. Na lista de leads, clique em qualquer lead
2. No modal que abrir, você pode editar:
   - **Informações básicas**: Nome, email, CPF/CNPJ
   - **Status e Tags**: Alterar o status do funil e adicionar tags
   - **Observações**: Anotações sobre o lead
   - **Campos personalizados**: Todos os campos configurados no passo 1

3. Clique em **"Salvar Lead"**

As alterações são enviadas para a API através do endpoint `/chat/editLead`.

### 3. Visualizar e Organizar

- Use os **filtros** no topo da página para encontrar leads específicos
- Troque entre os **modos de visualização** (Grade, Lista, Kanban)
- No modo **Kanban**, arraste leads entre as colunas de status
- Visualize **estatísticas** em tempo real

## Integração com API

### Endpoint: Atualizar Campos Personalizados
```bash
POST https://i9place1.uazapi.com/instance/updateFieldsMap
Headers:
  - token: {seu-token-de-instancia}
  - Content-Type: application/json

Body:
{
  "lead_field01": "Empresa",
  "lead_field02": "Cargo",
  "lead_field03": "Setor",
  ...
  "lead_field20": "Campo 20"
}
```

### Endpoint: Editar Lead
```bash
POST https://i9place1.uazapi.com/chat/editLead
Headers:
  - token: {seu-token-de-instancia}
  - Content-Type: application/json

Body:
{
  "id": "5511999999999@s.whatsapp.net",
  "lead_name": "João Silva",
  "lead_email": "joao@exemplo.com",
  "lead_status": "qualificado",
  "lead_tags": ["vip", "suporte"],
  "lead_field01": "Tech Corp",
  "lead_field02": "Gerente",
  ...
}
```

### Endpoint: Buscar Leads
```bash
POST https://i9place1.uazapi.com/chat/find
Headers:
  - token: {seu-token-de-instancia}
  - Content-Type: application/json

Body:
{
  "operator": "AND",
  "sort": "-wa_lastMsgTimestamp",
  "limit": 50,
  "offset": 0,
  "lead_status": "qualificado",
  "wa_isGroup": false
}
```

## Exemplos de Uso

### Exemplo 1: Configurar para E-commerce
```json
{
  "lead_field01": "Produto de Interesse",
  "lead_field02": "Valor do Pedido",
  "lead_field03": "Forma de Pagamento Preferida",
  "lead_field04": "Data da Última Compra",
  "lead_field05": "Categoria Favorita"
}
```

### Exemplo 2: Configurar para Imobiliária
```json
{
  "lead_field01": "Tipo de Imóvel Procurado",
  "lead_field02": "Faixa de Preço",
  "lead_field03": "Bairro Preferido",
  "lead_field04": "Número de Quartos",
  "lead_field05": "Data Desejada para Mudança"
}
```

### Exemplo 3: Configurar para Serviços B2B
```json
{
  "lead_field01": "Empresa",
  "lead_field02": "Cargo",
  "lead_field03": "Setor da Empresa",
  "lead_field04": "Número de Funcionários",
  "lead_field05": "Origem do Lead",
  "lead_field06": "Serviço de Interesse",
  "lead_field07": "Orçamento Mensal",
  "lead_field08": "Prazo para Decisão"
}
```

## Status Padrão do Funil

O sistema vem com 5 status pré-configurados:

1. **Novo** - Lead acabou de entrar no funil
2. **Qualificado** - Lead foi validado e tem potencial
3. **Negociação** - Em processo de negociação/proposta
4. **Ganho** - Venda fechada com sucesso
5. **Perdido** - Negócio não fechou

Você pode visualizar todos os leads organizados por esses status no modo Kanban.

## Dicas de Uso

### 📌 Organização
- Use **tags** para categorizar leads rapidamente
- Mantenha o campo **status** sempre atualizado
- Use **observações** para registrar interações importantes

### 📌 Performance
- O sistema carrega até 100 leads por vez
- Use os **filtros** para trabalhar com subconjuntos específicos
- A busca é feita em tempo real (nome, email, telefone)

### 📌 Personalização
- Configure apenas os campos que você realmente vai usar
- Nomes descritivos facilitam o preenchimento pela equipe
- Revise e atualize a configuração conforme sua operação evolui

### 📌 Integração
- Todos os dados são sincronizados com a API em tempo real
- Mudanças no lead disparam eventos webhook/SSE
- Campos personalizados podem ser usados em automações de chatbot

## Arquivos do Sistema

- **LeadsPage.tsx** - Página principal com listagem e filtros
- **LeadFieldsConfigModal.tsx** - Modal de configuração de campos
- **LeadDetailsModal.tsx** - Modal de edição de leads
- **lib/wapi/api.ts** - Funções de integração com API:
  - `updateLeadFieldsMap()` - Atualiza configuração de campos
  - `editLead()` - Edita informações do lead
  - `findLeads()` - Busca leads com filtros

## Suporte e Melhorias

Para adicionar novos recursos ou reportar problemas, entre em contato com a equipe de desenvolvimento.

---

**Desenvolvido com ❤️ para ConecteZap**
