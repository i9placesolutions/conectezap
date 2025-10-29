import { createClient } from '@supabase/supabase-js';

// Verificação explícita de configuração do Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Falha rápida com mensagem clara para evitar requisições sem apikey
  console.error('Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env');
  throw new Error('Variáveis de ambiente do Supabase não configuradas');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    // Evitar cache que pode causar ERR_CACHE_RACE
    fetch: async (url, init) => {
      const nextInit: RequestInit = {
        ...init,
        cache: 'no-store',
        headers: new Headers(init?.headers || {})
      };
      const headers = nextInit.headers as Headers;
      // Garantir que o header apikey esteja presente em todas as requisições
      if (!headers.has('apikey')) headers.set('apikey', supabaseAnonKey);
      
      try {
        const response = await fetch(url, nextInit);
        
        // Capturar erros de refresh token
        const urlString = typeof url === 'string' ? url : url.toString();
        if (!response.ok && urlString.includes('/auth/v1/token')) {
          // IMPORTANTE: Clonar a response antes de ler o body
          // para evitar "body stream already read"
          const clonedResponse = response.clone();
          
          try {
            const errorText = await clonedResponse.text();
            if (errorText.includes('Invalid Refresh Token') || errorText.includes('Refresh Token Not Found')) {
              console.warn('🔄 Refresh token inválido detectado, limpando sessão...');
              
              // Limpar dados de autenticação
              try {
                localStorage.removeItem('sb-fuojiwpyhoimyrknfcze-auth-token');
                sessionStorage.clear();
                
                // Recarregar página para forçar logout
                setTimeout(() => {
                  window.location.href = '/auth?expired=true';
                }, 100);
              } catch (error) {
                console.error('Erro ao limpar sessão:', error);
              }
            }
          } catch (readError) {
            // Se não conseguir ler o body, apenas ignorar
            console.warn('Não foi possível ler body da resposta:', readError);
          }
        }
        
        return response;
      } catch (error) {
        console.error('Erro na requisição Supabase:', error);
        throw error;
      }
    },
    // Headers globais adicionais (supabase-js já adiciona, mas reforçamos)
    headers: {
      apikey: supabaseAnonKey
    }
  }
});

// Tipos
export interface User {
  id: string;
  email: string;
  user_metadata?: any;
  created_at: string;
}

export interface Session {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  user: User;
}

export interface ApiError {
  message: string;
  status?: number;
}

// Funções utilitárias
export const handleApiError = (error: any): string => {
  // Erros de autenticação do Supabase
  if (error?.message) {
    const message = error.message.toLowerCase();
    
    // Credenciais inválidas
    if (message.includes('invalid login credentials') || 
        message.includes('invalid credentials') ||
        message.includes('email not confirmed')) {
      return '❌ Email ou senha incorretos. Verifique seus dados e tente novamente.';
    }
    
    // Email não confirmado
    if (message.includes('email not confirmed')) {
      return '⚠️ Confirme seu email antes de fazer login. Verifique sua caixa de entrada.';
    }
    
    // Muitas tentativas
    if (message.includes('too many requests')) {
      return '⏰ Muitas tentativas de login. Aguarde alguns minutos e tente novamente.';
    }
    
    // Usuário não encontrado
    if (message.includes('user not found')) {
      return '❌ Usuário não cadastrado. Verifique o email ou crie uma nova conta.';
    }
    
    // Senha fraca
    if (message.includes('password') && message.includes('weak')) {
      return '🔒 Senha muito fraca. Use no mínimo 6 caracteres.';
    }
    
    // Email já cadastrado
    if (message.includes('already registered') || message.includes('already exists')) {
      return '⚠️ Este email já está cadastrado. Faça login ou recupere sua senha.';
    }
    
    // Erro de rede
    if (message.includes('network') || message.includes('fetch')) {
      return '🌐 Erro de conexão. Verifique sua internet e tente novamente.';
    }
    
    // Retorna mensagem original se não houver tradução
    return error.message;
  }
  
  return '❌ Erro desconhecido. Tente novamente ou entre em contato com o suporte.';
};

export const checkApiConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
};

// Tipos para logs de acesso
export interface UserAccessLog {
  id: string;
  user_id: string;
  ip_address?: string;
  user_agent?: string;
  login_method: string;
  session_duration?: string;
  logout_time?: string;
  created_at: string;
  organization_id?: string;
}

// Tipos para campanhas de disparo em massa
export interface MassCampaign {
  id: string;
  user_id: string;
  campaign_name: string;
  message_text?: string;
  message_type: 'text' | 'media' | 'audio';
  media_url?: string;
  media_filename?: string;
  media_mimetype?: string;
  recipients_count: number;
  sent_count: number;
  failed_count: number;
  status: 'pending' | 'sending' | 'completed' | 'failed' | 'scheduled';
  min_delay: number;
  max_delay: number;
  scheduled_for?: string;
  folder_id?: string; // ID da campanha na API UAZAPI para controle
  folder_ids?: string; // IDs dos blocos quando enviado em blocos (separados por vírgula)
  created_at: string;
  updated_at: string;
}

// Função para upload de mídia para campanhas
export const uploadCampaignMedia = async (file: File, userId: string): Promise<{ url: string; path: string } | null> => {
  try {
    // Gerar nome único para o arquivo
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    
    // Upload do arquivo
    const { error } = await supabase.storage
      .from('campaign-media')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('Erro no upload:', error);
      return null;
    }
    
    // Obter URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('campaign-media')
      .getPublicUrl(fileName);
    
    return {
      url: publicUrl,
      path: fileName
    };
  } catch (error) {
    console.error('Erro no upload de mídia:', error);
    return null;
  }
};

// Função para deletar mídia
export const deleteCampaignMedia = async (path: string): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from('campaign-media')
      .remove([path]);
    
    return !error;
  } catch (error) {
    console.error('Erro ao deletar mídia:', error);
    return false;
  }
};

// Função para criar campanha
export const createMassCampaign = async (campaignData: Partial<MassCampaign>): Promise<MassCampaign | null> => {
  try {
    const { data, error } = await supabase
      .from('mass_campaigns')
      .insert([campaignData])
      .select()
      .single();
    
    if (error) {
      console.error('Erro ao criar campanha:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Erro ao criar campanha:', error);
    return null;
  }
};

// Função para atualizar campanha
export const updateMassCampaign = async (id: string, updates: Partial<MassCampaign>): Promise<MassCampaign | null> => {
  try {
    const { data, error } = await supabase
      .from('mass_campaigns')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Erro ao atualizar campanha:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Erro ao atualizar campanha:', error);
    return null;
  }
};

// Função para listar campanhas do usuário
export const getUserCampaigns = async (userId: string): Promise<MassCampaign[]> => {
  try {
    const { data, error } = await supabase
      .from('mass_campaigns')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Erro ao buscar campanhas:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Erro ao buscar campanhas:', error);
    return [];
  }
};

// Função para obter campanha por ID
export const getCampaignById = async (id: string): Promise<MassCampaign | null> => {
  try {
    const { data, error } = await supabase
      .from('mass_campaigns')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Erro ao buscar campanha:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Erro ao buscar campanha:', error);
    return null;
  }
};

// Função para deletar campanha
export const deleteMassCampaign = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('mass_campaigns')
      .delete()
      .eq('id', id);
    
    return !error;
  } catch (error) {
    console.error('Erro ao deletar campanha:', error);
    return false;
  }
};

// Função removida: fileToBase64 - agora usamos URLs diretamente do Supabase
// A mídia é enviada como URL em vez de base64 para melhor performance

// ===== FUNÇÕES PARA LOGS DE ACESSO =====

// Função para registrar acesso do usuário
export const logUserAccess = async (
  userId: string,
  ipAddress?: string,
  userAgent?: string,
  loginMethod: string = 'email'
): Promise<string | null> => {
  try {
    const { data, error } = await supabase.rpc('log_user_access', {
      p_user_id: userId,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
      p_login_method: loginMethod
    });

    if (error) {
      console.error('Erro ao registrar acesso:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Erro ao registrar acesso:', error);
    return null;
  }
};

// Função para registrar logout do usuário
export const logUserLogout = async (
  userId: string,
  sessionStart?: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('log_user_logout', {
      p_user_id: userId,
      p_session_start: sessionStart
    });

    if (error) {
      console.error('Erro ao registrar logout:', error);
      return false;
    }

    return data;
  } catch (error) {
    console.error('Erro ao registrar logout:', error);
    return false;
  }
};

// Função para buscar logs de acesso de um usuário
export const getUserAccessLogs = async (
  userId: string,
  limit: number = 10
): Promise<UserAccessLog[]> => {
  try {
    const { data, error } = await supabase
      .from('user_access_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Erro ao buscar logs de acesso:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Erro ao buscar logs de acesso:', error);
    return [];
  }
};

// Função para buscar todos os logs de acesso da organização (para admins)
export const getOrganizationAccessLogs = async (
  organizationId: string,
  limit: number = 50
): Promise<UserAccessLog[]> => {
  try {
    const { data, error } = await supabase
      .from('user_access_logs')
      .select(`
        *,
        profiles!inner(
          full_name,
          email
        )
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Erro ao buscar logs da organização:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Erro ao buscar logs da organização:', error);
    return [];
  }
};

// Função para buscar último acesso de um usuário
export const getUserLastAccess = async (userId: string): Promise<UserAccessLog | null> => {
  try {
    const { data, error } = await supabase
      .from('user_access_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Erro ao buscar último acesso:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Erro ao buscar último acesso:', error);
    return null;
  }
};

// Função para atualizar perfil do usuário
export const updateUserProfile = async (
  userId: string,
  updates: Partial<{
    full_name: string;
    whatsapp: string;
    company_name: string;
    birth_date: string;
    avatar_url: string;
    is_active: boolean;
  }>
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('Erro ao atualizar perfil:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    return false;
  }
};

// Função para buscar estatísticas de usuários da organização
export const getUserStats = async (organizationId: string) => {
  try {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, is_active, created_at')
      .eq('organization_id', organizationId);

    if (profilesError) {
      console.error('Erro ao buscar perfis:', profilesError);
      return null;
    }

    const { data: accessLogs, error: logsError } = await supabase
      .from('user_access_logs')
      .select('user_id, created_at')
      .eq('organization_id', organizationId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Últimos 30 dias

    if (logsError) {
      console.error('Erro ao buscar logs:', logsError);
      return null;
    }

    const totalUsers = profiles?.length || 0;
    const activeUsers = profiles?.filter(p => p.is_active)?.length || 0;
    const inactiveUsers = totalUsers - activeUsers;
    const recentLogins = accessLogs?.length || 0;

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      recentLogins
    };
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return null;
  }
};