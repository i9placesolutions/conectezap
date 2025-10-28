# 🛠️ COMANDOS ÚTEIS - Proxy de Imagens WhatsApp

Cole estes comandos no **Console do navegador** (F12 → Console)

---

## 📊 MONITORAMENTO

### Ver tamanho do cache
```javascript
console.log('Cache: ' + uazapiService.getImageCacheSize() + ' imagens');
```

### Ver cache em tempo real (atualiza a cada 5 segundos)
```javascript
setInterval(() => {
  const size = uazapiService.getImageCacheSize();
  console.log(`⏱️ [${new Date().toLocaleTimeString()}] Cache: ${size} imagens`);
}, 5000);
```

### Monitorar taxa de crescimento do cache
```javascript
let lastSize = 0;
setInterval(() => {
  const currentSize = uazapiService.getImageCacheSize();
  const diff = currentSize - lastSize;
  console.log(`📈 Cache cresceu: +${diff} imagens (Total: ${currentSize})`);
  lastSize = currentSize;
}, 10000); // A cada 10 segundos
```

---

## 🗑️ LIMPEZA

### Limpar cache manualmente
```javascript
uazapiService.clearImageCache();
```

### Limpar cache e recarregar página
```javascript
uazapiService.clearImageCache();
location.reload();
```

### Limpar cache a cada X minutos (automático)
```javascript
setInterval(() => {
  uazapiService.clearImageCache();
  console.log('🔄 Cache limpo automaticamente!');
}, 15 * 60 * 1000); // A cada 15 minutos
```

---

## 🧪 TESTES

### Testar URL específica
```javascript
const testUrl = 'https://pps.whatsapp.net/v/t61.24694-24/test.jpg';
const proxied = uazapiService.getProxiedImageUrl(testUrl);
console.log('URL original:', testUrl);
console.log('URL com proxy:', proxied);
```

### Testar múltiplas URLs (ver distribuição de proxies)
```javascript
const urls = [
  'https://pps.whatsapp.net/v/t61.24694-24/test1.jpg',
  'https://pps.whatsapp.net/v/t61.24694-24/test2.jpg',
  'https://pps.whatsapp.net/v/t61.24694-24/test3.jpg',
  'https://pps.whatsapp.net/v/t61.24694-24/test4.jpg',
  'https://pps.whatsapp.net/v/t61.24694-24/test5.jpg',
];

urls.forEach((url, i) => {
  const proxied = uazapiService.getProxiedImageUrl(url);
  const proxyUsed = proxied.includes('allorigins') ? 'AllOrigins' 
                  : proxied.includes('corsproxy') ? 'CorsProxy'
                  : 'Direto';
  console.log(`URL ${i+1}: ${proxyUsed}`);
});
```

### Carregar imagem de teste no console
```javascript
const testUrl = 'https://pps.whatsapp.net/v/t61.24694-24/test.jpg';
const proxied = uazapiService.getProxiedImageUrl(testUrl);

const img = new Image();
img.src = proxied;
img.onload = () => {
  console.log('✅ Imagem carregou com sucesso!');
  console.log('Dimensões:', img.width + 'x' + img.height);
  document.body.appendChild(img); // Exibe na página
};
img.onerror = (e) => {
  console.error('❌ Erro ao carregar imagem:', e);
};
```

---

## 📈 ESTATÍSTICAS

### Relatório completo
```javascript
console.clear();
console.log('╔═══════════════════════════════════════════╗');
console.log('║   RELATÓRIO DO SISTEMA DE CACHE           ║');
console.log('╚═══════════════════════════════════════════╝');
console.log('');
console.log('📊 Imagens em cache:', uazapiService.getImageCacheSize());
console.log('⏱️  Tempo de vida:', '30 minutos');
console.log('🔄 Proxies ativos:', '3 (Direto, AllOrigins, CorsProxy)');
console.log('💾 Tipo de cache:', 'Memória (Map)');
console.log('');
console.log('💡 Dica: Cache maior = menos requisições!');
console.log('═══════════════════════════════════════════');
```

### Ver todas as URLs em cache (avançado)
```javascript
// CUIDADO: Pode ser muita informação!
console.warn('⚠️ Este comando pode exibir MUITAS URLs!');
console.log('URLs em cache:', imageUrlCache.size);
// Descomentar para ver todas:
// imageUrlCache.forEach((proxied, original) => {
//   console.log(original.substring(0, 50) + '... -> Proxy usado');
// });
```

---

## 🚨 DEBUG AVANÇADO

### Capturar erros de imagem na página
```javascript
window.addEventListener('error', (e) => {
  if (e.target.tagName === 'IMG') {
    console.error('❌ Erro ao carregar imagem:', e.target.src);
  }
}, true);
```

### Monitorar todas requisições de imagem
```javascript
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = args[0];
  if (url.includes('whatsapp.net')) {
    console.log('🌐 Requisição WhatsApp:', url.substring(0, 60) + '...');
  }
  return originalFetch.apply(this, args);
};
```

### Ver performance do cache
```javascript
const startTime = Date.now();
const startSize = uazapiService.getImageCacheSize();

setTimeout(() => {
  const endTime = Date.now();
  const endSize = uazapiService.getImageCacheSize();
  const elapsed = (endTime - startTime) / 1000;
  const growth = endSize - startSize;
  
  console.log('⏱️ Performance em ' + elapsed + 's:');
  console.log('   Imagens adicionadas:', growth);
  console.log('   Taxa:', (growth / elapsed).toFixed(2) + ' img/s');
}, 30000); // Após 30 segundos
```

---

## 🔧 CONFIGURAÇÃO

### Aumentar tempo de cache para 2 horas (requer editar código)
```javascript
// APENAS INFORMATIVO - Não execute!
// Editar em: src/services/uazapiService.ts
// Linha: setTimeout(..., 30 * 60 * 1000)
// Mudar para: setTimeout(..., 2 * 60 * 60 * 1000)
```

### Forçar uso de proxy específico (teste)
```javascript
// TESTE: Forçar AllOrigins
const url = 'https://pps.whatsapp.net/v/t61.24694-24/test.jpg';
const forced = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
console.log('Proxy forçado:', forced);
```

---

## 🎯 ATALHOS RÁPIDOS

### Comando 1: Ver status rápido
```javascript
console.log('Cache:', uazapiService.getImageCacheSize(), '| Limpar: uazapiService.clearImageCache()');
```

### Comando 2: Limpar e recarregar
```javascript
uazapiService.clearImageCache(); location.reload();
```

### Comando 3: Monitor completo (executar e deixar rodando)
```javascript
console.clear();
console.log('🔍 Monitor ativo! (atualiza a cada 10s)');
setInterval(() => {
  const size = uazapiService.getImageCacheSize();
  const time = new Date().toLocaleTimeString();
  console.log(`[${time}] Cache: ${size} imagens`);
}, 10000);
```

---

## 💾 SALVAR RELATÓRIO

### Exportar estatísticas (copiar para arquivo)
```javascript
const report = {
  timestamp: new Date().toISOString(),
  cacheSize: uazapiService.getImageCacheSize(),
  userAgent: navigator.userAgent,
  url: window.location.href
};
console.log('📋 Copie este JSON:');
console.log(JSON.stringify(report, null, 2));
```

---

## 🆘 EMERGÊNCIA

### Se nada funcionar:
```javascript
// 1. Limpar tudo
uazapiService.clearImageCache();
sessionStorage.clear();
localStorage.clear();

// 2. Recarregar com cache limpo
location.reload(true);

// 3. Se ainda não resolver, limpar cache do navegador:
// Chrome: Ctrl+Shift+Del
// Firefox: Ctrl+Shift+Del
```

---

**Dica:** Salve esta página como favorito para acesso rápido aos comandos!
