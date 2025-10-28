import { useState, useEffect } from 'react';
import { Search, Plus, RefreshCw, Phone, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { InstanceModal } from '../components/instance/InstanceModal';
import { InstanceCard } from '../components/instance/InstanceCard';
import { QRCodeModal } from '../components/instance/QRCodeModal';
import { getCurrentServerConfig } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  syncInstancesStatus, 
  syncAllInstancesForAdmin,
  registerInstanceInSupabase,
  deleteInstanceFromSupabase,
  updateInstanceInSupabase
} from '../lib/instanceSync';

const ADMIN_EMAIL = 'rafael@i9place.com.br';


interface Instance {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'connecting';
  token: string;
  phoneConnected: string;
  profileName: string;
  systemName: string;
  adminFields: {
    adminField01: string;
    adminField02: string;
  };
}

export function InstancesPage() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCode, setQRCode] = useState<string | null>(null);
  const [pairCode, setPairCode] = useState<string | null>(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadInstances();
      // Poll for updates every 5 seconds
      const interval = setInterval(loadInstances, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    if (selectedInstanceId) {
      const instance = instances.find(i => i.id === selectedInstanceId);
      if (instance?.status === 'connected') {
        setShowQRCode(false);
        setQRCode(null);
        setPairCode(null);
        setSelectedInstanceId(null);
        toast.success('WhatsApp conectado com sucesso!');
      }
    }
  }, [instances, selectedInstanceId]);

  const loadInstances = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      if (!isRefreshing) {
        setIsRefreshing(true);
        
        console.log('🔐 Carregando instâncias...');
        console.log('👤 Email do usuário:', user.email);
        console.log('🔑 Admin email:', ADMIN_EMAIL);
        console.log('✅ É admin?', user.email === ADMIN_EMAIL);
        
        let data: any[] = [];
        
        // REGRA ESPECIAL: rafael@i9place.com.br vê TODAS as instâncias
        if (user.email === ADMIN_EMAIL) {
          console.log('👑 Usuário admin - Carregando TODAS as instâncias via sync completo');
          
          // Sincronizar com a API UAZAPI e Supabase
          data = await syncAllInstancesForAdmin();
          
          console.log(`📊 Total de instâncias sincronizadas: ${data?.length || 0}`);
        } else {
          // Usuários normais: apenas suas instâncias (RLS automático)
          console.log('👤 Usuário normal - Carregando apenas instâncias próprias');
          data = await syncInstancesStatus(user.id);
        }
        
        // Converter para formato esperado
        const formattedInstances: Instance[] = data.map(instance => ({
          id: instance.id,
          name: instance.name,
          status: instance.status,
          token: instance.token,
          phoneConnected: instance.phone_connected || '',
          profileName: instance.name,
          systemName: instance.name,
          adminFields: {
            adminField01: '',
            adminField02: ''
          }
        }));
        
        console.log(`✅ ${formattedInstances.length} instâncias carregadas`);
        setInstances(formattedInstances);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar instâncias:', error);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  const handleCreateInstance = async (data: any) => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }

    try {
      const config = getCurrentServerConfig();
      
      console.log('🔧 Criando instância na API UAZAPI...');
      const response = await fetch(`${config.url}/instance/init`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'admintoken': config.adminToken
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao criar instância');
      }

      const responseData = await response.json();
      console.log('✅ Instância criada na API:', responseData);

      // SEGURANÇA CRÍTICA: Registrar instância no Supabase com user_id
      console.log('🔐 Registrando instância no Supabase...');
      const supabaseInstance = await registerInstanceInSupabase({
        id: responseData.instance?.id || responseData.id,
        name: data.instanceName || data.name,
        token: responseData.instance?.token || responseData.token,
        user_id: user.id, // CRÍTICO: Vincular ao usuário
        phone_connected: responseData.instance?.phoneConnected,
        status: responseData.instance?.state === 'open' ? 'connected' : 'disconnected'
      });

      if (!supabaseInstance) {
        console.error('❌ Falha ao registrar no Supabase');
        toast.error('Instância criada mas não registrada no sistema. Entre em contato com suporte.');
      } else {
        console.log('✅ Instância registrada no Supabase com sucesso');
      }

      // Se a instância foi criada com sucesso e tem QR code, mostra o modal
      if (responseData.instance?.qrcode) {
        setQRCode(responseData.instance.qrcode);
        setShowQRCode(true);
      }

      toast.success('Instância criada com sucesso!');
      setShowModal(false);
      await loadInstances();
    } catch (error) {
      console.error('❌ Erro ao criar instância:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar instância');
    }
  };

  const handleGenerateQRCode = async (instanceId: string, phone?: string) => {
    try {
      const instance = instances.find(i => i.id === instanceId);
      
      if (!instance) {
        toast.error('Instância não encontrada');
        return;
      }

      // Primeiro abrimos o modal e definimos a instância selecionada
      setSelectedInstanceId(instanceId);
      setShowQRCode(true);
      setQRCode(null);
      setPairCode(null);

      // Verificamos o status da instância
      const config = getCurrentServerConfig();
      const statusResponse = await fetch(`${config.url}/instance/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'token': instance.token
        }
      });

      if (!statusResponse.ok) {
        const errorData = await statusResponse.json();
        throw new Error(errorData.message || 'Falha ao verificar status da instância');
      }

      const statusData = await statusResponse.json();
      
      // Se já estiver conectado, mostra mensagem apropriada
      if (statusData.status === 'connected') {
        toast.success('Esta instância já está conectada!');
        setShowQRCode(false);
        setSelectedInstanceId(null);
        return;
      }

      // Tentamos gerar o QR code
      const response = await fetch(`${config.url}/instance/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': instance.token
        },
        body: phone ? JSON.stringify({ phone }) : undefined
      });

      // Se receber 409, significa que já está em processo de conexão
      if (response.status === 409) {
        toast.error('Instância já está em processo de conexão. Aguarde um momento e tente novamente.');
        setShowQRCode(false);
        setSelectedInstanceId(null);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao gerar QR Code');
      }

      const data = await response.json();
      console.log('QR Code response:', data); // Log para debug

      if (data.instance?.qrcode) {
        setQRCode(data.instance.qrcode);
      }
      
      if (data.instance?.paircode) {
        setPairCode(data.instance.paircode);
      }

      if (!data.instance?.qrcode && !data.instance?.paircode) {
        toast.error('Nenhum código de conexão disponível');
        setShowQRCode(false);
        setSelectedInstanceId(null);
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar QR Code');
      setShowQRCode(false);
      setSelectedInstanceId(null);
    }
  };

  const handlePairCode = async (code: string) => {
    try {
      if (!selectedInstanceId) {
        toast.error('Instância não selecionada');
        return;
      }

      const instance = instances.find(i => i.id === selectedInstanceId);
      
      if (!instance) {
        toast.error('Instância não encontrada');
        return;
      }

      const config = getCurrentServerConfig();
      const response = await fetch(`${config.url}/instance/pair`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': instance.token
        },
        body: JSON.stringify({ code })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao parear por código');
      }

      toast.success('Dispositivo pareado com sucesso!');
      setShowQRCode(false);
      await loadInstances();
    } catch (error) {
      console.error('Error pairing with code:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao parear por código');
    }
  };

  const handleDisconnect = async (instanceId: string) => {
    try {
      const instance = instances.find(i => i.id === instanceId);
      
      if (!instance) {
        toast.error('Instância não encontrada');
        return;
      }

      const config = getCurrentServerConfig();
      
      console.log('🔌 Desconectando instância da API...');
      const response = await fetch(`${config.url}/instance/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'token': instance.token
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao desconectar instância');
      }

      console.log('✅ Instância desconectada da API');

      // Atualizar status no Supabase
      console.log('🔐 Atualizando status no Supabase...');
      await updateInstanceInSupabase(instanceId, {
        status: 'disconnected',
        phone_connected: ''
      });

      toast.success('Instância desconectada com sucesso!');
      setShowDisconnectConfirm(null);
      await loadInstances();
    } catch (error) {
      console.error('❌ Erro ao desconectar instância:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao desconectar instância');
    }
  };

  const handleDelete = async (instanceId: string) => {
    try {
      const instance = instances.find(i => i.id === instanceId);
      
      if (!instance || instance.status !== 'disconnected') {
        toast.error('Só é possível excluir instâncias desconectadas');
        return;
      }

      const config = getCurrentServerConfig();
      
      console.log('🗑️ Deletando instância da API...');
      const response = await fetch(`${config.url}/instance`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'token': instance.token
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao excluir instância');
      }

      const responseData = await response.json();
      console.log('✅ Instância deletada da API:', responseData);

      // SEGURANÇA: Remover do Supabase
      console.log('🔐 Removendo instância do Supabase...');
      const deleted = await deleteInstanceFromSupabase(instanceId);
      
      if (!deleted) {
        console.warn('⚠️ Falha ao remover do Supabase');
      } else {
        console.log('✅ Instância removida do Supabase');
      }

      toast.success('Instância excluída com sucesso!');
      setShowDeleteConfirm(null);
      await loadInstances();
    } catch (error) {
      console.error('❌ Erro ao deletar instância:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir instância');
    }
  };

  const filteredInstances = instances.filter(instance =>
    instance.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Instâncias</h1>
            <p className="mt-1 text-sm text-gray-500">
              Gerencie suas instâncias do WhatsApp
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => loadInstances()}
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
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Nova Instância
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar instâncias..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary-100 flex items-center justify-center">
              <Phone className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total de Instâncias</p>
              <p className="text-2xl font-semibold text-gray-900">{instances.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
              <Phone className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Conectadas</p>
              <p className="text-2xl font-semibold text-gray-900">
                {instances.filter(i => i.status === 'connected').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Phone className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Conectando</p>
              <p className="text-2xl font-semibold text-gray-900">
                {instances.filter(i => i.status === 'connecting').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
              <Phone className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Desconectadas</p>
              <p className="text-2xl font-semibold text-gray-900">
                {instances.filter(i => i.status === 'disconnected').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Instances Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredInstances.length === 0 ? (
          <div className="col-span-full bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <Phone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma instância encontrada
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm 
                ? 'Nenhuma instância corresponde à sua busca'
                : 'Clique em "Nova Instância" para começar'
              }
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nova Instância
            </button>
          </div>
        ) : (
          filteredInstances.map((instance) => (
            <InstanceCard
              key={instance.id}
              instance={instance}
              onGenerateQR={() => handleGenerateQRCode(instance.id)}
              onDisconnect={() => setShowDisconnectConfirm(instance.id)}
              onDelete={() => setShowDeleteConfirm(instance.id)}
            />
          ))
        )}
      </div>

      {/* Modals */}
      <InstanceModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleCreateInstance}
      />

      <QRCodeModal
        isOpen={showQRCode}
        onClose={() => {
          setShowQRCode(false);
          setQRCode(null);
          setPairCode(null);
          setSelectedInstanceId(null);
        }}
        qrCode={qrCode}
        pairCode={pairCode}
        onPairCode={handlePairCode}
        onGenerateWithPhone={async (phone) => {
          if (selectedInstanceId) {
            await handleGenerateQRCode(selectedInstanceId, phone);
          } else {
            toast.error('Nenhuma instância selecionada');
          }
        }}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(null)} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Confirmar exclusão
                </h3>
                <p className="text-sm text-gray-500">
                  Tem certeza que deseja excluir esta instância? Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disconnect Confirmation Modal */}
      {showDisconnectConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowDisconnectConfirm(null)} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Confirmar desconexão
                </h3>
                <p className="text-sm text-gray-500">
                  Tem certeza que deseja desconectar esta instância? Será necessário escanear o QR Code novamente para reconectar.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDisconnectConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDisconnect(showDisconnectConfirm)}
                className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg"
              >
                Desconectar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}