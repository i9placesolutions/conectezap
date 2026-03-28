/**
 * SERVIÇO DE GESTÃO DE LEADS
 * 
 * Arquitetura Híbrida:
 * - Supabase: Armazena e gerencia dados dos leads (status, tags, notas, campos customizados)
 * - UAZAPI: Fonte de dados do WhatsApp (mensagens, contatos, eventos)
 * 
 * Fluxo:
 * 1. UAZAPI identifica o contato (chat_id)
 * 2. Supabase gerencia os dados de negócio do lead
 * 3. Sincronização bidirecional quando necessário
 */

import { supabase } from '../lib/supabase';

// =====================================================
// TIPOS
// =====================================================

export interface Lead {
  id: string;
  user_id: string;
  instance_id: string;
  
  // Identificação (do WhatsApp)
  chat_id: string;
  phone?: string;
  wa_name?: string;
  wa_contact_name?: string;
  profile_picture_url?: string;
  is_group: boolean;
  
  // Dados de gestão
  lead_name?: string;
  lead_full_name?: string;
  lead_email?: string;
  lead_personal_id?: string;
  lead_status: string;
  lead_tags?: string[];
  lead_notes?: string;
  lead_is_ticket_open: boolean;
  lead_assigned_agent_id?: string;
  lead_kanban_order: number;
  
  // Campos personalizados
  lead_field_01?: string;
  lead_field_02?: string;
  lead_field_03?: string;
  lead_field_04?: string;
  lead_field_05?: string;
  lead_field_06?: string;
  lead_field_07?: string;
  lead_field_08?: string;
  lead_field_09?: string;
  lead_field_10?: string;
  lead_field_11?: string;
  lead_field_12?: string;
  lead_field_13?: string;
  lead_field_14?: string;
  lead_field_15?: string;
  lead_field_16?: string;
  lead_field_17?: string;
  lead_field_18?: string;
  lead_field_19?: string;
  lead_field_20?: string;
  
  // Metadados
  last_message_at?: string;
  last_message_text?: string;
  last_message_type?: string;
  unread_count: number;
  
  created_at: string;
  updated_at: string;
}

export interface LeadFieldConfig {
  id: string;
  user_id: string;
  instance_id: string;
  lead_field_01?: string;
  lead_field_02?: string;
  lead_field_03?: string;
  lead_field_04?: string;
  lead_field_05?: string;
  lead_field_06?: string;
  lead_field_07?: string;
  lead_field_08?: string;
  lead_field_09?: string;
  lead_field_10?: string;
  lead_field_11?: string;
  lead_field_12?: string;
  lead_field_13?: string;
  lead_field_14?: string;
  lead_field_15?: string;
  lead_field_16?: string;
  lead_field_17?: string;
  lead_field_18?: string;
  lead_field_19?: string;
  lead_field_20?: string;
  created_at: string;
  updated_at: string;
}

export interface LeadFilters {
  status?: string;
  search?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface LeadStats {
  total: number;
  novo: number;
  qualificado: number;
  negociacao: number;
  ganho: number;
  perdido: number;
}

// =====================================================
// CONFIGURAÇÃO DE CAMPOS PERSONALIZADOS
// =====================================================

/**
 * Busca a configuração dos campos personalizados
 */
export async function getLeadFieldConfig(
  userId: string,
  instanceId: string
): Promise<LeadFieldConfig | null> {
  try {
    console.log('🔧 Buscando configuração de campos:', { userId, instanceId });
    
    const { data, error } = await supabase
      .from('lead_field_configs')
      .select('*')
      .eq('user_id', userId)
      .eq('instance_id', instanceId)
      .maybeSingle(); // Usar maybeSingle() ao invés de single() para evitar erro 406
    
    if (error) {
      console.error('❌ Erro ao buscar configuração:', error);
      throw error;
    }
    
    console.log('✅ Configuração encontrada:', data ? 'Sim' : 'Não');
    return data;
  } catch (error) {
    console.error('❌ Erro ao buscar configuração de campos:', error);
    throw error;
  }
}

/**
 * Salva ou atualiza a configuração dos campos personalizados
 */
export async function saveLeadFieldConfig(
  userId: string,
  instanceId: string,
  config: Partial<LeadFieldConfig>
): Promise<LeadFieldConfig> {
  try {
    console.log('💾 Salvando configuração de campos:', { userId, instanceId, config });
    
    const { data, error } = await supabase
      .from('lead_field_configs')
      .upsert({
        user_id: userId,
        instance_id: instanceId,
        ...config
      }, {
        onConflict: 'user_id,instance_id'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('✅ Configuração salva com sucesso');
    return data;
  } catch (error) {
    console.error('❌ Erro ao salvar configuração de campos:', error);
    throw error;
  }
}

// =====================================================
// CRUD DE LEADS
// =====================================================

/**
 * Busca todos os leads com filtros
 */
export async function getLeads(
  userId: string,
  instanceId: string,
  filters: LeadFilters = {}
): Promise<Lead[]> {
  try {
    console.log('🔍 Buscando leads:', { userId, instanceId, filters });
    
    let query = supabase
      .from('leads')
      .select('*')
      .eq('user_id', userId)
      .eq('instance_id', instanceId)
      .eq('is_group', false)
      .order('last_message_at', { ascending: false, nullsFirst: false });
    
    // Aplicar filtros
    if (filters.status) {
      query = query.eq('lead_status', filters.status);
    }
    
    if (filters.search) {
      query = query.or(`lead_name.ilike.%${filters.search}%,lead_email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
    }
    
    if (filters.tags && filters.tags.length > 0) {
      query = query.contains('lead_tags', filters.tags);
    }
    
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    
    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    const leads = data || [];
    console.log('✅ Leads encontrados:', leads.length);
    
    // Log detalhado dos primeiros 5 leads
    if (leads.length > 0) {
      console.log('📅 Primeiros 5 leads (verificar ordem):', 
        leads.slice(0, 5).map((lead: Lead) => ({
          name: lead.wa_name,
          phone: lead.phone,
          lastMessageAt: lead.last_message_at,
          date: lead.last_message_at ? new Date(lead.last_message_at).toLocaleString() : 'sem data',
          timestamp: lead.last_message_at ? new Date(lead.last_message_at).getTime() : 0
        }))
      );
    }
    
    return leads;
  } catch (error) {
    console.error('❌ Erro ao buscar leads:', error);
    throw error;
  }
}

/**
 * Busca um lead específico por chat_id
 */
export async function getLeadByChatId(
  userId: string,
  instanceId: string,
  chatId: string
): Promise<Lead | null> {
  try {
    console.log('🔍 Buscando lead por chat_id:', { userId, instanceId, chatId });
    
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', userId)
      .eq('instance_id', instanceId)
      .eq('chat_id', chatId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    console.log('✅ Lead encontrado:', data ? 'Sim' : 'Não');
    return data;
  } catch (error) {
    console.error('❌ Erro ao buscar lead por chat_id:', error);
    throw error;
  }
}

/**
 * Cria ou atualiza um lead (upsert)
 * Usado quando chega uma nova mensagem ou quando sincroniza do WhatsApp
 */
export async function upsertLead(
  userId: string,
  instanceId: string,
  chatId: string,
  leadData: Partial<Lead>
): Promise<Lead> {
  try {
    console.log('💾 Upsert lead:', { userId, instanceId, chatId, leadData });
    
    const { data, error } = await supabase
      .from('leads')
      .upsert({
        user_id: userId,
        instance_id: instanceId,
        chat_id: chatId,
        ...leadData
      }, {
        onConflict: 'user_id,instance_id,chat_id'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('✅ Lead salvo/atualizado com sucesso:', data.id);
    return data;
  } catch (error) {
    console.error('❌ Erro ao fazer upsert do lead:', error);
    throw error;
  }
}

/**
 * Atualiza os dados de um lead existente
 */
export async function updateLead(
  leadId: string,
  leadData: Partial<Lead>
): Promise<Lead> {
  try {
    console.log('💾 ========================================');
    console.log('💾 ATUALIZANDO LEAD NO SUPABASE');
    console.log('💾 ========================================');
    console.log('💾 Lead ID:', leadId);
    console.log('💾 Dados:', JSON.stringify(leadData, null, 2));
    
    const { data, error } = await supabase
      .from('leads')
      .update(leadData)
      .eq('id', leadId)
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('💾 ========================================');
    console.log('💾 LEAD ATUALIZADO COM SUCESSO');
    console.log('💾 ========================================');
    console.log('💾 ID:', data.id);
    console.log('💾 Status:', data.lead_status);
    console.log('💾 Tags:', data.lead_tags);
    console.log('💾 ========================================');
    
    return data;
  } catch (error) {
    console.error('💾 ========================================');
    console.error('💾 ERRO AO ATUALIZAR LEAD');
    console.error('💾 ========================================');
    console.error('💾 Erro:', error);
    console.error('💾 ========================================');
    throw error;
  }
}

/**
 * Deleta um lead
 */
export async function deleteLead(leadId: string): Promise<void> {
  try {
    console.log('🗑️ Deletando lead:', leadId);
    
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', leadId);
    
    if (error) throw error;
    
    console.log('✅ Lead deletado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao deletar lead:', error);
    throw error;
  }
}

// =====================================================
// ESTATÍSTICAS
// =====================================================

/**
 * Conta leads por status
 */
export async function getLeadStats(
  userId: string,
  instanceId: string
): Promise<LeadStats> {
  try {
    console.log('📊 Calculando estatísticas de leads');
    
    const { data, error } = await supabase
      .rpc('count_leads_by_status', {
        p_user_id: userId,
        p_instance_id: instanceId
      });
    
    if (error) throw error;
    
    // Transformar resultado em objeto de estatísticas
    const stats: LeadStats = {
      total: 0,
      novo: 0,
      qualificado: 0,
      negociacao: 0,
      ganho: 0,
      perdido: 0
    };
    
    data?.forEach((row: { status: string; count: number }) => {
      const status = (row.status || 'novo').toLowerCase();
      const count = Number(row.count) || 0;
      
      stats.total += count;
      
      if (status === 'novo' || !status) {
        stats.novo += count;
      } else if (status === 'qualificado') {
        stats.qualificado += count;
      } else if (status === 'negociacao' || status === 'negociação') {
        stats.negociacao += count;
      } else if (status === 'ganho') {
        stats.ganho += count;
      } else if (status === 'perdido') {
        stats.perdido += count;
      }
    });
    
    console.log('📊 Estatísticas calculadas:', stats);
    return stats;
  } catch (error) {
    console.error('❌ Erro ao calcular estatísticas:', error);
    throw error;
  }
}

// =====================================================
// SINCRONIZAÇÃO COM WHATSAPP
// =====================================================

/**
 * Sincroniza dados do WhatsApp para o Supabase
 * Usado quando recebe webhook de nova mensagem ou atualização de contato
 */
export async function syncLeadFromWhatsApp(
  userId: string,
  instanceId: string,
  whatsappData: {
    chat_id: string;
    phone?: string;
    wa_name?: string;
    wa_contact_name?: string;
    profile_picture_url?: string;
    is_group?: boolean;
    last_message_at?: string;
    last_message_text?: string;
    last_message_type?: string;
    unread_count?: number;
  }
): Promise<Lead> {
  try {
    console.log('🔄 Sincronizando lead do WhatsApp:', whatsappData.chat_id);
    
    // Buscar lead existente
    const existingLead = await getLeadByChatId(userId, instanceId, whatsappData.chat_id);
    
    if (existingLead) {
      // Atualizar apenas metadados do WhatsApp, preservando dados de gestão
      return await updateLead(existingLead.id, {
        wa_name: whatsappData.wa_name,
        wa_contact_name: whatsappData.wa_contact_name,
        profile_picture_url: whatsappData.profile_picture_url,
        last_message_at: whatsappData.last_message_at,
        last_message_text: whatsappData.last_message_text,
        last_message_type: whatsappData.last_message_type,
        unread_count: whatsappData.unread_count || 0
      });
    } else {
      // Criar novo lead com status "novo"
      return await upsertLead(userId, instanceId, whatsappData.chat_id, {
        ...whatsappData,
        lead_status: 'novo',
        lead_is_ticket_open: false,
        lead_kanban_order: 0,
        is_group: whatsappData.is_group || false
      });
    }
  } catch (error) {
    console.error('❌ Erro ao sincronizar lead do WhatsApp:', error);
    throw error;
  }
}
