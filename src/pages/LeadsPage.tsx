import { useState, useEffect } from 'react';
import { useInstance } from '../contexts/InstanceContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  Users, 
  Settings, 
  Search, 
  RefreshCw,
  Grid3x3,
  List,
  Tag,
  Mail,
  Phone,
  FileText
} from 'lucide-react';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

// ========================================
// APENAS SUPABASE PARA GESTÃO DE LEADS
// ========================================
import {
  getLeads,
  updateLead,
  getLeadFieldConfig,
  saveLeadFieldConfig as saveSupabaseFieldConfig,
  getLeadStats,
  type Lead,
  type LeadFieldConfig as SupabaseLeadFieldConfig,
  type LeadStats
} from '../services/supabase-leads';

// Modais
import LeadFieldsConfigModal from '../components/LeadFieldsConfigModal';
import LeadDetailsModal from '../components/LeadDetailsModal';
import { SelectInstanceModal } from '../components/instance/SelectInstanceModal';

// ========================================
// TIPOS
// ========================================
interface LeadFieldsConfig {
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
}

const DEFAULT_STATUSES = ['novo', 'qualificado', 'negociacao', 'ganho', 'perdido'] as const;

export function LeadsPage() {
  const { user } = useAuth();
  const { instances, selectedInstance, setSelectedInstance } = useInstance();

  // ========================================
  // ESTADOS
  // ========================================
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<LeadStats>({
    total: 0,
    novo: 0,
    qualificado: 0,
    negociacao: 0,
    ganho: 0,
    perdido: 0
  });
  const [fieldsConfig, setFieldsConfig] = useState<LeadFieldsConfig>({});
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'kanban'>('grid');
  
  // Modais
  const [showFieldsConfigModal, setShowFieldsConfigModal] = useState(false);
  const [showInstanceModal, setShowInstanceModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const instanceId = selectedInstance?.id;

  // ========================================
  // CARREGAR LEADS DO SUPABASE
  // ========================================
  const loadLeads = async () => {
    if (!user?.id || !instanceId) {
      console.log('⚠️ Faltam user.id ou instanceId para carregar leads');
      return;
    }

    setLoading(true);
    console.log('📥 Carregando leads do Supabase...', { 
      userId: user.id, 
      instanceId,
      instanceName: selectedInstance?.name 
    });

    try {
      // Carregar leads do Supabase
      const supabaseLeads = await getLeads(user.id, instanceId);
      console.log(`✅ ${supabaseLeads.length} leads carregados do Supabase para instância ${selectedInstance?.name}`);
      
      // Verificar se há leads de outras instâncias (bug)
      const wrongInstanceLeads = supabaseLeads.filter(l => l.instance_id !== instanceId);
      if (wrongInstanceLeads.length > 0) {
        console.error('⚠️ ERRO: Encontrados leads de outras instâncias!', {
          expected: instanceId,
          found: wrongInstanceLeads.map(l => ({ name: l.wa_name, instance: l.instance_id }))
        });
      }
      
      // Ordenar no lado do cliente como garantia (mais recentes primeiro)
      const sortedLeads = [...supabaseLeads].sort((a, b) => {
        const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        return dateB - dateA; // Decrescente (mais recente primeiro)
      });
      
      // Debug: mostrar timestamps dos primeiros 3 leads
      if (sortedLeads.length > 0) {
        console.log('📅 Ordem dos leads APÓS sort (primeiros 3):', 
          sortedLeads.slice(0, 3).map(lead => ({
            name: lead.wa_name,
            lastMessageAt: lead.last_message_at,
            date: lead.last_message_at ? new Date(lead.last_message_at).toLocaleString() : 'sem data',
            timestamp: lead.last_message_at ? new Date(lead.last_message_at).getTime() : 0
          }))
        );
      }
      
      setLeads(sortedLeads);

      // Carregar estatísticas do Supabase (função do banco)
      const supabaseStats = await getLeadStats(user.id, instanceId);
      console.log('📊 Estatísticas carregadas:', supabaseStats);
      setStats(supabaseStats);

      toast.success(`${supabaseLeads.length} leads carregados`);
    } catch (error) {
      console.error('❌ Erro ao carregar leads:', error);
      toast.error('Erro ao carregar leads');
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // CARREGAR CONFIGURAÇÃO DE CAMPOS
  // ========================================
  const loadFieldsConfig = async () => {
    if (!user?.id || !instanceId) return;

    try {
      const config = await getLeadFieldConfig(user.id, instanceId);
      
      if (config) {
        // Converter de Supabase format (lead_field_01) para formato do componente (lead_field01)
        const convertedConfig: LeadFieldsConfig = {};
        Object.entries(config).forEach(([key, value]) => {
          if (key.startsWith('lead_field_') && value) {
            // Remove o underscore extra: lead_field_01 -> lead_field01
            const newKey = key.replace('lead_field_', 'lead_field_');
            convertedConfig[newKey as keyof LeadFieldsConfig] = value;
          }
        });
        
        console.log('🔧 Configuração de campos carregada:', convertedConfig);
        setFieldsConfig(convertedConfig);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar configuração:', error);
    }
  };

  // ========================================
  // SALVAR CONFIGURAÇÃO DE CAMPOS
  // ========================================
  const handleSaveFieldsConfig = async (config: LeadFieldsConfig) => {
    if (!user?.id || !instanceId) {
      toast.error('Usuário ou instância não encontrado');
      return;
    }

    try {
      // Converter formato do modal (lead_field01) para Supabase (lead_field_01)
      const supabaseConfig: Partial<SupabaseLeadFieldConfig> = {};
      Object.entries(config).forEach(([key, value]) => {
        if (value) {
          // Adiciona underscore: lead_field01 -> lead_field_01
          const supabaseKey = key.replace(/^lead_field(\d+)$/, 'lead_field_$1');
          supabaseConfig[supabaseKey as keyof SupabaseLeadFieldConfig] = value;
        }
      });

      await saveSupabaseFieldConfig(user.id, instanceId, supabaseConfig);
      setFieldsConfig(config);
      setShowFieldsConfigModal(false);
      toast.success('Configuração salva com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao salvar configuração:', error);
      toast.error('Erro ao salvar configuração');
    }
  };

  // ========================================
  // EDITAR LEAD
  // ========================================
  const handleEditLead = async (leadData: Partial<Lead>) => {
    if (!selectedLead?.id) return;

    try {
      await updateLead(selectedLead.id, leadData);
      toast.success('Lead atualizado com sucesso!');
      setSelectedLead(null);
      loadLeads(); // Recarregar lista
    } catch (error) {
      console.error('❌ Erro ao atualizar lead:', error);
      toast.error('Erro ao atualizar lead');
    }
  };

  // ========================================
  // LIMPAR LEADS DA INSTÂNCIA
  // ========================================
  const handleClearLeads = async () => {
    if (!user?.id || !instanceId) return;

    const confirmClear = window.confirm(
      `⚠️ ATENÇÃO!\n\nIsso vai DELETAR TODOS os ${leads.length} leads desta instância (${selectedInstance?.name}).\n\nEsta ação NÃO pode ser desfeita!\n\nDeseja continuar?`
    );

    if (!confirmClear) return;

    try {
      const { supabase } = await import('../lib/supabase');
      
      console.log('🗑️ Deletando leads...', { userId: user.id, instanceId });
      
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('user_id', user.id)
        .eq('instance_id', instanceId);

      if (error) throw error;

      toast.success(`✅ ${leads.length} leads deletados com sucesso!`);
      setLeads([]);
      setFilteredLeads([]);
      
      // Recarregar estatísticas
      const { getLeadStats } = await import('../services/supabase-leads');
      const supabaseStats = await getLeadStats(user.id, instanceId);
      setStats(supabaseStats);
      
      console.log('✅ Leads limpos. Reimportação automática iniciará em breve...');
    } catch (error) {
      console.error('❌ Erro ao limpar leads:', error);
      toast.error('Erro ao limpar leads');
    }
  };

  // ========================================
  // IMPORTAR CHATS COMO LEADS (AUTOMÁTICO)
  // ========================================
  const autoImportChatsIfNeeded = async () => {
    if (!user?.id || !instanceId || !selectedInstance?.token) {
      console.log('⚠️ Faltam dados para importação:', { 
        hasUser: !!user?.id, 
        hasInstanceId: !!instanceId, 
        hasToken: !!selectedInstance?.token,
        instanceName: selectedInstance?.name
      });
      return;
    }

    // Verificar se já existem leads para esta instância
    if (leads.length > 0) {
      console.log(`ℹ️ Já existem ${leads.length} leads para instância ${selectedInstance.name}, pulando importação automática`);
      return;
    }

    console.log(`🔄 Nenhum lead encontrado para instância ${selectedInstance.name}, iniciando importação automática...`);
    console.log(`📍 Instance ID: ${instanceId}`);
    console.log(`🔑 Token: ${selectedInstance.token.substring(0, 20)}...`);

    try {
      const { getChatsForLeads } = await import('../lib/wapi/api');
      const { upsertLead } = await import('../services/supabase-leads');

      let totalImported = 0;
      let offset = 0;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        console.log(`📥 Buscando chats (offset: ${offset})...`);
        
        const chats = await getChatsForLeads(selectedInstance.token, limit, offset);
        
        if (!chats || chats.length === 0) {
          hasMore = false;
          break;
        }

        console.log(`✅ ${chats.length} chats recebidos`);
        
        // Debug: mostrar timestamps dos primeiros 3 chats
        if (offset === 0 && chats.length > 0) {
          console.log('📅 Timestamps dos primeiros chats:', 
            chats.slice(0, 3).map((c: any) => ({
              name: c.name || c.pushname,
              timestamp: c.wa_lastMsgTimestamp || c.lastMessage?.timestamp,
              date: c.wa_lastMsgTimestamp ? new Date(c.wa_lastMsgTimestamp * 1000).toLocaleString() : 'sem data'
            }))
          );
        }

        // Importar cada chat como lead
        for (const chat of chats) {
          try {
            const chatId = chat.id || chat.jid;
            const phone = chatId?.split('@')[0] || '';

            // Extrair timestamp da última mensagem (múltiplos formatos possíveis)
            let lastMessageTimestamp = null;
            
            const rawTimestamp = chat.wa_lastMsgTimestamp || chat.lastMessage?.timestamp || chat.timestamp;
            
            if (rawTimestamp) {
              // Detectar se timestamp está em segundos ou milissegundos
              // Timestamps em segundos: < 10000000000 (antes de 20/11/2286)
              // Timestamps em milissegundos: > 10000000000
              const timestampInMs = rawTimestamp > 10000000000 ? rawTimestamp : rawTimestamp * 1000;
              
              // Validar se a data é razoável (entre 2000 e 2100)
              const date = new Date(timestampInMs);
              const year = date.getFullYear();
              
              if (year >= 2000 && year <= 2100) {
                lastMessageTimestamp = date.toISOString();
              } else {
                console.warn('⚠️ Timestamp inválido detectado:', { chatId, rawTimestamp, date: date.toISOString() });
                lastMessageTimestamp = new Date().toISOString();
              }
            } else {
              lastMessageTimestamp = new Date().toISOString();
            }

            // Filtrar URL de foto de perfil do WhatsApp (não funciona por CORS)
            const profilePicUrl = chat.profilePicture || chat.profilePic || chat.imgUrl;
            const validProfilePic = profilePicUrl && !profilePicUrl.includes('pps.whatsapp.net') 
              ? profilePicUrl 
              : undefined;

            // LOG DETALHADO: Verificar qual instanceId está sendo usado
            if (totalImported < 3) {
              console.log(`🔍 Importando chat #${totalImported + 1}:`, {
                chatName: chat.name || chat.pushname,
                chatId,
                phone,
                instanceId: instanceId,  // ← Qual instance está sendo usado?
                userId: user.id
              });
            }

            await upsertLead(user.id, instanceId, chatId, {
              phone,
              wa_name: chat.name || chat.pushname || chat.notifyName || phone,
              is_group: chat.isGroup || false,
              last_message_at: lastMessageTimestamp,
              last_message_text: chat.lastMessage?.body || chat.lastMessage?.text || '',
              last_message_type: chat.lastMessage?.type || 'text',
              unread_count: chat.unreadCount || 0,
              profile_picture_url: validProfilePic
            });

            totalImported++;

            // Log de progresso a cada 10 leads
            if (totalImported % 10 === 0) {
              console.log(`📊 Progresso: ${totalImported} leads importados`);
            }
          } catch (error) {
            console.error('❌ Erro ao importar chat:', chat.id, error);
          }
        }

        // Se recebeu menos que o limit, acabaram os chats
        if (chats.length < limit) {
          hasMore = false;
        } else {
          offset += limit;
        }
      }

      console.log(`✅ Importação concluída: ${totalImported} leads importados!`);
      
      // Recarregar leads e estatísticas
      await loadLeads();
      if (user?.id && instanceId) {
        const supabaseStats = await getLeadStats(user.id, instanceId);
        setStats(supabaseStats);
      }

    } catch (error) {
      console.error('❌ Erro ao importar chats:', error);
    }
  };

  // ========================================
  // FILTRAR LEADS (CLIENT-SIDE)
  // ========================================
  useEffect(() => {
    let filtered = [...leads];

    // Filtro por status
    if (statusFilter) {
      filtered = filtered.filter(lead => {
        const leadStatus = lead.lead_status || 'novo';
        return leadStatus === statusFilter;
      });
    }

    // Filtro por busca (nome, email, telefone, tags)
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(lead => {
        const name = lead.wa_name?.toLowerCase() || '';
        const phone = lead.chat_id?.toLowerCase() || '';
        const tagsStr = lead.lead_tags?.join(' ').toLowerCase() || '';
        
        return name.includes(search) || 
               phone.includes(search) || 
               tagsStr.includes(search);
      });
    }

    console.log(`🔍 Filtros aplicados: ${filtered.length}/${leads.length} leads`);
    setFilteredLeads(filtered);
  }, [leads, statusFilter, searchTerm]);

  // ========================================
  // EFEITOS
  // ========================================
  useEffect(() => {
    if (user?.id && instanceId) {
      loadLeads();
      loadFieldsConfig();
    }
  }, [user?.id, instanceId]);

  // Importação automática de chats quando não há leads
  useEffect(() => {
    if (user?.id && instanceId && selectedInstance?.token && !loading) {
      // Aguardar loadLeads() completar antes de verificar
      if (leads.length === 0) {
        console.log('🔄 Iniciando importação automática de chats...');
        autoImportChatsIfNeeded();
      }
    }
  }, [leads.length, user?.id, instanceId, selectedInstance?.token, loading]);

  // Listener para eventos SSE de novos leads
  useEffect(() => {
    const handleLeadUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ chatId: string; phone: string }>;
      console.log('📬 Novo lead recebido via SSE:', customEvent.detail);
      
      // Recarregar leads automaticamente
      toast.success('Novo lead recebido!');
      loadLeads();
      
      // Recarregar estatísticas
      if (user?.id && instanceId) {
        getLeadStats(user.id, instanceId).then(setStats);
      }
    };

    window.addEventListener('lead-updated', handleLeadUpdated);

    return () => {
      window.removeEventListener('lead-updated', handleLeadUpdated);
    };
  }, [user?.id, instanceId]);

  // ========================================
  // RENDERIZADORES
  // ========================================
  const getStatusColor = (status?: string) => {
    const s = status || 'novo';
    switch (s) {
      case 'novo': return 'bg-blue-100 text-blue-700';
      case 'qualificado': return 'bg-green-100 text-green-700';
      case 'negociacao': return 'bg-yellow-100 text-yellow-700';
      case 'ganho': return 'bg-emerald-100 text-emerald-700';
      case 'perdido': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const renderLeadCard = (lead: Lead) => {
    const status = lead.lead_status || 'novo';
    const tags = lead.lead_tags || [];
    
    // Extrair número do telefone do chat_id (remover sufixo @s.whatsapp.net ou @c.us)
    const chatId = lead.chat_id || '';
    const phoneNumber = lead.phone 
      || chatId.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@g.us', '')
      || '';
    
    const displayName = lead.wa_name || lead.lead_name || phoneNumber || 'Sem nome';
    
    return (
      <div
        key={lead.id}
        onClick={() => setSelectedLead(lead)}
        className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
      >
        {/* Header do Card */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate mb-1">
              {displayName}
            </h3>
            {phoneNumber && (
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="font-mono">{phoneNumber}</span>
              </div>
            )}
          </div>
          <span className={cn("px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap", getStatusColor(status))}>
            {status}
          </span>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {tags.slice(0, 3).map((tag: string, idx: number) => (
              <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full flex items-center gap-1">
                <Tag className="w-3 h-3" />
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Campos Customizados (primeiros 2) */}
        <div className="space-y-1 text-sm">
          {fieldsConfig.lead_field_01 && lead.lead_field_01 && (
            <div className="flex items-center gap-2 text-gray-600">
              <Mail className="w-3 h-3" />
              <span className="truncate">{lead.lead_field_01}</span>
            </div>
          )}
          {fieldsConfig.lead_field_02 && lead.lead_field_02 && (
            <div className="flex items-center gap-2 text-gray-600">
              <FileText className="w-3 h-3" />
              <span className="truncate">{lead.lead_field_02}</span>
            </div>
          )}
        </div>

        {/* Footer - Data */}
        <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
          Última mensagem: {lead.last_message_at 
            ? new Date(lead.last_message_at).toLocaleString('pt-BR', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit', 
                minute: '2-digit' 
              })
            : 'Sem mensagens'}
        </div>
      </div>
    );
  };

  const renderLeadRow = (lead: Lead) => {
    const status = lead.lead_status || 'novo';
    
    // Extrair número do telefone do chat_id (remover sufixo @s.whatsapp.net ou @c.us)
    const chatId = lead.chat_id || '';
    const phoneNumber = lead.phone 
      || chatId.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@g.us', '')
      || '';
    
    const displayName = lead.wa_name || lead.lead_name || phoneNumber || 'Sem nome';
    
    return (
      <div
        key={lead.id}
        onClick={() => setSelectedLead(lead)}
        className="bg-white rounded-lg border border-gray-200 p-3 hover:border-blue-500 hover:shadow-sm transition-all cursor-pointer"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 truncate">{displayName}</h4>
              {phoneNumber && (
                <div className="flex items-center gap-1.5 text-sm text-gray-600 mt-0.5">
                  <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="font-mono">{phoneNumber}</span>
                </div>
              )}
            </div>
            {lead.lead_field_01 && (
              <div className="hidden md:block text-sm text-gray-600 truncate max-w-[200px]">
                {lead.lead_field_01}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {lead.lead_tags && lead.lead_tags.length > 0 && (
              <div className="hidden lg:flex items-center gap-1">
                <Tag className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">{lead.lead_tags.length}</span>
              </div>
            )}
            <span className={cn("px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap", getStatusColor(status))}>
              {status}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderKanbanColumn = (status: string) => {
    const columnLeads = filteredLeads.filter(lead => (lead.lead_status || 'novo') === status);
    
    return (
      <div key={status} className="flex-1 min-w-[280px] bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 capitalize">{status}</h3>
          <span className="px-2 py-1 bg-white rounded-full text-xs font-medium text-gray-600">
            {columnLeads.length}
          </span>
        </div>
        <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
          {columnLeads.map(lead => {
            const chatId = lead.chat_id || '';
            const phoneNumber = lead.phone 
              || chatId.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@g.us', '')
              || '';
            const displayName = lead.wa_name || lead.lead_name || phoneNumber || 'Sem nome';
            
            return (
              <div
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className="bg-white rounded-lg border border-gray-200 p-3 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
              >
                <h4 className="font-medium text-gray-900 mb-2 truncate">{displayName}</h4>
                {phoneNumber && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-2">
                    <Phone className="w-3 h-3 flex-shrink-0" />
                    <span className="font-mono truncate">{phoneNumber}</span>
                  </div>
                )}
                {lead.lead_tags && lead.lead_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {lead.lead_tags.slice(0, 2).map((tag: string, idx: number) => (
                      <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {columnLeads.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8">Nenhum lead</p>
          )}
        </div>
      </div>
    );
  };

  // ========================================
  // RENDERIZAÇÃO PRINCIPAL
  // ========================================
  if (!selectedInstance) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Nenhuma instância selecionada</h2>
          <p className="text-gray-500 mb-4">Selecione uma instância para gerenciar seus leads</p>
          {instances.length > 0 && (
            <button
              onClick={() => setShowInstanceModal(true)}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Selecionar Instância
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 space-y-4">
        {/* Título e Instância */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
              <p className="text-sm text-gray-600">
                Gerencie seus contatos e oportunidades
              </p>
            </div>
            {selectedInstance && (
              <div className="px-3 py-1 bg-blue-50 rounded-lg border border-blue-200">
                <span className="text-xs font-medium text-blue-700">
                  {selectedInstance.name}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {instances.length > 1 && (
              <button
                onClick={() => setShowInstanceModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors text-sm"
                title="Trocar instância"
              >
                <Users className="w-4 h-4" />
                Trocar Instância
              </button>
            )}
            
            <button
              onClick={loadLeads}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Atualizar"
            >
              <RefreshCw className={cn("w-5 h-5 text-gray-600", loading && "animate-spin")} />
            </button>
            
            <button
              onClick={() => setShowFieldsConfigModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
              Configurar Campos
            </button>
            
            <button
              onClick={handleClearLeads}
              className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
              title="Deletar todos os leads desta instância"
            >
              <RefreshCw className="w-4 h-4" />
              Limpar Leads
            </button>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-600">Total</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-600">{stats.novo}</div>
            <div className="text-xs text-blue-600">Novo</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-600">{stats.qualificado}</div>
            <div className="text-xs text-green-600">Qualificado</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-yellow-600">{stats.negociacao}</div>
            <div className="text-xs text-yellow-600">Negociação</div>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-emerald-600">{stats.ganho}</div>
            <div className="text-xs text-emerald-600">Ganho</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-red-600">{stats.perdido}</div>
            <div className="text-xs text-red-600">Perdido</div>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Busca */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome, telefone, tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Filtro de Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os Status</option>
            {DEFAULT_STATUSES.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>

          {/* Modo de Visualização */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-2 rounded transition-colors",
                viewMode === 'grid' ? "bg-white shadow-sm" : "hover:bg-gray-200"
              )}
              title="Grade"
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "p-2 rounded transition-colors",
                viewMode === 'list' ? "bg-white shadow-sm" : "hover:bg-gray-200"
              )}
              title="Lista"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                "p-2 rounded transition-colors",
                viewMode === 'kanban' ? "bg-white shadow-sm" : "hover:bg-gray-200"
              )}
              title="Kanban"
            >
              <FileText className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* Visualização em Grade */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredLeads.map(lead => renderLeadCard(lead))}
                {filteredLeads.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Nenhum lead encontrado</p>
                  </div>
                )}
              </div>
            )}

            {/* Visualização em Lista */}
            {viewMode === 'list' && (
              <div className="space-y-2">
                {filteredLeads.map(lead => renderLeadRow(lead))}
                {filteredLeads.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Nenhum lead encontrado</p>
                  </div>
                )}
              </div>
            )}

            {/* Visualização Kanban */}
            {viewMode === 'kanban' && (
              <div className="flex gap-4 overflow-x-auto pb-4">
                {DEFAULT_STATUSES.map(status => renderKanbanColumn(status))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modais */}
      {showFieldsConfigModal && (
        <LeadFieldsConfigModal
          currentConfig={fieldsConfig as any}
          onSave={handleSaveFieldsConfig as any}
          onClose={() => setShowFieldsConfigModal(false)}
        />
      )}

      {showInstanceModal && (
        <SelectInstanceModal
          onSelect={(instance) => {
            // setSelectedInstance espera a instância completa com isDefault
            const fullInstance = instances.find(i => i.id === instance.id);
            if (fullInstance) {
              setSelectedInstance(fullInstance);
            }
            setShowInstanceModal(false);
          }}
          onClose={() => setShowInstanceModal(false)}
        />
      )}

      {selectedLead && (
        <LeadDetailsModal
          lead={selectedLead as any}
          fieldsConfig={fieldsConfig as any}
          onSave={handleEditLead as any}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </div>
  );
}
