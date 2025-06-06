import React, { useState, useEffect } from 'react';
import { 
  ArrowUp, 
  ArrowDown, 
  MessageCircle, 
  Phone, 
  Activity, 
  CheckCircle, 
  XCircle, 
  BarChart3, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  CreditCard
} from 'lucide-react';
import { cn } from '../lib/utils';
import { getInstances, getMessageStats } from '../lib/wapi/api';
import { useAuth } from '../contexts/AuthContext';

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

interface ChartData {
  label: string;
  value: number;
}

function BarChart({ data }: { data: ChartData[] }) {
  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="space-y-2">
      {data.map((item, index) => (
        <div key={index} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{item.label}</span>
            <span className="font-medium text-gray-900">{item.value}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-100">
            <div 
              className="h-2 rounded-full bg-primary-600 transition-all duration-500"
              style={{ width: `${(item.value / maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function HomePage() {
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalMessages: 0,
    deliveredMessages: 0,
    failedMessages: 0,
    pendingMessages: 0,
    activeInstances: 0,
    totalInstances: 0,
    messagesTrend: 12,
    instancesTrend: 5
  });

  const [recentActivity] = useState([
    {
      type: 'message',
      title: 'Campanha enviada',
      description: 'Campanha "Promoção de Janeiro" concluída com sucesso',
      time: '5 minutos atrás',
      status: 'success'
    },
    {
      type: 'instance',
      title: 'Nova instância conectada',
      description: 'Instância "Suporte" foi conectada com sucesso',
      time: '10 minutos atrás',
      status: 'success'
    },
    {
      type: 'payment',
      title: 'Nova assinatura',
      description: 'Cliente "João Silva" assinou o plano Pro',
      time: '30 minutos atrás',
      status: 'success'
    }
  ]);

  const messagesByHour: ChartData[] = [
    { label: '08:00', value: 245 },
    { label: '10:00', value: 388 },
    { label: '12:00', value: 479 },
    { label: '14:00', value: 520 },
    { label: '16:00', value: 430 },
    { label: '18:00', value: 355 }
  ];

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        
        // Buscar instâncias reais
        const instances = await getInstances();
        const activeInstances = instances.filter(instance => instance.status === 'connected').length;
        
        // Buscar estatísticas de mensagens reais
        let messageStats = {
          totalMessages: 0,
          deliveredMessages: 0,
          failedMessages: 0
        };
        
        try {
          messageStats = await getMessageStats();
        } catch (messageError) {
          console.warn('Erro ao buscar estatísticas de mensagens, usando dados padrão:', messageError);
          // Usar dados padrão se não conseguir buscar
          messageStats = {
            totalMessages: instances.length * 50, // Estimativa baseada nas instâncias
            deliveredMessages: instances.length * 45,
            failedMessages: instances.length * 2
          };
        }
        
        const pendingMessages = Math.max(0, messageStats.totalMessages - messageStats.deliveredMessages - messageStats.failedMessages);
        
        setStats({
          totalMessages: messageStats.totalMessages,
          deliveredMessages: messageStats.deliveredMessages,
          failedMessages: messageStats.failedMessages,
          pendingMessages,
          activeInstances,
          totalInstances: instances.length,
          messagesTrend: 12,
          instancesTrend: activeInstances > 0 ? 5 : -2
        });
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        // Em caso de erro, usar dados padrão
        setStats({
          totalMessages: 0,
          deliveredMessages: 0,
          failedMessages: 0,
          pendingMessages: 0,
          activeInstances: 0,
          totalInstances: 0,
          messagesTrend: 0,
          instancesTrend: 0
        });
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total de Mensagens"
          value={stats.totalMessages.toLocaleString()}
          icon={MessageCircle}
          trend={{ value: stats.messagesTrend, isPositive: true }}
          description={`${((stats.deliveredMessages / stats.totalMessages) * 100).toFixed(1)}% de taxa de entrega`}
        />
        <StatCard
          title="Instâncias Conectadas"
          value={`${stats.activeInstances}/${stats.totalInstances}`}
          icon={Phone}
          trend={{ value: stats.instancesTrend, isPositive: true }}
          color="success"
        />

        <StatCard
          title="Taxa de Falha"
          value={`${((stats.failedMessages / stats.totalMessages) * 100).toFixed(1)}%`}
          icon={Activity}
          color={stats.failedMessages > 1000 ? 'error' : 'warning'}
          description={`${stats.failedMessages.toLocaleString()} mensagens falharam`}
        />
      </div>

      {/* Charts and Activity Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Message Volume Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Volume de Mensagens</h2>
              <p className="text-sm text-gray-500">Mensagens enviadas por hora</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Hoje</span>
              <BarChart3 className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          <BarChart data={messagesByHour} />
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Atividade Recente</h2>
              <p className="text-sm text-gray-500">Últimas ações no sistema</p>
            </div>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          <div className="divide-y divide-gray-200">
            {recentActivity.map((activity, index) => (
              <div key={index} className="p-4 hover:bg-gray-50">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "flex-shrink-0 mt-0.5 rounded-full p-2",
                    activity.status === 'success' 
                      ? "bg-green-50" 
                      : activity.status === 'warning'
                        ? "bg-amber-50"
                        : "bg-red-50"
                  )}>
                    {activity.type === 'message' && (
                      <MessageCircle className={cn(
                        "h-5 w-5",
                        activity.status === 'success' 
                          ? "text-green-600" 
                          : activity.status === 'warning'
                            ? "text-amber-600"
                            : "text-red-600"
                      )} />
                    )}
                    {activity.type === 'instance' && (
                      <Phone className={cn(
                        "h-5 w-5",
                        activity.status === 'success' 
                          ? "text-green-600" 
                          : activity.status === 'warning'
                            ? "text-amber-600"
                            : "text-red-600"
                      )} />
                    )}
                    {activity.type === 'payment' && (
                      <CreditCard className={cn(
                        "h-5 w-5",
                        activity.status === 'success' 
                          ? "text-green-600" 
                          : activity.status === 'warning'
                            ? "text-amber-600"
                            : "text-red-600"
                      )} />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{activity.title}</p>
                    <p className="text-sm text-gray-500">{activity.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-xs text-gray-500">{activity.time}</span>
                      {activity.status === 'success' && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {activity.status === 'warning' && (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      )}
                      {activity.status === 'error' && (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Delivered Messages */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Mensagens Entregues</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.deliveredMessages.toLocaleString()}</p>
            </div>
            <div className="rounded-full bg-green-50 p-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="h-2 w-full rounded-full bg-gray-100">
              <div 
                className="h-2 rounded-full bg-green-500" 
                style={{ width: `${(stats.deliveredMessages / stats.totalMessages) * 100}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <span>Total: {stats.totalMessages.toLocaleString()}</span>
              <span>{((stats.deliveredMessages / stats.totalMessages) * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Pending Messages */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Mensagens Pendentes</p>
              <p className="text-2xl font-semibold text-gray-900">
                {(stats.totalMessages - stats.deliveredMessages - stats.failedMessages).toLocaleString()}
              </p>
            </div>
            <div className="rounded-full bg-amber-50 p-3">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="h-2 w-full rounded-full bg-gray-100">
              <div 
                className="h-2 rounded-full bg-amber-500"
                style={{ width: `${((stats.totalMessages - stats.deliveredMessages - stats.failedMessages) / stats.totalMessages) * 100}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <span>Total: {stats.totalMessages.toLocaleString()}</span>
              <span>{(((stats.totalMessages - stats.deliveredMessages - stats.failedMessages) / stats.totalMessages) * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Failed Messages */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Mensagens Falhas</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.failedMessages.toLocaleString()}</p>
            </div>
            <div className="rounded-full bg-red-50 p-3">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="h-2 w-full rounded-full bg-gray-100">
              <div 
                className="h-2 rounded-full bg-red-500"
                style={{ width: `${(stats.failedMessages / stats.totalMessages) * 100}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <span>Total: {stats.totalMessages.toLocaleString()}</span>
              <span>{((stats.failedMessages / stats.totalMessages) * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}