import { useState, useEffect } from 'react';
import { X, RefreshCw, Plus, Smartphone, Copy } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { chat } from '../../lib/wapi/api';
import { CreateInstanceModal } from './CreateInstanceModal';
import { cn } from '../../lib/utils';
import { useInstance } from '../../contexts/InstanceContext';

interface Instance {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'connecting';
  token: string;
  chats?: Chat[];
}

interface APIChat {
  id?: string;
  jid?: string;
  name?: string;
  subject?: string;
  pushname?: string;
  profilePicture?: string;
  profilePic?: string;
  imgUrl?: string;
  isGroup?: boolean;
  participants?: any[];
  unreadCount?: number;
  lastMessage?: any;
}

interface Chat {
  id: string;
  name: string;
  profileImage?: string;
  isGroup: boolean;
  participants: any[];
  unreadCount: number;
  lastMessage: any;
}

interface SelectInstanceModalProps {
  onClose: () => void;
  onSelect: (instance: Instance) => void;
}

export function SelectInstanceModal({ onClose, onSelect }: SelectInstanceModalProps) {
  const { instances: contextInstances } = useInstance();
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadInstances();
  }, [contextInstances]);

  const loadInstances = async () => {
    try {
      setLoading(true);
      
      // Usar instâncias do contexto (que já respeitam as regras de admin)
      console.log('📋 Carregando instâncias do contexto para modal');
      console.log(`📊 Total de instâncias disponíveis: ${contextInstances.length}`);
      
      // Converter formato do contexto para o formato esperado pelo modal
      const formattedInstances = contextInstances.map(inst => ({
        id: inst.id,
        name: inst.name,
        status: inst.status,
        token: inst.token || '',
        chats: []
      }));
      
      setInstances(formattedInstances);
    } catch (error) {
      console.error('Erro ao carregar instâncias:', error);
      toast.error('Erro ao carregar instâncias');
    } finally {
      setLoading(false);
    }
  };

  const handleInstanceSelect = async (instance: Instance) => {
    try {
      setLoading(true);
      
      // Verificar se a instância está conectada
      if (instance.status !== 'connected') {
        toast.error('Esta instância não está conectada. Por favor, conecte-a primeiro.');
        return;
      }

      console.log('Iniciando carregamento de chats para a instância:', instance.id);

      // Carregar chats
      const chatsResponse = await chat.getAll(instance.id, instance.token);
      console.log('Chats carregados:', chatsResponse);

      // Verificar se chatsResponse é válido e tem a propriedade chats
      if (!chatsResponse || !Array.isArray(chatsResponse.chats)) {
        console.error('Formato de resposta inválido para chats:', chatsResponse);
        toast.error('Erro ao carregar chats: formato de resposta inválido');
        return;
      }

      // Combinar chats
      const allChats = await Promise.all(
        chatsResponse.chats.map(async (chatItem: APIChat) => {
          const chatId = chatItem.id || chatItem.jid || '';
          let profileInfo = null;

          try {
            if (chatId) {
              // Extrair o número do ID do chat
              const chatNumber = chatId.split('@')[0];
              profileInfo = await chat.getNameAndImageURL(instance.id, chatNumber, instance.token);
              console.log('Perfil carregado para', chatId, ':', profileInfo);
            }
          } catch (error) {
            console.error(`Erro ao carregar perfil para ${chatId}:`, error);
          }

          const chatData = {
            id: chatId,
            name: chatItem.name || chatItem.subject || chatItem.pushname || profileInfo?.name || 'Sem nome',
            profileImage: chatItem.profilePicture || chatItem.profilePic || chatItem.imgUrl || profileInfo?.imageUrl || '',
            isGroup: Boolean(chatItem.isGroup || (chatId && chatId.includes('g.us'))),
            participants: chatItem.participants || [],
            unreadCount: chatItem.unreadCount || 0,
            lastMessage: chatItem.lastMessage || null
          };

          console.log('Chat processado:', chatData);
          return chatData;
        })
      );

      console.log('Todos os chats processados:', allChats);

      // Atualizar a instância com os chats carregados
      const updatedInstance = {
        ...instance,
        chats: allChats
      };

      // Chamar onSelect com a instância atualizada
      onSelect(updatedInstance);
      
      toast.success('Instância selecionada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao carregar dados da instância:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erro desconhecido';
      toast.error(`Erro ao carregar dados da instância: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Selecione uma Instância
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mb-4 flex justify-between">
            <button 
              onClick={loadInstances}
              className="text-sm flex items-center px-3 py-1 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              <RefreshCw size={16} className={cn("mr-2", { "animate-spin": loading })} />
              Atualizar
            </button>
            
            <button 
              onClick={() => setShowCreateModal(true)}
              className="text-sm flex items-center px-3 py-1 rounded-md bg-green-600 text-white hover:bg-green-700"
              disabled={loading}
            >
              <Plus size={16} className="mr-2" />
              Nova Instância
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-green-600 border-t-transparent rounded-full" />
            </div>
          ) : instances.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Nenhuma instância disponível</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {instances.map((instance) => (
                <button
                  key={instance.id}
                  onClick={() => handleInstanceSelect(instance)}
                  className="w-full p-4 rounded-lg border text-left transition-colors border-green-200 hover:bg-gray-50"
                  disabled={loading}
                >
                  <div className="flex items-center">
                    <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                      <Smartphone className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{instance.name}</h3>
                      <div className="flex items-center mt-1">
                        <span className={`inline-block h-2 w-2 rounded-full mr-2 ${
                          instance.status === 'connected' ? 'bg-green-500' :
                          instance.status === 'connecting' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`} />
                        <span className="text-sm text-gray-500">
                          {instance.status === 'connected' ? 'Conectado' :
                           instance.status === 'connecting' ? 'Conectando...' :
                           'Desconectado'}
                        </span>
                      </div>
                    </div>
                    
                    <div 
                      className="p-2 text-gray-400 hover:text-gray-600 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(instance.id);
                        toast.success('ID copiado para a área de transferência');
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateInstanceModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadInstances();
          }}
        />
      )}
    </>
  );
}