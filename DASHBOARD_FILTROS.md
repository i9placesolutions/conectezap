# 📊 Sistema de Filtros da Dashboard - ConectaZap

## 🎯 Objetivo

Implementar visualização contextual de dados na Dashboard principal, diferenciando permissões entre usuários normais e Super Admin, com suporte a seleção de servidor.

---

## 🔐 Níveis de Acesso

### 1️⃣ Usuário Normal

**Visualização:**
- ✅ Vê **APENAS** suas próprias instâncias
- ✅ Estatísticas filtradas pelo próprio usuário
- ✅ Badge verde: **"Meus Dados"**
- ❌ Não tem acesso ao seletor de servidor

**Dados exibidos:**
- Total de mensagens **do usuário**
- Instâncias conectadas **do usuário**
- Taxa de falha **das próprias instâncias**

---

### 2️⃣ Super Admin (rafael@i9place.com.br)

**Visualização:**
- ✅ Vê **TODAS** as instâncias de **TODOS** os servidores
- ✅ Pode filtrar por servidor específico usando o **Seletor de Servidor**
- ✅ Badge roxo: **"👑 Modo Super Admin"**
- ✅ Mostra o servidor atualmente selecionado

**Dados exibidos:**
- **Servidor 1 (Principal)**: Agregação de **TODOS os servidores**
- **Servidor 2**: Apenas instâncias do **Servidor 2**
- **Servidor 3**: Apenas instâncias do **Servidor 3**

---

## 🖥️ Seletor de Servidor (Super Admin Only)

### Comportamento:

| Servidor | Instâncias Exibidas | Estatísticas |
|----------|---------------------|--------------|
| **Servidor 1** | TODAS (agregadas) | Soma de todos os servidores |
| **Servidor 2** | Apenas do Servidor 2 | Apenas do Servidor 2 |
| **Servidor 3** | Apenas do Servidor 3 | Apenas do Servidor 3 |

### Como funciona:

1. **Super Admin seleciona servidor** no dropdown (canto superior direito)
2. **Dashboard detecta mudança** via `useServer()` hook
3. **Recarrega dados** automaticamente (`useEffect` com dependência)
4. **Filtra instâncias** baseado no servidor selecionado
5. **Atualiza estatísticas** em tempo real

---

## 🎨 Interface Visual

### Badge de Contexto (Topo da Dashboard)

#### Usuário Normal:
```
┌─────────────────────────────────────────────────┐
│ 📊 Meus Dados                                    │
│ Visualizando apenas suas instâncias e           │
│ estatísticas                                     │
└─────────────────────────────────────────────────┘
Verde: #10B981 → #14B8A6
```

#### Super Admin:
```
┌─────────────────────────────────────────────────┐
│ 👑 Modo Super Admin                              │
│ Visualizando dados de: Servidor 1 (Principal)   │
│                                     i9place1.uazapi.com │
└─────────────────────────────────────────────────┘
Roxo/Azul: #9333EA → #2563EB
```

---

## 📂 Arquivos Modificados

### `src/pages/HomePage.tsx`
- ✅ Import de `useServer()` hook
- ✅ Constante `ADMIN_EMAIL` definida
- ✅ Lógica `isSuperAdmin` implementada
- ✅ Função `loadStats()` refatorada com filtros
- ✅ Badge de contexto visual adicionado

**Principais mudanças:**

```typescript
// Importações adicionadas
import { useServer } from '../contexts/ServerContext';
const ADMIN_EMAIL = 'rafael@i9place.com.br';

// Detectar Super Admin
const isSuperAdmin = user?.email === ADMIN_EMAIL;
const { selectedServer, servers } = useServer();

// Lógica de filtragem
if (isSuperAdmin) {
  // Buscar de TODOS os servidores
  // Filtrar por servidor selecionado (se não for Servidor 1)
} else {
  // Buscar apenas instâncias do usuário
}
```

---

## 🔍 Logs de Debug

Ao abrir o console do navegador (F12), você verá:

```
📊 [DASHBOARD] Carregando estatísticas...
👤 Usuário: usuario@exemplo.com
👑 É Super Admin? false
🖥️ Servidor selecionado: Servidor 1 (Principal) | https://i9place1.uazapi.com

🔐 [USUÁRIO NORMAL] Buscando apenas instâncias próprias...
📊 Instâncias do usuário: 3

✅ [DASHBOARD] Estatísticas carregadas: {
  totalMessages: 150,
  deliveredMessages: 135,
  failedMessages: 6,
  connectedInstances: 2,
  totalInstances: 3
}
```

Para Super Admin:

```
📊 [DASHBOARD] Carregando estatísticas...
👤 Usuário: rafael@i9place.com.br
👑 É Super Admin? true
🖥️ Servidor selecionado: Servidor 2 | https://i9place2.uazapi.com

👑 [SUPER ADMIN] Buscando instâncias de todos os servidores...
🔍 Buscando instâncias do servidor: Servidor 1 (Principal)
✅ 5 instâncias encontradas em Servidor 1 (Principal)
🔍 Buscando instâncias do servidor: Servidor 2
✅ 8 instâncias encontradas em Servidor 2
🔍 Buscando instâncias do servidor: Servidor 3
✅ 3 instâncias encontradas em Servidor 3

📊 [SUPER ADMIN] Total de instâncias agregadas: 16

🔍 Filtrando pelo servidor: Servidor 2
📊 Após filtro: 8 instâncias

✅ [DASHBOARD] Estatísticas carregadas: { ... }
```

---

## 🧪 Como Testar

### Teste 1: Usuário Normal
1. Faça login com usuário **não-admin**
2. Acesse a Dashboard
3. ✅ Deve ver badge verde: **"Meus Dados"**
4. ✅ Estatísticas mostram **apenas suas instâncias**
5. ✅ Seletor de servidor **não aparece** no layout

### Teste 2: Super Admin - Visão Agregada
1. Faça login como `rafael@i9place.com.br`
2. Acesse a Dashboard
3. ✅ Deve ver badge roxo: **"👑 Modo Super Admin"**
4. ✅ Deve mostrar **"Servidor 1 (Principal)"**
5. ✅ Estatísticas agregam **TODOS os servidores**

### Teste 3: Super Admin - Filtro por Servidor
1. Como Super Admin, clique no **Seletor de Servidor** (canto superior direito)
2. Selecione **"Servidor 2"**
3. ✅ Badge atualiza para **"Visualizando dados de: Servidor 2"**
4. ✅ Estatísticas mostram **apenas do Servidor 2**
5. Selecione **"Servidor 3"**
6. ✅ Estatísticas atualizam para **apenas Servidor 3**

### Teste 4: Console Debug
1. Abra DevTools (F12)
2. Recarregue a página (Ctrl+R)
3. ✅ Logs detalhados aparecem no console
4. ✅ Mostra processo de agregação de dados
5. ✅ Indica filtros aplicados

---

## 🚀 Próximos Passos (Futuro)

- [ ] Cache de estatísticas agregadas (reduzir chamadas API)
- [ ] Gráfico comparativo entre servidores (Super Admin)
- [ ] Exportar relatórios em PDF/Excel
- [ ] Filtro por período de tempo (última hora, hoje, semana, mês)
- [ ] Notificações em tempo real de mudanças de status

---

## 📝 Notas Técnicas

### Performance:
- Requisições aos servidores são feitas **em paralelo** (`Promise.all`)
- Cache de 5 segundos para evitar requisições duplicadas
- Dados estimados usados como fallback em caso de erro

### Segurança:
- Email do Super Admin hardcoded por segurança
- Validação ocorre no frontend E backend
- Tokens de servidor nunca expostos ao usuário normal

### Compatibilidade:
- ✅ React 18+
- ✅ TypeScript 5+
- ✅ Todos os navegadores modernos

---

**Desenvolvido por:** Rafael Mendes  
**Data:** 28/10/2025  
**Versão:** 1.0.0
