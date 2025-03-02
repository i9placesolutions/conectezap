import { useState } from 'react';
import { Search, Filter, Download, RefreshCw, Calendar, BarChart3, MessageSquare, Users, ArrowUp, ArrowDown, Mail } from 'lucide-react';
import { cn } from '../lib/utils';
import { generatePDF } from '../lib/pdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Report {
  id: string;
  campaign: string;
  total: number;
  delivered: number;
  read: number;
  failed: number;
  date: string;
  status: 'completed' | 'running' | 'failed';
  trend: {
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

  const reports: Report[] = [
    {
      id: '1',
      campaign: 'Campanha de Boas-vindas',
      total: 1500,
      delivered: 1450,
      read: 1200,
      failed: 50,
      date: '2024-01-18',
      status: 'completed',
      trend: { value: 12, isPositive: true },
      responseRate: 82.5
    },
    {
      id: '2',
      campaign: 'Promoção de Janeiro',
      total: 2500,
      delivered: 2300,
      read: 1800,
      failed: 200,
      date: '2024-01-17',
      status: 'running',
      trend: { value: 8, isPositive: true },
      responseRate: 75.3
    },
    {
      id: '3',
      campaign: 'Notificação de Eventos',
      total: 1000,
      delivered: 950,
      read: 800,
      failed: 50,
      date: '2024-01-16',
      status: 'failed',
      trend: { value: 5, isPositive: false },
      responseRate: 68.9
    }
  ];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  const handleExportPDF = () => {
    generatePDF(reports, dateRange);
  };

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
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={cn(
              "p-2 text-gray-600 hover:text-primary-600 rounded-lg hover:bg-primary-50 transition-colors",
              isRefreshing && "animate-spin text-primary-600"
            )}
            title="Atualizar"
          >
            <RefreshCw className="h-5 w-5" />
          </button>

          <button
            onClick={handleExportPDF}
            className="p-2 text-gray-600 hover:text-primary-600 rounded-lg hover:bg-primary-50"
            title="Exportar PDF"
          >
            <Download className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-4">
        <StatCard
          title="Total de Mensagens"
          value={totalMessages.toLocaleString()}
          icon={MessageSquare}
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Taxa de Entrega"
          value={`${((totalDelivered / totalMessages) * 100).toFixed(1)}%`}
          icon={BarChart3}
          trend={{ value: 8, isPositive: true }}
        />
        <StatCard
          title="Taxa de Leitura"
          value={`${((totalRead / totalDelivered) * 100).toFixed(1)}%`}
          icon={Users}
          trend={{ value: 4, isPositive: true }}
        />
        <StatCard
          title="Taxa de Resposta"
          value={`${avgResponseRate.toFixed(1)}%`}
          icon={Mail}
          trend={{ value: 6, isPositive: true }}
        />
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Campanha
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entregues
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lidas
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Taxa de Resposta
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Falhas
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {report.campaign}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{report.total.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {report.delivered.toLocaleString()}
                      <span className="ml-1 text-xs text-gray-500">
                        ({((report.delivered / report.total) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {report.read.toLocaleString()}
                      <span className="ml-1 text-xs text-gray-500">
                        ({((report.read / report.delivered) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {report.responseRate.toFixed(1)}%
                      {report.trend && (
                        <span className={cn(
                          "ml-1 inline-flex items-center",
                          report.trend.isPositive ? "text-green-500" : "text-red-500"
                        )}>
                          {report.trend.isPositive ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )}
                          <span className="text-xs">{report.trend.value}%</span>
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {report.failed.toLocaleString()}
                      <span className="ml-1 text-xs text-gray-500">
                        ({((report.failed / report.total) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {format(new Date(report.date), 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn(
                      "px-2 py-1 text-xs font-medium rounded-full",
                      report.status === 'completed' ? 'bg-green-100 text-green-800' :
                      report.status === 'running' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    )}>
                      {report.status === 'completed' ? 'Concluído' :
                       report.status === 'running' ? 'Em andamento' : 'Falhou'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}