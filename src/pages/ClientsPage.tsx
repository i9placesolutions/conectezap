import { useState, useEffect } from 'react';
import { supabase, updateUserProfile, getUserStats, getUserAccessLogs, UserAccessLog } from '../lib/supabase';
import { formatDateTime } from '../lib/utils';
import { Search, Filter, Download, RefreshCw, Phone, Users, UserCheck, UserX, Activity, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useNotification } from '../contexts/NotificationContext';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const ADMIN_EMAIL = 'rafael@i9place.com.br';

interface Client {
  id: string;
  email: string;
  full_name: string;
  whatsapp: string;
  created_at: string;
  last_login: string | null;
  avatar_url?: string;
  is_active: boolean;
}

export function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, unknown>>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showAccessLogs, setShowAccessLogs] = useState(false);
  const [accessLogs, setAccessLogs] = useState<UserAccessLog[]>([]);
  const { sendNotification } = useNotification();
  const { user } = useAuth();

  useEffect(() => {
    loadClients();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadClients = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      
      console.log('🔐 Carregando clientes...');
      console.log('👤 Email do usuário:', user?.email);
      console.log('🔑 Admin email:', ADMIN_EMAIL);
      console.log('✅ É admin?', user?.email === ADMIN_EMAIL);
      
      let data: Record<string, unknown>[] = [];
      let organizationId: string | null = null;

      // REGRA ESPECIAL: rafael@i9place.com.br vê TODOS os clientes
      if (user?.email === ADMIN_EMAIL) {
        console.log('👑 SUPER ADMIN - Carregando TODOS os clientes de todas as organizações');
        
        // Buscar TODOS os usuários (sem filtro de organization_id)
        const { data: allClients, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('❌ Erro ao carregar todos os clientes:', error);
          setError('Erro ao carregar usuários. Por favor, tente novamente.');
          throw error;
        }

        console.log(`📊 Total de clientes (todos): ${allClients?.length || 0}`);
        data = allClients || [];
        
        // Para estatísticas, usar todos os clientes
        // Nota: getUserStats precisa de organization_id, então vamos calcular manualmente
        const totalUsers = data.length;
        const activeUsers = data.filter(c => c.is_active).length;
        const inactiveUsers = totalUsers - activeUsers;
        
        setStats({
          totalUsers,
          activeUsers,
          inactiveUsers,
          recentLogins: 0 // Não é possível calcular sem organização específica
        });
      } else {
        console.log('👤 Usuário normal - Carregando apenas clientes da organização');
        
        // Buscar perfil do usuário atual para obter organization_id
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user?.id)
          .single();

        if (!currentProfile?.organization_id) {
          setError('Organização não encontrada.');
          return;
        }

        organizationId = currentProfile.organization_id;

        // Buscar usuários da organização
        const { data: orgClients, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('❌ Erro ao carregar clientes da organização:', error);
          setError('Erro ao carregar usuários. Por favor, tente novamente.');
          throw error;
        }

        console.log(`📊 Total de clientes da organização: ${orgClients?.length || 0}`);
        data = orgClients || [];

        // Carregar estatísticas da organização
        if (organizationId) {
          const statsData = await getUserStats(organizationId);
          setStats(statsData);
        }
      }

      setClients(data);
    } catch (error) {
      console.error('Error loading clients:', error);
      setError('Erro ao carregar usuários. Por favor, tente novamente.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const toggleClientAccess = async (client: Client) => {
    try {
      const newStatus = !client.is_active;
      
      const success = await updateUserProfile(client.id, {
        is_active: newStatus
      });

      if (!success) {
        throw new Error('Erro ao atualizar status do usuário');
      }

      // Send WhatsApp notification
      if (client.whatsapp) {
        const message = newStatus
          ? `🔓 Olá ${client.full_name}!\nSeu acesso ao ConecteZap foi desbloqueado com sucesso! ✅\n\nVocê já pode voltar a utilizar nossa plataforma normalmente.\n\n✨ Bem-vindo(a) de volta!\nAtenciosamente, equipe ConecteZap. 🚀`
          : `🔒 Olá ${client.full_name}!\nSeu acesso ao ConecteZap foi temporariamente bloqueado.\n\nPara mais informações ou para resolver esta situação, entre em contato com nosso suporte.\n\nAtenciosamente, equipe ConecteZap. 🚀`;

        await sendNotification({
          phoneNumber: client.whatsapp,
          text: message
        });
      }

      setClients(clients.map(c => 
        c.id === client.id ? { ...c, is_active: newStatus } : c
      ));

      toast.success(`Usuário ${newStatus ? 'desbloqueado' : 'bloqueado'} com sucesso`);
    } catch (error) {
      console.error('Error toggling client access:', error);
      toast.error('Erro ao alterar acesso do usuário');
    }
  };

  const filteredClients = clients.filter(client => 
    client.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.whatsapp?.includes(searchTerm)
  );

  const handleRefresh = () => {
    loadClients();
  };

  const exportUsers = () => {
    // TODO: Implement export functionality
    toast.success('Funcionalidade de exportação será implementada em breve');
  };

  const viewAccessLogs = async (client: Client) => {
    try {
      setSelectedClient(client);
      setShowAccessLogs(true);
      
      // Buscar logs de acesso do usuário
      const logs = await getUserAccessLogs(client.id);
      setAccessLogs(logs);
    } catch (error) {
      console.error('Erro ao carregar logs de acesso:', error);
      toast.error('Erro ao carregar logs de acesso');
    }
  };

  const closeAccessLogsModal = () => {
    setShowAccessLogs(false);
    setSelectedClient(null);
    setAccessLogs([]);
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total de Usuários</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserCheck className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Usuários Ativos</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.activeUsers}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserX className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Usuários Inativos</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.inactiveUsers}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Acessos (30 dias)</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.recentLogins}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Actions Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, email ou WhatsApp..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className={cn(
              "p-2 text-gray-600 hover:text-primary-600 rounded-lg hover:bg-primary-50 transition-colors",
              isRefreshing && "animate-spin text-primary-600"
            )}
            title="Atualizar"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <button 
            className="p-2 text-gray-600 hover:text-primary-600 rounded-lg hover:bg-primary-50"
            title="Filtrar"
          >
            <Filter className="h-5 w-5" />
          </button>
          <button 
            onClick={exportUsers}
            className="p-2 text-gray-600 hover:text-primary-600 rounded-lg hover:bg-primary-50"
            title="Exportar"
          >
            <Download className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Content Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto" />
            <p className="mt-4 text-gray-600">Carregando usuários...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="p-8 text-center">
            <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-gray-600">
              {searchTerm ? 'Nenhum usuário encontrado para esta busca' : 'Nenhum usuário cadastrado'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    WhatsApp
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cadastro
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Último Acesso
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {client.avatar_url ? (
                            <img
                              src={client.avatar_url}
                              alt={client.full_name || 'Avatar'}
                              className="h-10 w-10 rounded-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div className={`h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center ${
                            client.avatar_url ? 'hidden' : ''
                          }`}>
                            <span className="text-primary-600 font-medium">
                              {client.full_name?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {client.full_name || 'Usuário'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {client.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <Phone className="h-4 w-4 mr-2 text-gray-400" />
                        {client.whatsapp || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {formatDateTime(client.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {client.last_login ? (
                          <div className="flex flex-col">
                            <span>{formatDateTime(client.last_login)}</span>
                            <span className="text-xs text-gray-400">
                              {(() => {
                                const lastLogin = new Date(client.last_login);
                                const now = new Date();
                                const diffMs = now.getTime() - lastLogin.getTime();
                                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                                const diffMinutes = Math.floor(diffMs / (1000 * 60));
                                
                                if (diffDays > 0) {
                                  return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
                                } else if (diffHours > 0) {
                                  return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
                                } else if (diffMinutes > 0) {
                                  return `há ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
                                } else {
                                  return 'agora mesmo';
                                }
                              })()
                            }
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">Nunca acessou</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        "px-2 py-1 text-xs font-medium rounded-full",
                        client.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      )}>
                        {client.is_active ? 'Ativo' : 'Bloqueado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => viewAccessLogs(client)}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          title="Ver logs de acesso"
                        >
                          <Activity className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => toggleClientAccess(client)}
                          className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md ${
                            client.is_active
                              ? 'text-red-700 bg-red-100 hover:bg-red-200'
                              : 'text-green-700 bg-green-100 hover:bg-green-200'
                          } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                        >
                          {client.is_active ? (
                            <>
                              <UserX className="h-4 w-4 mr-1" />
                              Desativar
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-4 w-4 mr-1" />
                              Ativar
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Logs de Acesso */}
      {showAccessLogs && selectedClient && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Logs de Acesso - {selectedClient.full_name}
                </h3>
                <button
                  onClick={closeAccessLogsModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {accessLogs.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum log encontrado</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Este usuário ainda não possui logs de acesso registrados.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {accessLogs.map((log, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Activity className="h-4 w-4 text-green-500" />
                            <span className="text-sm font-medium text-gray-900">
                              Login realizado
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatDateTime(log.created_at)}
                          </span>
                        </div>
                        
                        <div className="mt-2 space-y-1">
                          {log.ip_address && (
                            <div className="flex items-center text-xs text-gray-600">
                              <span className="font-medium mr-2">IP:</span>
                              <span>{log.ip_address}</span>
                            </div>
                          )}
                          
                          {log.user_agent && (
                            <div className="flex items-center text-xs text-gray-600">
                              <span className="font-medium mr-2">Navegador:</span>
                              <span className="truncate">{log.user_agent}</span>
                            </div>
                          )}
                          
                          {log.login_method && (
                            <div className="flex items-center text-xs text-gray-600">
                              <span className="font-medium mr-2">Método:</span>
                              <span>{log.login_method}</span>
                            </div>
                          )}
                          
                          {log.session_duration && (
                            <div className="flex items-center text-xs text-gray-600">
                              <span className="font-medium mr-2">Duração:</span>
                              <span>{Math.round(Number(log.session_duration) / 60)} minutos</span>
                            </div>
                          )}
                          
                          {log.logout_time && (
                            <div className="flex items-center text-xs text-gray-600">
                              <span className="font-medium mr-2">Logout:</span>
                              <span>{formatDateTime(log.logout_time)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={closeAccessLogsModal}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}