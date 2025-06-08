import React, { useState, useEffect } from 'react';
import { Search, Download, RefreshCw, Calendar, BarChart3, MessageSquare, Users, ArrowUp, ArrowDown, Mail, X, Smartphone, Play, Pause, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { generatePDF } from '../lib/pdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useInstance } from '../contexts/InstanceContext';
import { getInstances } from '../lib/wapi/api';
import { toast } from 'react-hot-toast';
import { uazapiService, Campaign } from '../services/uazapiService';

interface Report {
  id: string;
  campaign: string;
  info?: string;
  status: 'completed' | 'running' | 'failed' | 'scheduled' | 'ativo' | 'paused' | 'cancelled';
  scheduledFor?: number;
  delayMax?: number;
  delayMin?: number;
  log_delivered?: number;
  log_failed?: number;
  log_played?: number;
  log_read?: number;
  log_sucess?: number;
  log_total?: number;
  owner?: string;
  created?: string;
  updated?: string;
  // Campos de compatibilidade com dados antigos
  total: number;
  delivered: number;
  read: number;
  failed?: number;
  date?: string;
  successCount?: number;
  errorCount?: number;
  createdAt?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  responseRate: number;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

interface ApiInstance {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'connecting';
  token: string;
  phoneConnected: string;
  profileName: string;
  systemName: string;
}

function StatCard({ title, value, icon: Icon, trend }: StatCardProps) {
  return (
    <div className="rounded-xl border bg-white p-4 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="space-y-1 min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">{title}</p>
          <p className="text-lg sm:text-2xl font-semibold text-gray-900">{value}</p>
          {trend && (
            <div className="flex items-center space-x-1">
              {trend.isPositive ? (
                <ArrowUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
              ) : (
                <ArrowDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 flex-shrink-0" />
              )}
              <span className={cn(
                "text-xs sm:text-sm font-medium",
                trend.isPositive ? "text-green-500" : "text-red-500"
              )}>
                {trend.value}%
              </span>
              <span className="text-xs sm:text-sm text-gray-500 hidden sm:inline">vs. último mês</span>
            </div>
          )}
        </div>
        <div className="rounded-full bg-primary-50 p-2 sm:p-3 flex-shrink-0">
          <Icon className="h-4 w-4 sm:h-6 sm:w-6 text-primary-600" />
        </div>
      </div>
    </div>
  );
}

export function ReportsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<[string, string]>(['', '']);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'completed' | 'running' | 'failed'>('all');
  
  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Estados do modal de instâncias
  const [showInstanceModal, setShowInstanceModal] = useState(false);
  const [apiInstances, setApiInstances] = useState<ApiInstance[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Estados para campanhas reais
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  
  const { selectedInstance, setSelectedInstance } = useInstance();

  // Função para buscar campanhas da instância selecionada
  const fetchCampaigns = async (isAutoRefresh = false) => {
    if (!selectedInstance?.token) {
      console.log('Nenhuma instância selecionada');
      return;
    }

    setLoadingCampaigns(true);
    try {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[${timestamp}] ${isAutoRefresh ? 'Auto-refresh' : 'Manual'} - Buscando campanhas para instância:`, {
        name: selectedInstance.name,
        id: selectedInstance.id,
        token: selectedInstance.token.substring(0, 10) + '...'
      });
      
      const campaignsData = await uazapiService.getCampaigns(selectedInstance.token);
      
      console.log(`[${timestamp}] Campanhas recebidas:`, {
        count: campaignsData.length,
        campaigns: campaignsData.map(c => ({
          id: c.id,
          name: c.name || c.info,
          status: c.status,
          total: c.log_total || c.totalRecipients,
          success: c.log_sucess || c.successCount,
          failed: c.log_failed || c.errorCount
        }))
      });
      
      setCampaigns(campaignsData);
      
      if (!isAutoRefresh) {
        toast.success(`Campanhas carregadas para ${selectedInstance.name}`);
      }
    } catch (error: any) {
      console.error('Erro ao buscar campanhas:', error);
      if (!isAutoRefresh) {
        // Fornecer feedback específico baseado no tipo de erro
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          toast.error('Erro de conectividade: Não foi possível conectar à API UAZAPI');
        } else if (error.response?.status === 401) {
          toast.error('Token de instância inválido ou expirado');
        } else if (error.response?.status === 403) {
          toast.error('Sem permissão para acessar as campanhas desta instância');
        } else if (error.response?.status === 404) {
          toast.error('Endpoint de campanhas não encontrado na API');
        } else if (error.response?.status >= 500) {
          toast.error('Erro interno da API UAZAPI');
        } else {
          toast.error('Erro ao carregar campanhas da instância');
        }
      }
    } finally {
      setLoadingCampaigns(false);
    }
  };

  // Buscar campanhas quando uma instância for selecionada
  useEffect(() => {
    if (selectedInstance?.token) {
      fetchCampaigns();
    } else {
      setCampaigns([]);
    }
  }, [selectedInstance]);

  // Atualização automática a cada 5 segundos se houver campanhas ativas
  useEffect(() => {
    if (!selectedInstance?.token) return;

    const interval = setInterval(() => {
       // Verificar se há campanhas ativas (running, ativo, scheduled)
       const hasActiveCampaigns = campaigns.some(campaign => 
         ['running', 'ativo', 'scheduled'].includes(campaign.status)
       );
       
       if (hasActiveCampaigns) {
         console.log('Atualizando campanhas automaticamente...');
         fetchCampaigns(true); // true indica que é auto-refresh
       }
     }, 5000); // Atualizar a cada 5 segundos

    return () => clearInterval(interval);
  }, [selectedInstance?.token, campaigns]);

  // Converter campanhas para formato de relatórios
  const reports: Report[] = campaigns.map(campaign => {
    // Usar os dados da API se disponíveis, senão usar dados simulados
    const total = campaign.log_total || campaign.totalRecipients || 0;
    const delivered = campaign.log_delivered || campaign.successCount || 0;
    const read = campaign.log_read || Math.floor(delivered * 0.7); // 70% dos entregues são lidos
    const failed = campaign.log_failed || campaign.errorCount || 0;
    
    // Calcular taxa de resposta baseada na leitura
    const responseRate = total > 0 ? Math.round((read / total) * 100) : 0;
    
    // Calcular tendência (simulada baseada na taxa de sucesso)
    const successRate = total > 0 ? (delivered / total) * 100 : 0;
    const trend = {
      value: Math.round(Math.random() * 20), // Valor simulado
      isPositive: successRate > 70
    };
    
    return {
      id: campaign.id,
      campaign: campaign.name || campaign.info || `Campanha ${campaign.id.substring(0, 8)}`,
      info: campaign.info,
      status: campaign.status,
      scheduledFor: campaign.scheduledFor,
      delayMax: campaign.delayMax,
      delayMin: campaign.delayMin,
      log_delivered: campaign.log_delivered,
      log_failed: campaign.log_failed,
      log_played: campaign.log_played,
      log_read: campaign.log_read,
      log_sucess: campaign.log_sucess,
      log_total: campaign.log_total,
      owner: campaign.owner,
      created: campaign.created,
      updated: campaign.updated,
      // Campos de compatibilidade
      total,
      delivered,
      read,
      failed,
      successCount: campaign.successCount,
      errorCount: campaign.errorCount,
      date: campaign.createdAt ? new Date(campaign.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      createdAt: campaign.createdAt,
      trend,
      responseRate
    };
  });

  const handleRefresh = () => {
    setIsRefreshing(true);
    if (selectedInstance?.token) {
      fetchCampaigns(false).finally(() => {
        setIsRefreshing(false);
      });
    } else {
      // Se não há instância selecionada, apenas simular carregamento
      setTimeout(() => {
        setIsRefreshing(false);
      }, 1000);
    }
  };

  // Funções para gerenciar campanhas
  const handleStopCampaign = async (campaignId: string) => {
    if (!selectedInstance?.token) {
      toast.error('Nenhuma instância selecionada');
      return;
    }

    try {
      const result = await uazapiService.stopCampaign(selectedInstance.token, campaignId);
      if (result.success) {
        toast.success(result.message || 'Campanha parada com sucesso');
        // Recarregar campanhas para atualizar o status
        fetchCampaigns();
      } else {
        toast.error(result.message || 'Erro ao parar campanha');
      }
    } catch (error) {
      console.error('Erro ao parar campanha:', error);
      toast.error('Erro ao parar campanha');
    }
  };

  const handleContinueCampaign = async (campaignId: string) => {
    if (!selectedInstance?.token) {
      toast.error('Nenhuma instância selecionada');
      return;
    }

    try {
      const result = await uazapiService.continueCampaign(selectedInstance.token, campaignId);
      if (result.success) {
        toast.success(result.message || 'Campanha continuada com sucesso');
        // Recarregar campanhas para atualizar o status
        fetchCampaigns();
      } else {
        toast.error(result.message || 'Erro ao continuar campanha');
      }
    } catch (error) {
      console.error('Erro ao continuar campanha:', error);
      toast.error('Erro ao continuar campanha');
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!selectedInstance?.token) {
      toast.error('Nenhuma instância selecionada');
      return;
    }

    // Confirmar antes de deletar
    if (!window.confirm('Tem certeza que deseja deletar esta campanha? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const result = await uazapiService.deleteCampaignNew(selectedInstance.token, campaignId);
      if (result.success) {
        toast.success(result.message || 'Campanha deletada com sucesso');
        // Recarregar campanhas para remover a campanha deletada
        fetchCampaigns();
      } else {
        toast.error(result.message || 'Erro ao deletar campanha');
      }
    } catch (error) {
      console.error('Erro ao deletar campanha:', error);
      toast.error('Erro ao deletar campanha');
    }
  };

  // Funções do modal de instâncias
  const loadConnectedInstances = async () => {
    try {
      setLoading(true);
      const instances = await getInstances();
      
      // Filtrar apenas instâncias conectadas
      const connectedInstances = instances.filter(instance => 
        instance.status === 'connected'
      );
      
      setApiInstances(connectedInstances);
      
      if (connectedInstances.length === 0) {
        toast.error('Nenhuma instância conectada encontrada');
      }
    } catch (error) {
      console.error('Erro ao carregar instâncias:', error);
      toast.error('Erro ao carregar instâncias conectadas');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectInstance = (instance: ApiInstance) => {
    // Converter para o formato esperado pelo contexto
    const formattedInstance = {
      id: instance.id,
      name: instance.name,
      status: instance.status,
      isDefault: false,
      token: instance.token,
      phoneConnected: instance.phoneConnected,
      profileName: instance.profileName,
      systemName: instance.systemName
    };
    
    setSelectedInstance(formattedInstance);
    setShowInstanceModal(false);
    toast.success(`Instância ${instance.name} selecionada`);
  };

  const handleOpenInstanceModal = () => {
    setShowInstanceModal(true);
    loadConnectedInstances();
  };

  useEffect(() => {
    if (showInstanceModal) {
      loadConnectedInstances();
    }
  }, [showInstanceModal]);

  // Abrir modal automaticamente ao carregar a página
  useEffect(() => {
    setShowInstanceModal(true);
  }, []);

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.campaign.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (report.info && report.info.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = selectedStatus === 'all' || 
                         (selectedStatus === 'completed' && (report.status === 'completed' || report.status === 'ativo')) ||
                         (selectedStatus === 'running' && report.status === 'running') ||
                         (selectedStatus === 'failed' && report.status === 'failed');
    
    const matchesDateRange = !dateRange[0] || !dateRange[1] || 
                            (report.date && report.date >= dateRange[0] && report.date <= dateRange[1]) ||
                            (report.created && 
                             new Date(report.created).toISOString().split('T')[0] >= dateRange[0] && 
                             new Date(report.created).toISOString().split('T')[0] <= dateRange[1]);
    
    return matchesSearch && matchesStatus && matchesDateRange;
  });

  // Lógica de paginação
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedReports = filteredReports.slice(startIndex, endIndex);

  // Resetar página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStatus, dateRange]);

  const totalMessages = reports.reduce((sum, report) => sum + report.total, 0);
  const totalDelivered = reports.reduce((sum, report) => sum + report.delivered, 0);
  const totalRead = reports.reduce((sum, report) => sum + report.read, 0);
  const avgResponseRate = reports.reduce((sum, report) => sum + report.responseRate, 0) / reports.length;

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 lg:mb-8 gap-4">
        <div className="flex-1">
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">Relatórios</h1>
          <p className="text-sm lg:text-base text-gray-600">
            {selectedInstance ? (
              <span className="flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${
                  selectedInstance.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                }`}></span>
                {selectedInstance.name}
                {loadingCampaigns && (
                  <span className="text-xs text-blue-600 ml-2">Carregando...</span>
                )}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-gray-400"></span>
                Selecione uma instância
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 lg:gap-4 flex-shrink-0">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || loadingCampaigns}
            className="flex items-center justify-center gap-2 px-4 lg:px-6 py-2.5 lg:py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm lg:text-base font-medium transition-colors"
          >
            <RefreshCw className={cn("h-4 w-4 lg:h-5 lg:w-5", (isRefreshing || loadingCampaigns) && "animate-spin")} />
            <span className="hidden sm:inline">{loadingCampaigns ? 'Carregando...' : 'Atualizar'}</span>
          </button>
          
          {/* Botão de debug - remover em produção */}
          <button
            onClick={() => {
              console.log('=== DEBUG INFO ===');
              console.log('Instância selecionada:', selectedInstance);
              console.log('Campanhas atuais:', campaigns);
              console.log('Campanhas ativas:', campaigns.filter(c => ['running', 'ativo', 'scheduled'].includes(c.status)));
              fetchCampaigns(false);
            }}
            className="flex items-center justify-center gap-2 px-3 lg:px-4 py-2.5 lg:py-3 bg-red-50 border border-red-300 rounded-lg hover:bg-red-100 text-red-700 text-sm lg:text-base font-medium transition-colors"
          >
            🐛
          </button>
          <button
            onClick={() => generatePDF(reports, dateRange)}
            disabled={reports.length === 0}
            className="flex items-center justify-center gap-2 px-4 lg:px-6 py-2.5 lg:py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base font-medium transition-colors"
          >
            <Download className="h-4 w-4 lg:h-5 lg:w-5" />
            <span className="hidden sm:inline">PDF</span>
          </button>
        </div>
      </div>

      {/* Search and Actions Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 lg:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
          {/* Search Input */}
          <div className="relative flex-1 lg:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-3 w-full rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base transition-colors"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:gap-4">
            {/* Status Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 hidden lg:block">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as typeof selectedStatus)}
                className="px-3 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base min-w-[140px] lg:min-w-[160px] transition-colors"
              >
                <option value="all">Todos</option>
                <option value="completed">Concluídos</option>
                <option value="running">Ativo</option>
                <option value="failed">Falhou</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 hidden lg:block">Período</label>
              <div className="flex items-center gap-2 lg:gap-3">
                <div className="relative">
                  <input
                    type="date"
                    value={dateRange[0]}
                    onChange={(e) => setDateRange([e.target.value, dateRange[1]])}
                    className="pl-10 pr-3 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base transition-colors"
                  />
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                <span className="text-gray-500 text-sm font-medium">até</span>
                <div className="relative">
                  <input
                    type="date"
                    value={dateRange[1]}
                    onChange={(e) => setDateRange([dateRange[0], e.target.value])}
                    className="pl-10 pr-3 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base transition-colors"
                  />
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>

            {/* Instance Selector */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 hidden lg:block">Instância</label>
              <button
                onClick={handleOpenInstanceModal}
                className="flex items-center justify-center gap-2 px-4 py-3 text-gray-600 hover:text-primary-600 border border-gray-200 rounded-lg hover:bg-primary-50 hover:border-primary-200 transition-colors"
                title="Selecionar Instância"
              >
                <Smartphone className="h-5 w-5" />
                <span className="hidden lg:inline text-sm">Trocar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard
          title="Total"
          value={totalMessages.toLocaleString()}
          icon={MessageSquare}
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Entregues"
          value={totalDelivered.toLocaleString()}
          icon={Mail}
          trend={{ value: 8, isPositive: true }}
        />
        <StatCard
          title="Lidas"
          value={totalRead.toLocaleString()}
          icon={Users}
          trend={{ value: 15, isPositive: true }}
        />
        <StatCard
          title="Taxa Resposta"
          value={`${avgResponseRate.toFixed(1)}%`}
          icon={BarChart3}
          trend={{ value: 5, isPositive: false }}
        />
      </div>

      {/* Reports Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 lg:p-8 border-b border-gray-200">
            <h2 className="text-lg lg:text-xl font-semibold text-gray-900">Campanhas</h2>
            {loadingCampaigns && (
              <p className="text-sm text-gray-500 mt-1">Carregando...</p>
            )}
          </div>
        
        {!selectedInstance ? (
          <div className="p-12 text-center">
            <Smartphone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-base font-medium text-gray-900 mb-2">Nenhuma instância</h3>
            <p className="text-sm text-gray-500 mb-4">Selecione uma instância</p>
            <button
              onClick={handleOpenInstanceModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Smartphone className="h-4 w-4" />
              Selecionar
            </button>
          </div>
        ) : loadingCampaigns ? (
          <div className="p-12 text-center">
            <RefreshCw className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
            <h3 className="text-base font-medium text-gray-900 mb-2">Carregando...</h3>
            <p className="text-sm text-gray-500">{selectedInstance.name}</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-12 text-center">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-base font-medium text-gray-900 mb-2">Nenhuma campanha encontrada</h3>
            <p className="text-sm text-gray-500 mb-4">
              {reports.length === 0 
                ? selectedInstance?.status === 'connected' 
                  ? 'Nenhuma campanha foi criada ainda nesta instância'
                  : 'Instância desconectada ou sem campanhas registradas'
                : 'Nenhuma campanha corresponde aos filtros aplicados'
              }
            </p>
            {reports.length === 0 && (
              <div className="space-y-3">
                {selectedInstance?.status !== 'connected' && (
                  <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                    ⚠️ Verifique se a instância está conectada e se a API está funcionando corretamente
                  </div>
                )}
                <button
                  onClick={() => window.location.href = '/messages/mass'}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  <MessageSquare className="h-4 w-4" />
                  Criar Nova Campanha
                </button>
                <button
                  onClick={() => fetchCampaigns(false)}
                  className="inline-flex items-center gap-2 px-4 py-2 ml-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  <RefreshCw className="h-4 w-4" />
                  Recarregar
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 lg:px-6 py-4 lg:py-5 text-left text-xs lg:text-sm font-semibold text-gray-600 uppercase tracking-wider w-24">
                    ID
                  </th>
                  <th className="px-4 lg:px-6 py-4 lg:py-5 text-left text-xs lg:text-sm font-semibold text-gray-600 uppercase tracking-wider w-64">
                    Campanha
                  </th>
                  <th className="px-4 lg:px-6 py-4 lg:py-5 text-left text-xs lg:text-sm font-semibold text-gray-600 uppercase tracking-wider w-32">
                    Status
                  </th>
                  <th className="px-4 lg:px-6 py-4 lg:py-5 text-left text-xs lg:text-sm font-semibold text-gray-600 uppercase tracking-wider w-24">
                    Total
                  </th>
                  <th className="px-4 lg:px-6 py-4 lg:py-5 text-left text-xs lg:text-sm font-semibold text-gray-600 uppercase tracking-wider w-28">
                    Sucesso
                  </th>
                  <th className="px-4 lg:px-6 py-4 lg:py-5 text-left text-xs lg:text-sm font-semibold text-gray-600 uppercase tracking-wider w-28">
                    Entregues
                  </th>
                  <th className="px-4 lg:px-6 py-4 lg:py-5 text-left text-xs lg:text-sm font-semibold text-gray-600 uppercase tracking-wider w-24">
                    Lidas
                  </th>
                  <th className="px-4 lg:px-6 py-4 lg:py-5 text-left text-xs lg:text-sm font-semibold text-gray-600 uppercase tracking-wider w-28">
                    Falhas
                  </th>
                  <th className="px-4 lg:px-6 py-4 lg:py-5 text-left text-xs lg:text-sm font-semibold text-gray-600 uppercase tracking-wider w-32">
                    Data
                  </th>
                  <th className="px-4 lg:px-6 py-4 lg:py-5 text-left text-xs lg:text-sm font-semibold text-gray-600 uppercase tracking-wider w-32">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 lg:px-6 py-5 lg:py-6 whitespace-nowrap">
                      <div className="text-sm lg:text-base font-mono text-gray-600 truncate" title={report.id}>
                        {report.id}
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-5 lg:py-6 w-64">
                      <div className="max-w-[240px]">
                        <div className="text-sm lg:text-base font-semibold text-gray-900 truncate" title={report.campaign}>
                          {report.campaign}
                        </div>
                        {report.info && (
                          <div className="text-sm text-gray-500 mt-1 truncate" title={report.info}>
                            {report.info}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-5 lg:py-6 whitespace-nowrap">
                      <span className={cn(
                        "px-3 py-1.5 text-sm lg:text-base font-semibold rounded-full",
                        report.status === 'completed' || report.status === 'ativo' ? 'bg-green-100 text-green-800' :
                        report.status === 'running' ? 'bg-blue-100 text-blue-800' :
                        report.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
                        report.status === 'paused' ? 'bg-orange-100 text-orange-800' :
                        report.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      )}>
                        {report.status === 'completed' ? 'Concluído' :
                         report.status === 'running' ? 'Em andamento' :
                         report.status === 'scheduled' ? 'Agendado' :
                         report.status === 'paused' ? 'Pausado' :
                         report.status === 'cancelled' ? 'Cancelado' :
                         report.status === 'failed' ? 'Falhou' :
                         report.status === 'ativo' ? 'Ativo' : 'Desconhecido'}
                      </span>
                    </td>
                    <td className="px-4 lg:px-6 py-5 lg:py-6 whitespace-nowrap">
                      <div className="text-sm lg:text-base font-semibold text-gray-900">{(report.log_total || report.total || 0).toLocaleString()}</div>
                    </td>
                    <td className="px-4 lg:px-6 py-5 lg:py-6 whitespace-nowrap">
                      <div className="text-sm lg:text-base font-semibold text-gray-900">
                        {(report.log_sucess || report.successCount || 0).toLocaleString()}
                        {(report.log_total || report.total) > 0 && (
                          <div className="text-sm text-gray-500 mt-1">
                            ({(((report.log_sucess || report.successCount || 0) / (report.log_total || report.total || 1)) * 100).toFixed(1)}%)
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-5 lg:py-6 whitespace-nowrap">
                      <div className="text-sm lg:text-base font-semibold text-gray-900">
                        {(report.log_delivered || report.delivered || 0).toLocaleString()}
                        {(report.log_total || report.total) > 0 && (
                          <div className="text-sm text-gray-500 mt-1">
                            ({(((report.log_delivered || report.delivered || 0) / (report.log_total || report.total || 1)) * 100).toFixed(1)}%)
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-5 lg:py-6 whitespace-nowrap">
                      <div className="text-sm lg:text-base font-semibold text-gray-900">
                        {(report.log_read || report.read || 0).toLocaleString()}
                        {(report.log_total || report.total) > 0 && (
                          <div className="text-sm text-gray-500 mt-1">
                            ({(((report.log_read || report.read || 0) / (report.log_total || report.total || 1)) * 100).toFixed(1)}%)
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-5 lg:py-6 whitespace-nowrap">
                      <div className="text-sm lg:text-base font-semibold text-gray-900">
                        {(report.log_failed || report.failed || report.errorCount || 0).toLocaleString()}
                        {(report.log_total || report.total) > 0 && (
                          <div className="text-sm text-gray-500 mt-1">
                            ({(((report.log_failed || report.failed || report.errorCount || 0) / (report.log_total || report.total || 1)) * 100).toFixed(1)}%)
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-5 lg:py-6 whitespace-nowrap">
                      <div className="text-sm lg:text-base text-gray-900">
                        {report.created ? (
                          <div>
                            <div className="font-semibold">{format(new Date(report.created), 'dd/MM/yyyy', { locale: ptBR })}</div>
                            <div className="text-sm text-gray-500">
                              {format(new Date(report.created), 'HH:mm:ss', { locale: ptBR })}
                            </div>
                          </div>
                        ) : report.createdAt ? (
                          <div>
                            <div className="font-semibold">{format(new Date(report.createdAt), 'dd/MM/yyyy', { locale: ptBR })}</div>
                            <div className="text-sm text-gray-500">
                              {format(new Date(report.createdAt), 'HH:mm:ss', { locale: ptBR })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-5 lg:py-6 whitespace-nowrap">
                      <div className="flex items-center gap-2 lg:gap-3">
                        {(report.status === 'running' || report.status === 'ativo') && (
                          <>
                            <button
                              onClick={() => handleStopCampaign(report.id)}
                              className="p-2 lg:p-3 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 rounded-lg transition-colors"
                              title="Parar campanha"
                            >
                              <Pause className="h-4 w-4 lg:h-5 lg:w-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteCampaign(report.id)}
                              className="p-2 lg:p-3 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                              title="Deletar campanha"
                            >
                              <Trash2 className="h-4 w-4 lg:h-5 lg:w-5" />
                            </button>
                          </>
                        )}
                        {report.status === 'paused' && (
                          <>
                            <button
                              onClick={() => handleContinueCampaign(report.id)}
                              className="p-2 lg:p-3 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                              title="Continuar campanha"
                            >
                              <Play className="h-4 w-4 lg:h-5 lg:w-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteCampaign(report.id)}
                              className="p-2 lg:p-3 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                              title="Deletar campanha"
                            >
                              <Trash2 className="h-4 w-4 lg:h-5 lg:w-5" />
                            </button>
                          </>
                        )}
                        {(report.status === 'completed' || report.status === 'failed' || report.status === 'cancelled') && (
                          <button
                            onClick={() => handleDeleteCampaign(report.id)}
                            className="p-2 lg:p-3 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                            title="Deletar campanha"
                          >
                            <Trash2 className="h-4 w-4 lg:h-5 lg:w-5" />
                          </button>
                        )}
                        {report.status === 'scheduled' && (
                          <button
                            onClick={() => handleDeleteCampaign(report.id)}
                            className="p-2 lg:p-3 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                            title="Deletar campanha"
                          >
                            <Trash2 className="h-4 w-4 lg:h-5 lg:w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Controles de Paginação */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 lg:px-8 py-4 lg:py-6 bg-white border-t border-gray-200 gap-3">
            <div className="flex items-center text-xs sm:text-sm lg:text-base text-gray-700">
              <span>
                {startIndex + 1}-{Math.min(endIndex, filteredReports.length)} de {filteredReports.length}
              </span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 justify-center sm:justify-end">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 lg:px-4 py-2 lg:py-3 text-xs sm:text-sm lg:text-base font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let page;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 lg:px-4 py-2 lg:py-3 text-xs sm:text-sm lg:text-base font-medium rounded-lg min-w-[32px] lg:min-w-[40px] ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 lg:px-4 py-2 lg:py-3 text-xs sm:text-sm lg:text-base font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próximo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Seleção de Instâncias */}
      {showInstanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-xl p-4 sm:p-6 lg:p-8 max-w-md lg:max-w-lg w-full max-h-[90vh] overflow-y-auto z-50 relative">
            <div className="flex items-center justify-between mb-4 lg:mb-6">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold">Instâncias</h2>
              <button
                onClick={() => setShowInstanceModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
              </button>
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center py-8 lg:py-12">
                <div className="animate-spin rounded-full h-8 w-8 lg:h-10 lg:w-10 border-2 border-primary-500 border-t-transparent" />
                <span className="ml-2 text-gray-600 text-sm lg:text-base">Carregando...</span>
              </div>
            ) : apiInstances.length === 0 ? (
              <div className="text-center py-8 lg:py-12">
                <div className="text-gray-500 mb-4 text-sm lg:text-base">
                  Nenhuma instância conectada
                </div>
                <p className="text-sm lg:text-base text-gray-400">
                  Conecte uma instância primeiro
                </p>
              </div>
            ) : (
              <div className="space-y-3 lg:space-y-4">
                <p className="text-sm lg:text-base text-gray-600 mb-4">
                  Escolha uma instância:
                </p>
                <div className="max-h-60 lg:max-h-80 overflow-y-auto space-y-2 lg:space-y-3">
                  {apiInstances.map(instance => (
                    <button
                      key={instance.id}
                      onClick={() => handleSelectInstance(instance)}
                      className="w-full p-3 lg:p-4 rounded-lg border border-green-200 bg-green-50 hover:bg-green-100 text-left transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm lg:text-base">{instance.name}</div>
                          {instance.profileName && (
                            <div className="text-sm lg:text-base text-gray-600">{instance.profileName}</div>
                          )}
                          {instance.phoneConnected && (
                            <div className="text-xs lg:text-sm text-gray-500">{instance.phoneConnected}</div>
                          )}
                        </div>
                        <span className="px-2 py-1 rounded-full text-xs lg:text-sm bg-green-200 text-green-800">
                          Conectado
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}