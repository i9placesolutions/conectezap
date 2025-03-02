import { useState, useEffect } from 'react';
import { dbService } from '../lib/supabase';
import { formatDateTime } from '../lib/utils';
import { Search, Filter, Download, RefreshCw, Phone, Lock, Unlock } from 'lucide-react';
import { cn } from '../lib/utils';
import { useNotification } from '../contexts/NotificationContext';
import { toast } from 'react-hot-toast';

interface Client {
  id: string;
  email: string;
  full_name: string;
  whatsapp: string;
  created_at: string;
  last_login: string | null;
  is_active: boolean;
}

export function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { sendNotification } = useNotification();

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      
      const { data, error } = await dbService
        .from('profiles')
        .select('*');

      if (error) {
        console.error('Error fetching clients:', error);
        setError('Erro ao carregar clientes. Por favor, tente novamente.');
        throw error;
      }

      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
      setError('Erro ao carregar clientes. Por favor, tente novamente.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const toggleClientAccess = async (client: Client) => {
    try {
      const newStatus = !client.is_active;
      
      const { error } = await dbService
        .from('profiles')
        .update({ is_active: newStatus })
        .eq('id', client.id);

      if (error) throw error;

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

      toast.success(`Cliente ${newStatus ? 'desbloqueado' : 'bloqueado'} com sucesso`);
    } catch (error) {
      console.error('Error toggling client access:', error);
      toast.error('Erro ao alterar acesso do cliente');
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

  return (
    <div className="space-y-6">
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
            <p className="mt-4 text-gray-600">Carregando clientes...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="p-8 text-center">
            <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-gray-600">
              {searchTerm ? 'Nenhum cliente encontrado para esta busca' : 'Nenhum cliente cadastrado'}
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
                          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
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
                        {client.last_login ? formatDateTime(client.last_login) : '-'}
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleClientAccess(client)}
                        className={cn(
                          "p-2 rounded-lg transition-colors",
                          client.is_active
                            ? "text-red-600 hover:bg-red-50"
                            : "text-green-600 hover:bg-green-50"
                        )}
                        title={client.is_active ? 'Bloquear acesso' : 'Desbloquear acesso'}
                      >
                        {client.is_active ? (
                          <Lock className="h-5 w-5" />
                        ) : (
                          <Unlock className="h-5 w-5" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}