import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  if (error?.message) {
    return error.message;
  }
  return 'Erro desconhecido';
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