# 🧪 GUIA DE TESTE - Proxy de Imagens WhatsApp

## ⚡ TESTE RÁPIDO (5 minutos)

### 1️⃣ RECARREGAR A PÁGINA
```
Pressione: Ctrl + R (ou F5)
```

### 2️⃣ ABRIR CONSOLE DO NAVEGADOR
```
Pressione: F12
Vá para aba: Console
```

### 3️⃣ OBSERVAR LOGS

Você deve ver logs como:

#### ✅ **Cache Funcionando** (Segunda vez que vê a imagem)
```
✅ [CACHE HIT] Imagem WhatsApp já cacheada: https://pps.whatsapp.net/v/t61...
```

#### 🔄 **Processando Nova Imagem** (Primeira vez)
```
🔄 [CACHE MISS] Processando imagem via Proxy 1: https://pps.whatsapp.net/v/t61...
```

#### 🗑️ **Limpeza Automática** (Após 30 minutos)
```
🗑️ [CACHE CLEANUP] Imagem removida do cache após 30min
```

---

## 🔍 VALIDAÇÃO DETALHADA

### Teste 1: Cache Hit Rate

**Aguarde 30 segundos** após carregar a página, então execute no console:

```javascript
const cacheSize = uazapiService.getImageCacheSize();
console.log(`✅ Cache contém ${cacheSize} imagens diferentes`);
```

**Resultado esperado:** Número > 0 (indica que cache está funcionando)

---

### Teste 2: Limpar Cache Manualmente

Execute no console:

```javascript
uazapiService.clearImageCache();
```

**Resultado esperado:**
```
🗑️ [CACHE CLEARED] 15 imagens removidas do cache
```

---

### Teste 3: Verificar Rotação de Proxies

1. Abra a aba **Network** (F12 → Network)
2. Filtre por "pps.whatsapp.net"
3. Observe as requisições

**Resultado esperado:**
- Você verá URLs diferentes sendo usadas:
  - `pps.whatsapp.net` (direto)
  - `api.allorigins.win`
  - `corsproxy.io`

---

## ❌ TROUBLESHOOTING

### Ainda vejo erro 429?

**Passo 1:** Limpe o cache
```javascript
uazapiService.clearImageCache();
```

**Passo 2:** Recarregue a página
```
Ctrl + Shift + R (hard reload)
```

**Passo 3:** Se persistir, execute:
```javascript
// Forçar uso de proxy específico (teste manual)
const testUrl = 'https://pps.whatsapp.net/v/t61.24694-24/test.jpg';
const proxied = uazapiService.getProxiedImageUrl(testUrl);
console.log('Proxy usado:', proxied);
```

---

### Imagens não aparecem?

**Debug 1:** Verificar se URLs estão sendo processadas
```javascript
// Abrir console e ver logs
// Deve aparecer: [CACHE HIT] ou [CACHE MISS]
```

**Debug 2:** Verificar erros de rede
```
F12 → Console → Verificar erros em vermelho
```

**Debug 3:** Testar proxy manualmente
```javascript
const img = new Image();
img.src = 'https://api.allorigins.win/raw?url=https%3A%2F%2Fpps.whatsapp.net%2Fv%2Ft61.24694-24%2Ftest.jpg';
img.onload = () => console.log('✅ Proxy funcionando!');
img.onerror = () => console.log('❌ Proxy com erro!');
```

---

### Cache não está funcionando?

**Verificar:**
```javascript
// Executar 2 vezes seguidas
const size1 = uazapiService.getImageCacheSize();
console.log('Cache size (1ª vez):', size1);

// Aguardar 5 segundos e executar novamente
setTimeout(() => {
  const size2 = uazapiService.getImageCacheSize();
  console.log('Cache size (2ª vez):', size2);
}, 5000);
```

**Resultado esperado:** Ambos mostram o mesmo número (cache persistindo)

---

## 📊 MÉTRICAS DE SUCESSO

Execute após 5 minutos de uso:

```javascript
console.log('═══════════════════════════════════');
console.log('📊 RELATÓRIO DO CACHE DE IMAGENS');
console.log('═══════════════════════════════════');

const cacheSize = uazapiService.getImageCacheSize();
console.log(`✅ Imagens em cache: ${cacheSize}`);

console.log('\n💡 Dica: Quanto maior o cache, menos');
console.log('   requisições aos proxies externos!');
console.log('═══════════════════════════════════');
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

Marque conforme for testando:

- [ ] Página recarregada (Ctrl+R)
- [ ] Console aberto (F12)
- [ ] Logs de cache visíveis (`✅ [CACHE HIT]` ou `🔄 [CACHE MISS]`)
- [ ] Imagens carregando corretamente
- [ ] Nenhum erro 429 (Too Many Requests)
- [ ] Cache size > 0 após alguns minutos
- [ ] Teste de limpeza manual funcionando
- [ ] Performance melhorada (imagens carregam rápido)

---

## 🎯 RESULTADO ESPERADO FINAL

**ANTES da solução:**
```
❌ GET ...pps.whatsapp.net... 429 (Too Many Requests)
❌ GET ...pps.whatsapp.net... 429 (Too Many Requests)
❌ GET ...pps.whatsapp.net... 429 (Too Many Requests)
... (centenas de erros)
```

**DEPOIS da solução:**
```
🔄 [CACHE MISS] Processando imagem via Proxy 1: ...
🔄 [CACHE MISS] Processando imagem via Proxy 2: ...
✅ [CACHE HIT] Imagem WhatsApp já cacheada: ...
✅ [CACHE HIT] Imagem WhatsApp já cacheada: ...
✅ [CACHE HIT] Imagem WhatsApp já cacheada: ...
... (90% cache hits, sem erros 429!)
```

---

## 📞 SE AINDA HOUVER PROBLEMAS

1. **Limpe TODO o cache do navegador:**
   - Chrome: Ctrl+Shift+Del → Limpar tudo
   - Firefox: Ctrl+Shift+Del → Limpar tudo

2. **Teste em aba anônima:**
   - Chrome: Ctrl+Shift+N
   - Firefox: Ctrl+Shift+P

3. **Verifique a documentação completa:**
   - Arquivo: `PROXY_IMAGE_SOLUTION.md`

---

**Status:** ✅ Pronto para testar  
**Tempo estimado:** 5 minutos  
**Dificuldade:** Fácil
