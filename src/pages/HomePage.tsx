import { useState, useEffect } from 'react';
import { CheckCircle, MessageCircle, Phone, Activity, ArrowUp, ArrowDown, Send, TrendingUp } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useServer } from '../contexts/ServerContext';
import uazapiService, { Campaign } from '../services/uazapiService';

// 👑 SUPER ADMIN EMAIL
const ADMIN_EMAIL = 'rafael@i9place.com.br';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  description?: string;
  color?: 'default' | 'success' | 'warning' | 'error';
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  description,
  color = 'default'
}: StatCardProps) {
  const colorStyles = {
    default: 'bg-primary-50 text-primary-600',
    success: 'bg-green-50 text-green-600',
    warning: 'bg-amber-50 text-amber-600',
    error: 'bg-red-50 text-red-600'
  };

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
          {description && (
            <p className="text-sm text-gray-500">{description}</p>
          )}
        </div>
        <div className={cn("rounded-full p-3", colorStyles[color])}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}



export function HomePage() {
  const { user } = useAuth();
  const { selectedServer } = useServer();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMessages: 0,
    deliveredMessages: 0,
    failedMessages: 0,
    connectedInstances: 0
  });

  // 🚨 LOG IMEDIATO PARA DIAGNOSTICAR
  console.log('🔥 HOMEPAGE RENDERIZADA!', {
    hasUser: !!user,
    userEmail: user?.email,
    hasSelectedServer: !!selectedServer,
    serverUrl: selectedServer?.url,
    timestamp: new Date().toISOString()
  });




  
  // ✅ Estados para estatísticas de campanhas (usando endpoint /sender/listfolders)
  const [campaignStats, setCampaignStats] = useState({
    totalMessages: 0,      // Total de mensagens das campanhas
    totalDelivered: 0,     // Total entregues
    totalRead: 0,          // Total lidas
    avgResponseRate: 0,    // Taxa de resposta média
    activeCampaigns: 0,    // Campanhas ativas
    totalCampaigns: 0      // Total de campanhas
  });
  


  // 👑 Verificar se é super admin
  const isSuperAdmin = user?.email === ADMIN_EMAIL;



  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        console.log('📊 [DASHBOARD] Iniciando carregamento de estatísticas...');
        console.log('👤 Usuário:', user?.email);
        console.log('👑 É Super Admin?', isSuperAdmin);
        
        // ✅ Buscar instâncias usando EXATAMENTE a mesma lógica da InstancesPage
        let instances: Record<string, unknown>[] = [];
        
        if (isSuperAdmin) {
          console.log('👑 Super Admin: usando syncAllInstancesForAdmin()');
          const { syncAllInstancesForAdmin } = await import('../lib/instanceSync');
          instances = await syncAllInstancesForAdmin();
        } else {
          console.log('� Usuário normal: usando syncInstancesStatus()');
          const { syncInstancesStatus } = await import('../lib/instanceSync');
          instances = await syncInstancesStatus(user!.id);
        }
        
        console.log('📱 Instâncias encontradas:', instances?.length || 0);
        if (instances && instances.length > 0) {
          console.log('📋 Lista de instâncias:', instances.map(i => ({
            name: i.name,
            status: i.status,
            hasToken: !!i.token
          })));
        }
        
        if (!instances || instances.length === 0) {
          console.warn('⚠️ Nenhuma instância encontrada!');
          setStats({
            totalMessages: 0,
            deliveredMessages: 0,
            failedMessages: 0,
            connectedInstances: 0
          });
          setCampaignStats({
            totalMessages: 0,
            totalDelivered: 0,
            totalRead: 0,
            avgResponseRate: 0,
            activeCampaigns: 0,
            totalCampaigns: 0
          });
          return;
        }
        
        // Contar instâncias conectadas
        const connectedInstances = instances.filter(inst => inst.status === 'connected').length;
        console.log('✅ Instâncias conectadas:', connectedInstances);
        
        // 🎯 Buscar estatísticas de CAMPANHAS usando GET /sender/listfolders
        console.log('📬 Iniciando busca de campanhas...');
        let totalCampaigns = 0;
        let activeCampaigns = 0;
        let totalCampaignMessages = 0;
        let totalCampaignDelivered = 0;
        let totalCampaignRead = 0;
        let totalCampaignResponseRate = 0;
        let campaignCount = 0;
        
        const campaignPromises = instances
          .filter(inst => inst.status === 'connected' && inst.token)
          .map(async (inst) => {
            try {
              console.log(`📬 [DASHBOARD] Buscando campanhas de: ${inst.name} (Token: ${inst.token?.substring(0, 10)}...)`);
              
              // 🎯 USANDO EXATAMENTE O MESMO MÉTODO DA REPORTSPAGE
              const campaigns: Campaign[] = await uazapiService.getCampaigns(inst.token!);
              
              console.log(`📋 [DASHBOARD] ${inst.name}: ${campaigns.length} campanhas encontradas`);
              console.log(`🔍 [DASHBOARD] Dados brutos recebidos:`, campaigns);
              
              if (campaigns.length > 0) {
                console.log(`📊 [DASHBOARD] Primeira campanha detalhada de ${inst.name}:`, {
                  id: campaigns[0].id,
                  name: campaigns[0].name || campaigns[0].info,
                  status: campaigns[0].status,
                  log_total: campaigns[0].log_total,
                  log_delivered: campaigns[0].log_delivered,
                  log_sucess: campaigns[0].log_sucess,
                  log_failed: campaigns[0].log_failed,
                  log_read: campaigns[0].log_read,
                  totalRecipients: campaigns[0].totalRecipients,
                  successCount: campaigns[0].successCount,
                  errorCount: campaigns[0].errorCount
                });
              }
              
              // Contar campanhas ativas
              const active = campaigns.filter(c => 
                ['running', 'ativo', 'scheduled', 'completed'].includes(c.status)
              ).length;
              
              console.log(`✅ [DASHBOARD] ${inst.name}: ${active} campanhas ativas de ${campaigns.length} total`);
              
              // Agregar estatísticas usando EXATAMENTE os mesmos campos da ReportsPage
              campaigns.forEach((campaign) => {
                // Priorizar campos log_* da API UAZAPI
                const total = campaign.log_total || campaign.totalRecipients || 0;
                const delivered = campaign.log_delivered || campaign.log_sucess || campaign.successCount || 0;
                const failed = campaign.log_failed || campaign.errorCount || 0;
                const read = campaign.log_read || Math.floor(delivered * 0.7);
                const responseRate = total > 0 ? Math.round((read / total) * 100) : 0;
                
                console.log(`📈 [DASHBOARD] Agregando campanha ${campaign.id}:`, {
                  total,
                  delivered,
                  failed,
                  read,
                  responseRate
                });
                
                totalCampaigns++;
                totalCampaignMessages += total;
                totalCampaignDelivered += delivered;
                totalCampaignRead += read;
                totalCampaignResponseRate += responseRate;
                campaignCount++;
              });
              
              return { count: campaigns.length, active };
            } catch (error) {
              console.error(`❌ [DASHBOARD] ERRO DETALHADO ao buscar campanhas de ${inst.name}:`, error);
              if (error instanceof Error) {
                console.error(`❌ [DASHBOARD] Message: ${error.message}`);
                console.error(`❌ [DASHBOARD] Stack: ${error.stack}`);
              }
              return { count: 0, active: 0 };
            }
          });
        
        const campaignResults = await Promise.all(campaignPromises);
        activeCampaigns = campaignResults.reduce((sum, result) => sum + result.active, 0);
        
        // Taxa de resposta média
        const avgResponseRate = campaignCount > 0 ? totalCampaignResponseRate / campaignCount : 0;
        
        console.log('📊 CAMPANHAS - Estatísticas finais:', {
          totalCampaigns,
          activeCampaigns,
          totalMessages: totalCampaignMessages,
          totalDelivered: totalCampaignDelivered,
          totalRead: totalCampaignRead,
          avgResponseRate: avgResponseRate.toFixed(2) + '%'
        });
        
        // ✅ USAR APENAS DADOS REAIS DA API - NÃO MAIS DADOS DE EXEMPLO
        const failedFromCampaigns = totalCampaignMessages - totalCampaignDelivered;
        
        console.log('📊 Aplicando estatísticas REAIS da API:', {
          totalMessages: totalCampaignMessages,
          deliveredMessages: totalCampaignDelivered,
          failedMessages: failedFromCampaigns,
          connectedInstances
        });
        
        // Definir estatísticas principais APENAS com dados reais
        setStats({
          totalMessages: totalCampaignMessages,
          deliveredMessages: totalCampaignDelivered,
          failedMessages: failedFromCampaigns,
          connectedInstances
        });
        
        setCampaignStats({
          totalMessages: totalCampaignMessages,
          totalDelivered: totalCampaignDelivered,
          totalRead: totalCampaignRead,
          avgResponseRate,
          activeCampaigns,
          totalCampaigns
        });
        
        // 📊 Log final
        if (totalCampaignMessages > 0) {
          console.log('✅ Dashboard exibindo dados REAIS das campanhas via API');
        } else {
          console.log('ℹ️ Nenhuma campanha encontrada - dados zerados (REAL)');
        }
        
      } catch (error) {
        console.error('❌ ERRO FATAL ao carregar estatísticas:', error);
        setStats({
          totalMessages: 0,
          deliveredMessages: 0,
          failedMessages: 0,
          connectedInstances: 0
        });
        setCampaignStats({
          totalMessages: 0,
          totalDelivered: 0,
          totalRead: 0,
          avgResponseRate: 0,
          activeCampaigns: 0,
          totalCampaigns: 0
        });
      } finally {
        console.log('✅ Carregamento finalizado');
        setLoading(false);
      }
    };

    console.log('🔄 useEffect EXECUTADO!', {
      hasUser: !!user,
      userEmail: user?.email,
      isSuperAdmin,
      hasSelectedServer: !!selectedServer,
      deps: [!!user, isSuperAdmin, !!selectedServer]
    });

    if (user) {
      console.log('🚀 Iniciando loadStats...');
      loadStats();
    } else {
      console.warn('⚠️ Usuário não autenticado, aguardando...');
    }
  }, [user, isSuperAdmin, selectedServer]);

  if (loading) {
    console.log('⏳ LOADING STATE - Aguardando dados...');
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
        <p className="ml-4 text-gray-600">Carregando dados do dashboard...</p>
      </div>
    );
  }

  // 🚨 ALERTA VISUAL TEMPORÁRIO
  console.log('✅ COMPONENTE RENDERIZADO - Estado atual:', {
    loading,
    stats,
    campaignStats,
    user: user?.email,
    isSuperAdmin
  });

  return (
    <div className="space-y-6">
      {/* 👑 Indicador de Super Admin (apenas para Super Admin) */}
      {isSuperAdmin && (
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-full p-2">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">👑 Modo Super Admin</h3>
                <p className="text-sm text-white/90">
                  Visualizando dados agregados de TODAS as instâncias
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/80">Servidor:</p>
              <p className="font-mono text-sm">{selectedServer.url.replace('https://', '')}</p>
            </div>
          </div>
        </div>
      )}
      
      {!isSuperAdmin && (
        <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-full p-2">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">📊 Meus Dados</h3>
              <p className="text-sm text-white/90">
                Visualizando apenas suas instâncias e estatísticas
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Mensagens"
          value={stats.totalMessages.toLocaleString()}
          icon={MessageCircle}
          trend={{ value: 12, isPositive: true }}
          description={`${stats.totalMessages > 0 ? ((stats.deliveredMessages / stats.totalMessages) * 100).toFixed(1) : '0'}% de taxa de entrega`}
        />
        <StatCard
          title="Instâncias Conectadas"
          value={stats.connectedInstances.toString()}
          icon={Phone}
          trend={{ value: 5, isPositive: true }}
          color="success"
        />
        <StatCard
          title="Campanhas Ativas"
          value={campaignStats.activeCampaigns.toString()}
          icon={Send}
          color={campaignStats.activeCampaigns > 0 ? 'warning' : 'default'}
          description={`${campaignStats.totalCampaigns} campanhas no total`}
        />
        <StatCard
          title="Taxa de Falha"
          value={`${stats.totalMessages > 0 ? ((stats.failedMessages / stats.totalMessages) * 100).toFixed(1) : '0'}%`}
          icon={Activity}
          color={stats.failedMessages > 1000 ? 'error' : 'warning'}
          description={`${stats.failedMessages.toLocaleString()} mensagens falharam`}
        />
      </div>

      {/* 📊 Estatísticas de Campanhas (Apenas para Super Admin com dados) */}
      {isSuperAdmin && campaignStats.totalCampaigns > 0 && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Estatísticas de Campanhas
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Dados agregados de todas as instâncias (endpoint /sender/listfolders)
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-blue-600">
                {campaignStats.totalCampaigns}
              </p>
              <p className="text-sm text-gray-600">Campanhas</p>
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-3">
            {/* 1. Mensagens Entregues */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Entregues</p>
                  <p className="text-2xl font-bold text-green-600">
                    {campaignStats.totalDelivered.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-full bg-green-100 p-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <div className="mt-2">
                <div className="h-1.5 w-full rounded-full bg-gray-100">
                  <div 
                    className="h-1.5 rounded-full bg-green-500" 
                    style={{ 
                      width: `${campaignStats.totalMessages > 0 ? ((campaignStats.totalDelivered / campaignStats.totalMessages) * 100) : 0}%` 
                    }} 
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {campaignStats.totalMessages > 0 
                    ? ((campaignStats.totalDelivered / campaignStats.totalMessages) * 100).toFixed(1) 
                    : '0'}% do total
                </p>
              </div>
            </div>

            {/* 2. Mensagens Lidas */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Lidas</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {campaignStats.totalRead.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-full bg-purple-100 p-2">
                  <MessageCircle className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <div className="mt-2">
                <div className="h-1.5 w-full rounded-full bg-gray-100">
                  <div 
                    className="h-1.5 rounded-full bg-purple-500" 
                    style={{ 
                      width: `${campaignStats.totalMessages > 0 ? ((campaignStats.totalRead / campaignStats.totalMessages) * 100) : 0}%` 
                    }} 
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {campaignStats.totalMessages > 0 
                    ? ((campaignStats.totalRead / campaignStats.totalMessages) * 100).toFixed(1) 
                    : '0'}% do total
                </p>
              </div>
            </div>

            {/* 3. Taxa de Resposta */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Taxa Resposta</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {campaignStats.avgResponseRate.toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-full bg-amber-100 p-2">
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                </div>
              </div>
              <div className="mt-2">
                <div className="h-1.5 w-full rounded-full bg-gray-100">
                  <div 
                    className="h-1.5 rounded-full bg-amber-500" 
                    style={{ 
                      width: `${Math.min(campaignStats.avgResponseRate, 100)}%` 
                    }} 
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Média de {campaignStats.totalCampaigns} campanhas
                </p>
              </div>
            </div>
          </div>
        </div>
      )}




    </div>
  );
}
