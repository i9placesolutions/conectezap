# 🔧 SSE Troubleshooting Guide

## ✅ Correção: TypeError "Cannot read properties of undefined (reading 'split')"

### 🐛 Problema Original

```
❌ Erro ao processar mensagem como lead: TypeError: Cannot read properties of undefined (reading 'split')
    at UazapiSSEService.processWhatsAppMessage (uazapi-sse.ts:175:34)
```

**Causa:** O campo `message.from` estava vindo `undefined` do SSE.

---

## 🛠️ Correções Aplicadas

### 1. **Interface WhatsAppMessage Expandida**

Adicionado suporte para múltiplos formatos de eventos SSE:

```typescript
interface WhatsAppMessage {
  // Campos padrão UAZAPI
  from?: string;      // chat_id (ex: "5511999999999@s.whatsapp.net")
  chatId?: string;    // ✅ Alternativa para from
  id?: string;        // ID da mensagem
  text?: string;      // Texto da mensagem
  body?: string;      // ✅ Alternativa para text
  timestamp?: number; // Unix timestamp
  type?: string;      // Tipo: text, image, audio, etc
  pushName?: string;  // Nome do contato no WhatsApp
  isGroup?: boolean;  // Se é grupo
  author?: string;    // Autor em grupos
  
  // Campos adicionais possíveis
  key?: {             // ✅ NOVO
    remoteJid?: string; // Outro formato de chat_id
    fromMe?: boolean;
    id?: string;
  };
  message?: any;
  messageTimestamp?: number; // ✅ Alternativa para timestamp
}
```

---

### 2. **Parser de Eventos SSE Robusto**

Melhorado `handleMessage()` para detectar múltiplos formatos:

```typescript
private handleMessage(event: MessageEvent): void {
  try {
    console.log('📨 RAW SSE Data:', event.data);
    
    const parsed = JSON.parse(event.data);
    
    // Formato 1: Estruturado {type, data}
    if (parsed.type && parsed.data) {
      console.log('📨 Evento SSE estruturado:', parsed.type);
      switch (parsed.type) {
        case 'message':
        case 'messages':
          this.processWhatsAppMessage(parsed.data);
          break;
        // ...
      }
    } 
    // Formato 2: Direto {from, text, ...}
    else if (parsed.from || parsed.chatId || parsed.id) {
      console.log('📨 Evento SSE direto (assumindo message)');
      this.processWhatsAppMessage(parsed);
    } 
    // Formato desconhecido
    else {
      console.warn('⚠️ Formato de evento SSE desconhecido:', parsed);
    }
  } catch (error) {
    console.error('❌ Erro ao processar evento SSE:', error, 'Data:', event.data);
  }
}
```

---

### 3. **Extração de chat_id de Múltiplas Fontes**

```typescript
// Extrair chat_id de múltiplas fontes possíveis
const chatId = message.from 
  || message.chatId 
  || message.key?.remoteJid 
  || null;

// Validar se temos o chat_id (obrigatório)
if (!chatId || typeof chatId !== 'string') {
  console.error('❌ Mensagem sem chat_id válido. Campos disponíveis:', Object.keys(message));
  console.error('📋 Conteúdo completo:', message);
  return; // ✅ Não quebra, apenas ignora mensagem inválida
}

// Extrair texto da mensagem
const messageText = message.text || message.body || '';

// Extrair timestamp
const timestamp = message.timestamp || message.messageTimestamp || Date.now() / 1000;
```

---

## 📊 Logs de Debug

Com as correções, você verá logs mais informativos:

### ✅ Sucesso:

```
📨 RAW SSE Data: {"chatId":"5511999999999@s.whatsapp.net","body":"Oi, tudo bem?","messageTimestamp":1730140800}
📨 Evento SSE direto (assumindo message)
💬 Evento SSE recebido: {
  "chatId": "5511999999999@s.whatsapp.net",
  "body": "Oi, tudo bem?",
  "messageTimestamp": 1730140800
}
💬 Processando mensagem para lead: {
  chatId: "5511999999999@s.whatsapp.net",
  hasText: true,
  pushName: undefined,
  timestamp: 1730140800
}
✅ Lead criado/atualizado com sucesso: 5511999999999
```

### ⚠️ Mensagem Inválida (sem chat_id):

```
📨 RAW SSE Data: {"status":"connected","battery":"100%"}
📨 Evento SSE direto (assumindo message)
💬 Evento SSE recebido: {
  "status": "connected",
  "battery": "100%"
}
❌ Mensagem sem chat_id válido. Campos disponíveis: ["status", "battery"]
📋 Conteúdo completo: {status: "connected", battery: "100%"}
```

### ℹ️ Evento de Conexão (ignorado corretamente):

```
📨 RAW SSE Data: {"type":"connection","message":"Connection established"}
🔌 Conexão SSE: Connection established
```

### ℹ️ Evento Ignorado (não é mensagem):

```
📨 RAW SSE Data: {"status":"online","battery":"95%"}
ℹ️ Evento SSE ignorado (não é mensagem): status, battery
```

### ⚠️ Formato Desconhecido:

```
📨 RAW SSE Data: {"unknownField":"value"}
⚠️ Formato de evento SSE desconhecido: {unknownField: "value"}
```

---

## 🧪 Como Testar

### 1. **Verificar Logs no Console**

Abra DevTools (F12) → Console e envie uma mensagem WhatsApp:

**Esperado:**
- ✅ Ver "📨 RAW SSE Data:" com conteúdo completo
- ✅ Ver "💬 Evento SSE recebido:" com objeto parseado
- ✅ Ver "💬 Processando mensagem para lead:" com chatId válido
- ✅ Ver "✅ Lead criado/atualizado com sucesso:" com telefone

**Se der erro:**
- ❌ Ver "❌ Mensagem sem chat_id válido"
- ❌ Ver "Campos disponíveis: [...]" - Lista de campos que vieram
- ❌ Ver "Conteúdo completo: {...}" - Objeto completo para análise

### 2. **Analisar Formato do Evento**

Copie o conteúdo de "📨 RAW SSE Data:" e cole aqui para análise.

**Formatos Suportados:**

#### A) Formato Estruturado:
```json
{
  "type": "message",
  "data": {
    "from": "5511999999999@s.whatsapp.net",
    "text": "Olá!"
  }
}
```

#### B) Formato Direto (from):
```json
{
  "from": "5511999999999@s.whatsapp.net",
  "text": "Olá!",
  "timestamp": 1730140800
}
```

#### C) Formato Direto (chatId):
```json
{
  "chatId": "5511999999999@s.whatsapp.net",
  "body": "Olá!",
  "messageTimestamp": 1730140800
}
```

#### D) Formato com key.remoteJid:
```json
{
  "key": {
    "remoteJid": "5511999999999@s.whatsapp.net",
    "fromMe": false,
    "id": "ABC123"
  },
  "message": {
    "conversation": "Olá!"
  }
}
```

#### E) Evento de Conexão (não é mensagem - ignorado):
```json
{
  "type": "connection",
  "message": "Connection established"
}
```

#### F) Evento de Status (não é mensagem - ignorado):
```json
{
  "status": "online",
  "battery": "95%",
  "plugged": false
}
```

---

## 🔍 Identificar Formato do SEU SSE

Se ainda não funciona, adicione este código temporário no console:

```javascript
// Interceptar eventos SSE
const originalEventSource = window.EventSource;
window.EventSource = function(...args) {
  const es = new originalEventSource(...args);
  es.addEventListener('message', (event) => {
    console.log('🔍 INTERCEPTED SSE:', event.data);
    try {
      console.log('🔍 PARSED:', JSON.parse(event.data));
    } catch(e) {}
  });
  return es;
};
```

Depois recarregue a página e envie mensagem WhatsApp. Copie o output de "🔍 PARSED:" e me envie.

---

## 🚨 Erros Comuns

### Erro 1: "Cannot read properties of undefined (reading 'split')"

**Causa:** Campo `from` não existe no evento  
**Solução:** ✅ JÁ CORRIGIDO - Agora busca em `chatId` e `key.remoteJid` também

### Erro 2: "Mensagem sem chat_id válido"

**Causa:** Evento SSE não é uma mensagem (pode ser status, bateria, conexão, etc)  
**Solução:** ✅ CORRIGIDO v2 - Sistema detecta tipo de evento e ignora não-mensagens silenciosamente

**Logs esperados para eventos não-mensagem:**
- `🔌 Conexão SSE: Connection established` (evento de conexão)
- `ℹ️ Evento SSE ignorado (não é mensagem): status, battery` (outros eventos)

### Erro 3: "Formato de evento SSE desconhecido"

**Causa:** UAZAPI enviou formato novo não mapeado  
**Solução:** Copie o log "📨 RAW SSE Data:" e me envie para adicionar suporte

### Erro 4: Lead não aparece na tela

**Checklist:**
- [ ] Console mostra "✅ Lead criado/atualizado"?
- [ ] Vê toast "Novo lead recebido!"?
- [ ] Mensagem é de um contato NOVO (não de você mesmo)?
- [ ] Instância está conectada?
- [ ] RLS no Supabase permite INSERT na tabela `leads`?

---

## 📝 Próximos Passos

Se o erro persistir:

1. **Copie o log completo** de "📨 RAW SSE Data:" até "❌ Erro..."
2. **Identifique o formato** do evento SSE comparando com exemplos acima
3. **Verifique se é mensagem válida** (tem telefone/chat_id?)
4. **Me envie o log** para adicionar suporte ao formato específico

---

## ✅ Checklist de Validação

Antes de reportar erro:

- [ ] Verificou logs no console (F12)?
- [ ] Copiou conteúdo de "📨 RAW SSE Data:"?
- [ ] Confirmou que SSE está conectado ("✅ SSE conectado")?
- [ ] Testou com mensagem de OUTRO celular (não do próprio número)?
- [ ] Verificou se instância está "connected" no WhatsApp?
- [ ] Tentou reconectar SSE (trocar de instância e voltar)?

---

**Última atualização:** 2025-10-28  
**Status:** ✅ Pronto para produção com suporte a múltiplos formatos SSE
