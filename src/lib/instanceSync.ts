import { supabase } from './supabase';
import { getInstances as getUazapiInstances } from './wapi/api';
import { toast } from 'react-hot-toast';

/**
 * SERVIÇO DE SINCRONIZAÇÃO DE INSTÂNCIAS
 * 
 * Garante que todas as instâncias estão registradas no Supabase
 * com o user_id correto para isolamento multi-tenant.
 * 
 * FLUXO DE SEGURANÇA:
 * 1. Criar instância na API UAZAPI
 * 2. Registrar no Supabase com user_id
 * 3. RLS garante isolamento
 */

export interface SupabaseInstance {
  id: string;
  user_id: string;
  name: string;
  token: string;
  phone_connected?: string;
  status: 'connected' | 'disconnected' | 'connecting';
  is_active: boolean;
  organization_id?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Registra uma nova instância no Supabase.
 * DEVE ser chamado imediatamente após criar instância na API UAZAPI.
 */
export async function registerInstanceInSupabase(
  instanceData: {
    id: string;
    name: string;
    token: string;
    user_id: string;
    phone_connected?: string;
    status?: 'connected' | 'disconnected' | 'connecting';
    organization_id?: string;
  }
): Promise<SupabaseInstance | null> {
  try {
    console.log('📝 Registrando instância no Supabase:', instanceData.id);

    const { data, error } = await supabase
      .from('instances')
      .insert({
        id: instanceData.id,
        user_id: instanceData.user_id,
        name: instanceData.name,
        token: instanceData.token,
        phone_connected: instanceData.phone_connected || null,
        status: instanceData.status || 'disconnected',
        is_active: true,
        organization_id: instanceData.organization_id || null,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao registrar instância no Supabase:', error);
      
      // Se for erro de duplicata, tentar atualizar
      if (error.code === '23505') {
        console.log('⚠️ Instância já existe, tentando atualizar...');
        return await updateInstanceInSupabase(instanceData.id, {
          name: instanceData.name,
          token: instanceData.token,
          phone_connected: instanceData.phone_connected,
          status: instanceData.status || 'disconnected',
        });
      }
      
      toast.error('Erro ao registrar instância');
      return null;
    }

    console.log('✅ Instância registrada com sucesso no Supabase');
    return data;
  } catch (error) {
    console.error('❌ Erro ao registrar instância:', error);
    return null;
  }
}

/**
 * Atualiza dados de uma instância no Supabase.
 */
export async function updateInstanceInSupabase(
  instanceId: string,
  updates: {
    name?: string;
    token?: string;
    phone_connected?: string;
    status?: 'connected' | 'disconnected' | 'connecting';
    is_active?: boolean;
  }
): Promise<SupabaseInstance | null> {
  try {
    console.log('🔄 Atualizando instância no Supabase:', instanceId);

    const { data, error } = await supabase
      .from('instances')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', instanceId)
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao atualizar instância:', error);
      return null;
    }

    console.log('✅ Instância atualizada no Supabase');
    return data;
  } catch (error) {
    console.error('❌ Erro ao atualizar instância:', error);
    return null;
  }
}

/**
 * Busca instâncias do usuário no Supabase (fonte confiável).
 * Esta é a função SEGURA que deve ser usada em todo o sistema.
 */
export async function getUserInstancesFromSupabase(
  userId: string
): Promise<SupabaseInstance[]> {
  try {
    console.log('🔍 Buscando instâncias do usuário no Supabase:', userId);

    const { data, error } = await supabase
      .from('instances')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar instâncias:', error);
      return [];
    }

    console.log(`✅ Encontradas ${data?.length || 0} instâncias do usuário`);
    return data || [];
  } catch (error) {
    console.error('❌ Erro ao buscar instâncias:', error);
    return [];
  }
}

/**
 * Sincroniza TODAS as instâncias da API UAZAPI para o admin.
 * APENAS para rafael@i9place.com.br - bypassa RLS.
 */
export async function syncAllInstancesForAdmin(): Promise<SupabaseInstance[]> {
  try {
    console.log('👑 Sincronizando TODAS as instâncias da UAZAPI para admin...');

    // 1. Buscar TODAS as instâncias da API UAZAPI usando admin token
    let apiInstances: any[] = [];
    try {
      apiInstances = await getUazapiInstances();
      console.log(`📊 Encontradas ${apiInstances.length} instâncias na UAZAPI`);
      console.log('📋 Instâncias da API:', apiInstances);
    } catch (error) {
      console.error('❌ Erro ao buscar instâncias da API UAZAPI:', error);
      return [];
    }

    if (apiInstances.length === 0) {
      console.warn('⚠️ Nenhuma instância encontrada na API UAZAPI');
      return [];
    }

    // 2. Buscar TODAS as instâncias do Supabase via RPC admin
    const { data: supabaseInstances, error } = await supabase
      .rpc('get_all_instances_admin', { admin_email: 'rafael@i9place.com.br' });

    if (error) {
      console.error('❌ Erro ao buscar instâncias do Supabase:', error);
      // Continuar mesmo com erro - vamos usar só as da API
    }

    console.log(`📊 Encontradas ${supabaseInstances?.length || 0} instâncias no Supabase`);

    // 3. Converter TODAS as instâncias da API para o formato SupabaseInstance
    const allInstances: SupabaseInstance[] = [];

    for (const apiInstance of apiInstances) {
      console.log(`🔍 Processando instância da API: ${apiInstance.name || apiInstance.id}`);
      
      // Encontrar no Supabase se existir
      const supabaseInstance = supabaseInstances?.find(
        (si: any) => si.id === apiInstance.id || si.token === apiInstance.token
      );

      if (supabaseInstance) {
        console.log(`✅ Instância ${apiInstance.id} encontrada no Supabase`);
        // Atualizar status se mudou
        if (apiInstance.status !== supabaseInstance.status) {
          console.log(`🔄 Status mudou para ${apiInstance.id}: ${supabaseInstance.status} -> ${apiInstance.status}`);
          
          const updated = await updateInstanceInSupabase(apiInstance.id, {
            status: apiInstance.status,
            phone_connected: apiInstance.phoneConnected || supabaseInstance.phone_connected,
          });

          allInstances.push(updated || supabaseInstance);
        } else {
          allInstances.push(supabaseInstance);
        }
      } else {
        console.log(`⚠️ Instância ${apiInstance.id} NÃO está no Supabase, adicionando da API`);
        // Instância não existe no Supabase, criar objeto temporário da API
        allInstances.push({
          id: apiInstance.id,
          user_id: '', // Admin pode ver todas, user_id não importa
          name: apiInstance.name || apiInstance.profileName || apiInstance.id,
          token: apiInstance.token || '',
          phone_connected: apiInstance.phoneConnected || '',
          status: apiInstance.status,
          is_active: true,
          organization_id: undefined,
          created_at: undefined,
          updated_at: undefined,
        });
      }
    }

    console.log(`✅ Total de instâncias para admin: ${allInstances.length}`);
    console.log('📋 Instâncias finais:', allInstances);
    return allInstances;
  } catch (error) {
    console.error('❌ Erro ao sincronizar todas as instâncias:', error);
    return [];
  }
}

/**
 * Sincroniza status das instâncias do Supabase com a API UAZAPI.
 * Busca dados do Supabase (seguro) e atualiza status da API.
 */
export async function syncInstancesStatus(
  userId: string
): Promise<SupabaseInstance[]> {
  try {
    console.log('🔄 Sincronizando status das instâncias...');

    // 1. Buscar instâncias do Supabase (fonte segura)
    const supabaseInstances = await getUserInstancesFromSupabase(userId);

    if (supabaseInstances.length === 0) {
      console.log('ℹ️ Usuário não possui instâncias');
      return [];
    }

    // 2. Buscar status atualizado da API UAZAPI
    let apiInstances: any[] = [];
    try {
      apiInstances = await getUazapiInstances();
    } catch (error) {
      console.warn('⚠️ Erro ao buscar status da API UAZAPI, usando dados do Supabase');
      return supabaseInstances;
    }

    // 3. Atualizar status no Supabase baseado na API
    const syncedInstances: SupabaseInstance[] = [];

    for (const supabaseInstance of supabaseInstances) {
      // Encontrar instância correspondente na API
      const apiInstance = apiInstances.find(
        api => api.id === supabaseInstance.id || api.token === supabaseInstance.token
      );

      if (apiInstance) {
        // Atualizar status se mudou
        if (apiInstance.status !== supabaseInstance.status) {
          console.log(`🔄 Status mudou para ${supabaseInstance.id}: ${apiInstance.status}`);
          
          const updated = await updateInstanceInSupabase(supabaseInstance.id, {
            status: apiInstance.status,
            phone_connected: apiInstance.phoneConnected || supabaseInstance.phone_connected,
          });

          syncedInstances.push(updated || supabaseInstance);
        } else {
          syncedInstances.push(supabaseInstance);
        }
      } else {
        // Instância não existe mais na API
        console.warn(`⚠️ Instância ${supabaseInstance.id} não encontrada na API`);
        syncedInstances.push(supabaseInstance);
      }
    }

    console.log('✅ Sincronização concluída');
    return syncedInstances;
  } catch (error) {
    console.error('❌ Erro ao sincronizar instâncias:', error);
    // Em caso de erro, retornar instâncias do Supabase
    return await getUserInstancesFromSupabase(userId);
  }
}

/**
 * Deleta instância do Supabase.
 * Soft delete (marca como inativa).
 */
export async function deleteInstanceFromSupabase(
  instanceId: string
): Promise<boolean> {
  try {
    console.log('🗑️ Deletando instância do Supabase:', instanceId);

    const { error } = await supabase
      .from('instances')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', instanceId);

    if (error) {
      console.error('❌ Erro ao deletar instância:', error);
      return false;
    }

    console.log('✅ Instância deletada do Supabase');
    return true;
  } catch (error) {
    console.error('❌ Erro ao deletar instância:', error);
    return false;
  }
}

/**
 * Valida se uma instância pertence ao usuário OU se é super admin.
 * Retorna a instância se válida, null caso contrário.
 */
export async function validateInstanceOwnership(
  instanceIdOrToken: string,
  userId: string,
  userEmail?: string
): Promise<SupabaseInstance | null> {
  try {
    // REGRA ESPECIAL: Super admin pode acessar qualquer instância
    if (userEmail === 'rafael@i9place.com.br') {
      console.log('👑 Super admin - Validando instância sem filtro de user_id');
      
      const { data, error } = await supabase
        .rpc('get_all_instances_admin', { admin_email: userEmail });

      if (error) {
        console.error('❌ Erro ao buscar instância (admin):', error);
        return null;
      }

      // Encontrar a instância específica
      const instance = data?.find(
        (inst: any) => inst.id === instanceIdOrToken || inst.token === instanceIdOrToken
      );

      if (!instance) {
        console.warn('⚠️ Instância não encontrada');
        return null;
      }

      console.log('✅ Super admin - Acesso autorizado à instância:', instance.name);
      return instance;
    }

    // Usuários normais: validar ownership
    const { data, error } = await supabase
      .from('instances')
      .select('*')
      .eq('user_id', userId)
      .or(`id.eq.${instanceIdOrToken},token.eq.${instanceIdOrToken}`)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('❌ Erro ao validar ownership:', error);
      return null;
    }

    if (!data) {
      console.warn('⚠️ Instância não pertence ao usuário');
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ Erro ao validar ownership:', error);
    return null;
  }
}

/**
 * Busca uma instância específica validando ownership.
 */
export async function getInstanceSecure(
  instanceIdOrToken: string,
  userId: string,
  userEmail?: string
): Promise<SupabaseInstance | null> {
  console.log('🔐 Buscando instância com validação de segurança...');
  
  const instance = await validateInstanceOwnership(instanceIdOrToken, userId, userEmail);
  
  if (!instance) {
    console.error('🚫 ACESSO NEGADO: Instância não pertence ao usuário');
    toast.error('Acesso negado: instância não autorizada');
    return null;
  }

  console.log('✅ Acesso autorizado à instância');
  return instance;
}
