import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, RefreshCw, Calendar, BarChart3, MessageSquare, Users, ArrowUp, ArrowDown, Mail, X, Phone, Play, Pause, Trash2 } from 'lucide-react';
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
  status: 'completed' | 'running' | 'failed' | 'scheduled' | 'ativo';
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
  total?: number;
  delivered?: number;
  read?: number;
  failed?: number;
  date?: string;
  successCount?: number;
  errorCount?: number;
  createdAt?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  responseRate?: number;
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
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {trend && (
            <div className="flex items-center space-x-1">
              {trend.isPositive ? (
                <ArrowUp className="h-4 w-4 text-green-500" />
              ) : (
                <ArrowDown className="h-4 w-4 text-red-500" />
              )}
              <span className={cn(
                "text-sm font-medium",
                trend.isPositive ? "text-green-500" : "text-red-500"
              )}>
                {trend.value}%
              </span>
              <span className="text-sm text-gray-500">vs. último mês</span>
            </div>
          )}
        </div>
        <div className="rounded-full bg-primary-50 p-3">
          <Icon className="h-6 w-6 text-primary-600" />
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
  
  // Estados do modal de instâncias
  const [showInstanceModal, setShowInstanceModal] = useState(false);
  const [apiInstances, setApiInstances] = useState<ApiInstance[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Estados para campanhas reais
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  
  const { selectedInstance, setSelectedInstance } = useInstance();

  // Função para buscar campanhas da instância selecionada
  const fetchCampaigns = async () => {
    if (!selectedInstance?.token) {
      console.log('Nenhuma instância selecionada');
      return;
    }

    setLoadingCampaigns(true);
    try {
      console.log('Buscando campanhas para instância:', selectedInstance.name);
      const campaignsData = await uazapiService.getCampaigns(selectedInstance.token);
      setCampaigns(campaignsData);
      toast.success(`Campanhas carregadas para ${selectedInstance.name}`);
    } catch (error) {
      console.error('Erro ao buscar campanhas:', error);
      toast.error('Erro ao carregar campanhas da instância');
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
      fetchCampaigns().finally(() => {
        setIsRefreshing(false);
      });
    } else {
      // Se não há instância selecionada, apenas simular carregamento
      setTimeout(() => {
        setIsRefreshing(false);
      }, 1000);
    }
  };

  const handleExportPDF = () => {
    generatePDF(reports, dateRange);
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
    const matchesSearch = report.campaign.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || report.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const totalMessages = reports.reduce((sum, report) => sum + report.total, 0);
  const totalDelivered = reports.reduce((sum, report) => sum + report.delivered, 0);
  const totalRead = reports.reduce((sum, report) => sum + report.read, 0);
  const avgResponseRate = reports.reduce((sum, report) => sum + report.responseRate, 0) / reports.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-gray-600">
            {selectedInstance ? 
              `Campanhas da instância: ${selectedInstance.name}` : 
              'Selecione uma instância para visualizar os relatórios'
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || loadingCampaigns}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", (isRefreshing || loadingCampaigns) && "animate-spin")} />
            {loadingCampaigns ? 'Carregando...' : 'Atualizar'}
          </button>
          <button
            onClick={() => generatePDF(reports, dateRange)}
            disabled={reports.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4" />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Search and Actions Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar campanhas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-4">
          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as typeof selectedStatus)}
            className="px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">Todos os status</option>
            <option value="completed">Concluídos</option>
            <option value="running">Em andamento</option>
            <option value="failed">Falhou</option>
          </select>

          {/* Date Range Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="date"
                value={dateRange[0]}
                onChange={(e) => setDateRange([e.target.value, dateRange[1]])}
                className="pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
            <span className="text-gray-500">até</span>
            <div className="relative">
              <input
                type="date"
                value={dateRange[1]}
                onChange={(e) => setDateRange([dateRange[0], e.target.value])}
                className="pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>



          <button
            onClick={handleOpenInstanceModal}
            className="p-2 text-gray-600 hover:text-primary-600 rounded-lg hover:bg-primary-50"
            title="Selecionar Instância"
          >
            <Phone className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total de Mensagens"
          value={totalMessages.toLocaleString()}
          icon={MessageSquare}
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Mensagens Entregues"
          value={totalDelivered.toLocaleString()}
          icon={Mail}
          trend={{ value: 8, isPositive: true }}
        />
        <StatCard
          title="Mensagens Lidas"
          value={totalRead.toLocaleString()}
          icon={Users}
          trend={{ value: 15, isPositive: true }}
        />
        <StatCard
          title="Taxa de Resposta Média"
          value={`${avgResponseRate.toFixed(1)}%`}
          icon={BarChart3}
          trend={{ value: 5, isPositive: false }}
        />
      </div>

      {/* Reports Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Relatórios de Campanhas</h2>
            {loadingCampaigns && (
              <p className="text-sm text-gray-500 mt-1">Carregando campanhas...</p>
            )}
          </div>
        
        {!selectedInstance ? (
          <div className="p-12 text-center">
            <Phone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma instância selecionada</h3>
            <p className="text-gray-500 mb-4">Selecione uma instância para visualizar os relatórios de campanhas</p>
            <button
              onClick={handleOpenInstanceModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Phone className="h-4 w-4" />
              Selecionar Instância
            </button>
          </div>
        ) : loadingCampaigns ? (
          <div className="p-12 text-center">
            <RefreshCw className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Carregando campanhas...</h3>
            <p className="text-gray-500">Buscando dados da instância {selectedInstance.name}</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-12 text-center">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma campanha encontrada</h3>
            <p className="text-gray-500 mb-4">
              {reports.length === 0 
                ? 'Não há campanhas registradas para esta instância'
                : 'Nenhuma campanha corresponde aos filtros aplicados'
              }
            </p>
            {reports.length === 0 && (
              <button
                onClick={() => window.location.href = '/messages/mass'}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <MessageSquare className="h-4 w-4" />
                Criar Primeira Campanha
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campanha/Info
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Agendamento
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Delay (ms)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sucesso
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entregues
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lidas
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reproduzidas
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Falhadas
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proprietário
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Criado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Atualizado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-xs font-mono text-gray-600">{report.id}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-medium text-gray-900">{report.campaign}</div>
                      {/* Mostrar info adicional se disponível */}
                      {report.info && (
                        <div className="text-xs text-gray-500 mt-1">{report.info}</div>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={cn(
                        "px-2 py-1 text-xs font-medium rounded-full",
                        report.status === 'completed' || report.status === 'ativo' ? 'bg-green-100 text-green-800' :
                        report.status === 'running' ? 'bg-blue-100 text-blue-800' :
                        report.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      )}>
                        {report.status === 'completed' ? 'Concluído' :
                         report.status === 'running' ? 'Em andamento' :
                         report.status === 'scheduled' ? 'Agendado' :
                         report.status === 'ativo' ? 'Ativo' : 'Falhou'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {report.scheduledFor ? (
                          <div>
                            <div>{format(new Date(report.scheduledFor), 'dd/MM/yyyy', { locale: ptBR, timeZone: 'America/Sao_Paulo' })}</div>
                            <div className="text-xs text-gray-500">
                              {format(new Date(report.scheduledFor), 'HH:mm:ss', { locale: ptBR, timeZone: 'America/Sao_Paulo' })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Imediato</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {report.delayMin && report.delayMax ? (
                          <div>
                            <div className="text-xs">Min: {report.delayMin}</div>
                            <div className="text-xs">Max: {report.delayMax}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{(report.log_total || report.total || 0).toLocaleString()}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {(report.log_sucess || report.successCount || 0).toLocaleString()}
                        {(report.log_total || report.total) > 0 && (
                          <span className="ml-1 text-xs text-gray-500">
                            ({(((report.log_sucess || report.successCount || 0) / (report.log_total || report.total || 1)) * 100).toFixed(1)}%)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {(report.log_delivered || report.delivered || 0).toLocaleString()}
                        {(report.log_total || report.total) > 0 && (
                          <span className="ml-1 text-xs text-gray-500">
                            ({(((report.log_delivered || report.delivered || 0) / (report.log_total || report.total || 1)) * 100).toFixed(1)}%)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {(report.log_read || report.read || 0).toLocaleString()}
                        {(report.log_total || report.total) > 0 && (
                          <span className="ml-1 text-xs text-gray-500">
                            ({(((report.log_read || report.read || 0) / (report.log_total || report.total || 1)) * 100).toFixed(1)}%)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {(report.log_played || 0).toLocaleString()}
                        {(report.log_total || report.total) > 0 && report.log_played && (
                          <span className="ml-1 text-xs text-gray-500">
                            ({((report.log_played / (report.log_total || report.total || 1)) * 100).toFixed(1)}%)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {(report.log_failed || report.failed || report.errorCount || 0).toLocaleString()}
                        {(report.log_total || report.total) > 0 && (
                          <span className="ml-1 text-xs text-gray-500">
                            ({(((report.log_failed || report.failed || report.errorCount || 0) / (report.log_total || report.total || 1)) * 100).toFixed(1)}%)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-xs text-gray-600">
                        {report.owner || selectedInstance?.name || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {report.created ? (
                          <div>
                            <div>{format(new Date(report.created), 'dd/MM/yyyy', { locale: ptBR, timeZone: 'America/Sao_Paulo' })}</div>
                            <div className="text-xs text-gray-500">
                              {format(new Date(report.created), 'HH:mm:ss', { locale: ptBR, timeZone: 'America/Sao_Paulo' })}
                            </div>
                          </div>
                        ) : report.createdAt ? (
                          <div>
                            <div>{format(new Date(report.createdAt), 'dd/MM/yyyy', { locale: ptBR, timeZone: 'America/Sao_Paulo' })}</div>
                            <div className="text-xs text-gray-500">
                              {format(new Date(report.createdAt), 'HH:mm:ss', { locale: ptBR, timeZone: 'America/Sao_Paulo' })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {report.updated ? (
                          <div>
                            <div>{format(new Date(report.updated), 'dd/MM/yyyy', { locale: ptBR, timeZone: 'America/Sao_Paulo' })}</div>
                            <div className="text-xs text-gray-500">
                              {format(new Date(report.updated), 'HH:mm:ss', { locale: ptBR, timeZone: 'America/Sao_Paulo' })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}  
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {(report.status === 'running' || report.status === 'ativo') && (
                          <>
                            <button
                              onClick={() => handleStopCampaign(report.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 transition-colors"
                              title="Parar campanha"
                            >
                              <Pause className="h-3 w-3" />
                              Parar
                            </button>
                            <button
                              onClick={() => handleDeleteCampaign(report.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 transition-colors"
                              title="Deletar campanha"
                            >
                              <Trash2 className="h-3 w-3" />
                              Deletar
                            </button>
                          </>
                        )}
                        {report.status === 'paused' && (
                          <>
                            <button
                              onClick={() => handleContinueCampaign(report.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200 transition-colors"
                              title="Continuar campanha"
                            >
                              <Play className="h-3 w-3" />
                              Continuar
                            </button>
                            <button
                              onClick={() => handleDeleteCampaign(report.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 transition-colors"
                              title="Deletar campanha"
                            >
                              <Trash2 className="h-3 w-3" />
                              Deletar
                            </button>
                          </>
                        )}
                        {(report.status === 'completed' || report.status === 'failed' || report.status === 'cancelled') && (
                          <button
                            onClick={() => handleDeleteCampaign(report.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 transition-colors"
                            title="Deletar campanha"
                          >
                            <Trash2 className="h-3 w-3" />
                            Deletar
                          </button>
                        )}
                        {report.status === 'scheduled' && (
                          <button
                            onClick={() => handleDeleteCampaign(report.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 transition-colors"
                            title="Deletar campanha"
                          >
                            <Trash2 className="h-3 w-3" />
                            Deletar
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
      </div>

      {/* Modal de Seleção de Instâncias */}
      {showInstanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 mt-0">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 z-50 relative">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Selecione uma Instância</h2>
              <button
                onClick={() => setShowInstanceModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
                <span className="ml-2 text-gray-600">Carregando instâncias...</span>
              </div>
            ) : apiInstances.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500 mb-4">
                  Nenhuma instância conectada encontrada
                </div>
                <p className="text-sm text-gray-400">
                  Conecte uma instância primeiro para visualizar relatórios
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 mb-4">
                  Escolha uma instância conectada para continuar:
                </p>
                {apiInstances.map(instance => (
                  <button
                    key={instance.id}
                    onClick={() => handleSelectInstance(instance)}
                    className="w-full p-4 rounded-lg border border-green-200 bg-green-50 hover:bg-green-100 text-left transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{instance.name}</div>
                        {instance.profileName && (
                          <div className="text-sm text-gray-600">{instance.profileName}</div>
                        )}
                        {instance.phoneConnected && (
                          <div className="text-xs text-gray-500">{instance.phoneConnected}</div>
                        )}
                      </div>
                      <span className="px-2 py-1 rounded-full text-xs bg-green-200 text-green-800">
                        Conectado
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}