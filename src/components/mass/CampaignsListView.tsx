import { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Trash2, 
  RefreshCw, 
  BarChart2, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle, 
  CheckCircle 
} from 'lucide-react';
import { uazapiService, Campaign } from '../../services/uazapiService';
import { toast } from 'react-hot-toast';

interface CampaignsListViewProps {
  onRefresh?: () => void;
}

export function CampaignsListView({ onRefresh }: CampaignsListViewProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    loadCampaigns();
    
    // Atualizar a cada 5 segundos se houver campanhas em execução
    const interval = setInterval(() => {
      if (campaigns.some(c => c.status === 'running')) {
        loadCampaigns();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [refreshCount]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const data = uazapiService.getCampaigns();
      setCampaigns(data);
    } catch (error) {
      console.error('Erro ao carregar campanhas:', error);
      toast.error('Erro ao carregar campanhas');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleExpand = (campaignId: string) => {
    setExpandedCampaign(expandedCampaign === campaignId ? null : campaignId);
  };

  const handlePauseCampaign = async (campaignId: string) => {
    try {
      await uazapiService.pauseCampaign(campaignId);
      toast.success('Campanha pausada com sucesso');
      loadCampaigns();
    } catch (error) {
      console.error('Erro ao pausar campanha:', error);
      toast.error('Erro ao pausar campanha');
    }
  };

  const handleResumeCampaign = async (campaignId: string) => {
    try {
      await uazapiService.resumeCampaign(campaignId);
      toast.success('Campanha retomada com sucesso');
      loadCampaigns();
    } catch (error) {
      console.error('Erro ao retomar campanha:', error);
      toast.error('Erro ao retomar campanha');
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    try {
      await uazapiService.deleteCampaign(campaignId);
      toast.success('Campanha excluída com sucesso');
      loadCampaigns();
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Erro ao excluir campanha:', error);
      toast.error('Erro ao excluir campanha');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
            Em andamento
          </span>
        );
      case 'completed':
        return (
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
            Concluída
          </span>
        );
      case 'paused':
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
            Pausada
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
            Cancelada
          </span>
        );
      case 'failed':
        return (
          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
            Falha
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
            {status}
          </span>
        );
    }
  };

  const getCampaignDetails = (campaign: Campaign) => {
    if (expandedCampaign !== campaign.id) return null;

    try {
      const details = uazapiService.getCampaignDetails(campaign.id);
      
      return (
        <div className="mt-4 bg-gray-50 p-4 rounded-md">
          <div className="mb-3">
            <h4 className="text-sm font-medium mb-2">Resumo do envio</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white p-3 rounded-md shadow-sm">
                <div className="text-xs text-gray-500">Total</div>
                <div className="text-lg font-semibold">{details.totalRecipients}</div>
              </div>
              
              <div className="bg-white p-3 rounded-md shadow-sm">
                <div className="text-xs text-gray-500">Enviados</div>
                <div className="text-lg font-semibold text-green-600">
                  {details.successCount}
                </div>
              </div>
              
              <div className="bg-white p-3 rounded-md shadow-sm">
                <div className="text-xs text-gray-500">Erros</div>
                <div className="text-lg font-semibold text-red-600">
                  {details.errorCount}
                </div>
              </div>
              
              <div className="bg-white p-3 rounded-md shadow-sm">
                <div className="text-xs text-gray-500">Pendentes</div>
                <div className="text-lg font-semibold text-gray-600">
                  {details.pendingCount}
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-3">
            <h4 className="text-sm font-medium mb-2">Progresso</h4>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary-500 h-2 rounded-full" 
                style={{ width: `${details.progress}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {details.progress}% concluído
            </div>
          </div>
          
          {details.status === 'running' && (
            <div className="mb-3 flex items-center bg-blue-50 p-3 rounded-md">
              <RefreshCw className="h-4 w-4 text-blue-500 animate-spin mr-2" />
              <span className="text-sm text-blue-700">
                Campanha em andamento, enviando mensagens...
              </span>
            </div>
          )}
          
          {details.status === 'paused' && (
            <div className="mb-3 flex items-center bg-yellow-50 p-3 rounded-md">
              <Pause className="h-4 w-4 text-yellow-500 mr-2" />
              <span className="text-sm text-yellow-700">
                Campanha pausada. Clique em "Continuar" para retomar o envio.
              </span>
            </div>
          )}
          
          {details.status === 'completed' && (
            <div className="mb-3 flex items-center bg-green-50 p-3 rounded-md">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              <span className="text-sm text-green-700">
                Campanha concluída com sucesso.
              </span>
            </div>
          )}
          
          {details.errorCount > 0 && (
            <div className="mb-3 flex items-center bg-red-50 p-3 rounded-md">
              <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
              <span className="text-sm text-red-700">
                {details.errorCount} mensagens não puderam ser enviadas.
              </span>
            </div>
          )}
          
          {/* Lista de resultados recentes */}
          {details.results && details.results.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Resultados recentes</h4>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md">
                {details.results.slice(-5).map((result: any, index: number) => (
                  <div 
                    key={index} 
                    className={`p-2 text-xs ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${result.success ? '' : 'text-red-600'}`}
                  >
                    {result.success ? (
                      <span>✓ Mensagem enviada para {result.number}</span>
                    ) : (
                      <span>✗ Falha ao enviar para {result.number}: {result.error}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    } catch (error) {
      console.error('Erro ao obter detalhes da campanha:', error);
      return (
        <div className="mt-4 bg-red-50 p-4 rounded-md text-red-700">
          Erro ao carregar detalhes da campanha.
        </div>
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Campanhas de Envio</h2>
        <button
          onClick={() => {
            setRefreshCount(refreshCount + 1);
            if (onRefresh) {
              onRefresh();
            }
          }}
          className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>
      
      {campaigns.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
          <BarChart2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nenhuma campanha encontrada
          </h3>
          <p className="text-gray-500">
            As campanhas de envio em massa aparecerão aqui quando você começar a enviar mensagens.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-medium text-gray-900">{campaign.name}</h3>
                    <div className="flex items-center space-x-3 mt-1">
                      {getStatusBadge(campaign.status)}
                      <span className="text-xs text-gray-500">
                        {new Date(campaign.createdAt).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {campaign.status === 'running' && (
                      <button
                        onClick={() => handlePauseCampaign(campaign.id)}
                        className="flex items-center gap-1 px-2 py-1 text-yellow-700 bg-yellow-50 rounded-md hover:bg-yellow-100"
                        title="Pausar campanha"
                      >
                        <Pause className="h-4 w-4" />
                      </button>
                    )}
                    {campaign.status === 'paused' && (
                      <button
                        onClick={() => handleResumeCampaign(campaign.id)}
                        className="flex items-center gap-1 px-2 py-1 text-green-700 bg-green-50 rounded-md hover:bg-green-100"
                        title="Continuar campanha"
                      >
                        <Play className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteCampaign(campaign.id)}
                      className="flex items-center gap-1 px-2 py-1 text-red-700 bg-red-50 rounded-md hover:bg-red-100"
                      title="Excluir campanha"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleToggleExpand(campaign.id)}
                      className="flex items-center gap-1 px-2 py-1 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      {expandedCampaign === campaign.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full ${
                        campaign.status === 'completed' ? 'bg-green-500' : 
                        campaign.status === 'failed' ? 'bg-red-500' : 
                        'bg-primary-500'
                      }`}
                      style={{ width: `${campaign.progress}%` }}
                    />
                  </div>
                  <span className="ml-2 text-xs font-medium text-gray-500">
                    {campaign.progress}%
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="text-center">
                    <div className="text-xs text-gray-500">Total</div>
                    <div className="text-sm font-semibold">{campaign.totalRecipients}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500">Enviados</div>
                    <div className="text-sm font-semibold text-green-600">{campaign.successCount}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500">Erros</div>
                    <div className="text-sm font-semibold text-red-600">{campaign.errorCount}</div>
                  </div>
                </div>
              </div>
              
              {getCampaignDetails(campaign)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
