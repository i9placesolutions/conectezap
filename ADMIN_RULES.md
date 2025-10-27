# 👑 REGRAS DE ADMINISTRAÇÃO

## Super Admin: rafael@i9place.com.br

O usuário `rafael@i9place.com.br` possui privilégios especiais no sistema:

### ✅ Permissões Especiais

1. **Visualização de Todas as Instâncias**
   - Pode ver instâncias de TODOS os usuários
   - Não está limitado pelas suas próprias instâncias
   - Útil para suporte e administração do sistema

2. **Acesso ao Seletor de Servidor**
   - É o ÚNICO usuário que vê o componente `ServerSelector`
   - Pode alternar entre os 3 servidores UAZAPI
   - Controla qual servidor será usado para as operações

### 🚫 Restrições para Usuários Normais

1. **Isolamento de Instâncias**
   - Cada usuário vê APENAS suas próprias instâncias
   - Filtro automático por `user_id` via RLS (Row Level Security)
   - Impossível acessar dados de outros usuários

2. **Servidor Fixo**
   - Sempre usam o **Servidor 1 (Principal)**
   - Não podem trocar de servidor
   - O seletor de servidor é **oculto** para eles

## 🔧 Implementação Técnica

### Arquivos Modificados

1. **`src/components/ServerSelector.tsx`**
   ```typescript
   const ADMIN_EMAIL = 'rafael@i9place.com.br';
   
   // Retorna null (oculta o componente) se não for o admin
   if (user?.email !== ADMIN_EMAIL) {
     return null;
   }
   ```

2. **`src/contexts/ServerContext.tsx`**
   ```typescript
   const ADMIN_EMAIL = 'rafael@i9place.com.br';
   
   // Bloqueia troca de servidor para não-admins
   const setSelectedServer = (server: Server) => {
     if (user?.email !== ADMIN_EMAIL) {
       console.warn('⚠️ Usuário não autorizado a trocar de servidor');
       return;
     }
     // ... lógica de troca
   };
   ```

3. **`src/contexts/InstanceContext.tsx`**
   ```typescript
   const ADMIN_EMAIL = 'rafael@i9place.com.br';
   
   // Admin vê TODAS as instâncias
   if (user.email === ADMIN_EMAIL) {
     const { data } = await supabase
       .from('instances')
       .select('*')
       .eq('is_active', true);
   } else {
     // Usuários normais: apenas suas instâncias
     supabaseInstances = await syncInstancesStatus(user.id);
   }
   ```

## 🔒 Segurança Multi-Camadas

### Camada 1: Banco de Dados (RLS)
- Políticas Supabase filtram automaticamente por `user_id`
- Usuários normais não podem burlar via SQL

### Camada 2: Aplicação (Context)
- `InstanceContext` implementa lógica especial para admin
- Validação de email antes de carregar dados

### Camada 3: UI (Componentes)
- `ServerSelector` oculto para não-admins
- Interface simplificada para usuários normais

### Camada 4: Runtime (Validação)
- Hook `useInstanceSecurity` valida propriedade
- Bloqueio de ações não autorizadas

## 🧪 Testes Recomendados

### Teste 1: Isolamento de Instâncias
1. Login com usuário normal A
2. Criar instância X
3. Logout
4. Login com usuário normal B
5. ✅ Verificar que instância X não aparece

### Teste 2: Visibilidade Admin
1. Login como `rafael@i9place.com.br`
2. ✅ Verificar que vê TODAS as instâncias
3. ✅ Verificar que vê o seletor de servidor

### Teste 3: Bloqueio de Servidor
1. Login com usuário normal
2. ✅ Verificar que seletor de servidor não aparece
3. Abrir console do navegador
4. Tentar trocar servidor via API
5. ✅ Verificar que ação é bloqueada

## 📋 Checklist de Segurança

- ✅ RLS configurado em todas as tabelas
- ✅ Filtro de instâncias por user_id
- ✅ Admin pode ver todas as instâncias
- ✅ Seletor de servidor oculto para não-admins
- ✅ Troca de servidor bloqueada para não-admins
- ✅ Servidor 1 (Principal) como padrão
- ✅ Validação de ownership em runtime
- ✅ Logs de tentativas de acesso não autorizado

## 🚀 Deploy

Ao fazer deploy:

1. Verificar que `ADMIN_EMAIL` está correto em todos os arquivos
2. Confirmar que RLS está ativo no Supabase
3. Testar com usuário admin e usuário normal
4. Monitorar logs de acesso

---

**Última atualização:** 27/10/2025
**Status:** ✅ Implementado e Testado
