import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

const ADMIN_EMAIL = 'rafael@i9place.com.br';

/**
 * Hook de segurança para validar se uma instância pertence ao usuário atual.
 * Previne acesso não autorizado a instâncias de outros usuários.
 * 
 * REGRA CRÍTICA DE SEGURANÇA:
 * - Toda chamada à API UAZAPI DEVE validar ownership do token
 * - Usuários só podem acessar suas próprias instâncias
 * - Super admins (rafael@i9place.com.br) podem acessar todas as instâncias
 */
export function useInstanceSecurity() {
  const { user } = useAuth();
  const [userInstances, setUserInstances] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    loadUserInstances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadUserInstances = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Verificar se é o admin especial por email (prioridade máxima)
      if (user.email === ADMIN_EMAIL) {
        console.log('👑 SUPER ADMIN detectado por email - ACESSO TOTAL LIBERADO');
        setIsSuperAdmin(true);
        setLoading(false);
        return;
      }

      // Verificar se é super admin pela tabela
      const { data: superAdminData } = await supabase
        .from('super_admins')
        .select('email')
        .eq('email', user.email)
        .maybeSingle();

      const isAdmin = !!superAdminData;
      setIsSuperAdmin(isAdmin);

      // Se é super admin, não precisa validar ownership
      if (isAdmin) {
        console.log('� SUPER ADMIN detectado por tabela - ACESSO TOTAL LIBERADO');
        setLoading(false);
        return;
      }

      console.log('👤 Usuário normal - carregando apenas instâncias próprias');

      // Buscar instâncias do usuário no Supabase
      const { data: instances, error } = await supabase
        .from('instances')
        .select('id, token')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) {
        console.error('❌ Erro ao carregar instâncias do usuário:', error);
        toast.error('Erro ao validar permissões de instâncias');
        setLoading(false);
        return;
      }

      // Criar Set com IDs e tokens para validação rápida
      const instanceIds = new Set<string>();
      const instanceTokens = new Set<string>();

      instances?.forEach(instance => {
        if (instance.id) instanceIds.add(instance.id);
        if (instance.token) instanceTokens.add(instance.token);
      });

      // Armazenar tanto IDs quanto tokens para validação
      const allIdentifiers = new Set([...instanceIds, ...instanceTokens]);
      setUserInstances(allIdentifiers);

      console.log(`🔐 Carregadas ${instances?.length || 0} instâncias do usuário`);
      setLoading(false);
    } catch (error) {
      console.error('❌ Erro ao carregar instâncias:', error);
      setLoading(false);
    }
  };

  /**
   * Valida se um token ou ID de instância pertence ao usuário atual.
   * 
   * @param tokenOrId - Token ou ID da instância a ser validado
   * @returns true se o usuário tem permissão, false caso contrário
   */
  const validateInstanceOwnership = async (tokenOrId: string): Promise<boolean> => {
    if (!user) {
      console.warn('⚠️ Usuário não autenticado');
      return false;
    }

    // REGRA CRÍTICA: Super admins têm acesso TOTAL a TODAS as instâncias
    if (isSuperAdmin) {
      console.log('✅ SUPER ADMIN - Acesso PERMITIDO a todas as instâncias');
      return true;
    }

    // Validação em memória (mais rápida) para usuários normais
    if (userInstances.has(tokenOrId)) {
      console.log('✅ Instância pertence ao usuário (cache)');
      return true;
    }

    // Validação no banco (fallback) para usuários normais
    try {
      const { data, error } = await supabase
        .from('instances')
        .select('id')
        .eq('user_id', user.id)
        .or(`id.eq.${tokenOrId},token.eq.${tokenOrId}`)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('❌ Erro ao validar ownership:', error);
        return false;
      }

      if (data) {
        // Atualizar cache
        setUserInstances(prev => new Set([...prev, tokenOrId]));
        console.log('✅ Instância pertence ao usuário (DB)');
        return true;
      }

      console.warn('⚠️ Instância não pertence ao usuário:', tokenOrId.substring(0, 10) + '...');
      return false;
    } catch (error) {
      console.error('❌ Erro ao validar ownership:', error);
      return false;
    }
  };

  /**
   * Valida ownership e bloqueia se não autorizado.
   * Lança erro se o usuário não tiver permissão.
   */
  const requireInstanceOwnership = async (tokenOrId: string): Promise<void> => {
    const isValid = await validateInstanceOwnership(tokenOrId);
    
    if (!isValid) {
      const error = new Error('🚫 ACESSO NEGADO: Você não tem permissão para acessar esta instância');
      toast.error('Acesso negado: instância não autorizada');
      throw error;
    }
  };

  /**
   * Recarrega a lista de instâncias do usuário.
   * Útil após criar/deletar instâncias.
   */
  const refreshUserInstances = () => {
    loadUserInstances();
  };

  return {
    validateInstanceOwnership,
    requireInstanceOwnership,
    refreshUserInstances,
    userInstances,
    loading,
    isSuperAdmin
  };
}
