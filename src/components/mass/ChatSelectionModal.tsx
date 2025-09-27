import { useState, useEffect } from 'react';
import { X, Search, Check, AlertTriangle, MessageCircle, Users } from 'lucide-react';
import { uazapiService, Chat } from '../../services/uazapiService';

interface ChatSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (chats: Chat[]) => void;
  instanceToken: string;
  selectedChats: Chat[];
}

export function ChatSelectionModal({
  isOpen,
  onClose,
  onSelect,
  instanceToken,
  selectedChats
}: ChatSelectionModalProps) {
  // Estado
  const [searchTerm, setSearchTerm] = useState('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Chat[]>(selectedChats);

  // Estado de erro
  const [error, setError] = useState<string | null>(null);

  // Carregar chats da API
  useEffect(() => {
    console.log('🔄 ChatSelectionModal useEffect:', { isOpen, instanceToken });
    if (isOpen && instanceToken) {
      loadChats();
    }
  }, [isOpen, instanceToken]);

  // Resetar seleção baseado nas props
  useEffect(() => {
    setSelected(selectedChats);
  }, [selectedChats]);

  const loadChats = async () => {
    if (!instanceToken) {
      console.warn('⚠️ Token da instância não encontrado');
      return;
    }

    console.log('🚀 Iniciando carregamento de chats com token:', instanceToken.substring(0, 10) + '...');
    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Iniciando busca de TODOS os chats (individuais + grupos)...');
      
      // Verificar se instanceToken está válido
      if (!instanceToken) {
        setError('Token da instância não encontrado.');
        return;
      }
      console.log('🔑 Token da instância:', instanceToken.substring(0, 10) + '...');
      
      // Buscar TODOS os chats sem limite
      console.log('🔍 Buscando TODOS os chats disponíveis...');
      console.log('🔍 Filtros aplicados: {} (sem filtros)');
      
      const startTime = Date.now();
      const allChatsResult = await uazapiService.getAllChats(instanceToken, {});
      const endTime = Date.now();
      
      const individualChats = allChatsResult.filter(chat => !chat.isGroup);
       const groupChats = allChatsResult.filter(chat => chat.isGroup);
      
      console.log('✅ BUSCA COMPLETA!');
      console.log('📊 Total de chats encontrados:', allChatsResult.length);
      console.log('📊 Chats individuais:', individualChats.length);
      console.log('📊 Grupos:', groupChats.length);
      console.log('⏱️ Tempo de busca:', (endTime - startTime) / 1000, 'segundos');
      console.log('📋 Primeiros 3 chats:', allChatsResult.slice(0, 3));
      
      if (allChatsResult.length < 1000) {
        console.warn('⚠️ ATENÇÃO: Menos de 1000 chats encontrados. Esperado: 1500+');
      }
      
      setChats(allChatsResult);
    } catch (error) {
      console.error('❌ Erro ao carregar chats:', error);
      setError('Erro ao carregar chats. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const toggleChatSelection = (chat: Chat) => {
    if (selected.some(c => c.id === chat.id)) {
      setSelected(selected.filter(c => c.id !== chat.id));
    } else {
      setSelected([...selected, chat]);
    }
  };

  const handleConfirm = () => {
    onSelect(selected);
    onClose();
  };

  const handleSelectAll = () => {
    if (filteredChats.length === selected.length) {
      // Se todos já estão selecionados, desmarcar todos
      setSelected([]);
    } else {
      // Caso contrário, selecionar todos os filtrados
      const allChatIds = new Set(filteredChats.map(c => c.id));
      const currentlySelected = selected.filter(c => !allChatIds.has(c.id));
      setSelected([...currentlySelected, ...filteredChats]);
    }
  };

  // Filtrar chats com base na busca
  const filteredChats = chats.filter(chat => 
    chat.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    chat.id.includes(searchTerm)
  );

  if (!isOpen) return null;

  console.log('🎭 ChatSelectionModal renderizando:', { 
    isOpen, 
    instanceToken: instanceToken ? 'presente' : 'ausente',
    chatsCount: chats.length,
    loading,
    error 
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Selecionar Chats</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nome ou número..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-3 border-b border-gray-200 flex justify-between items-center">
          <button
            onClick={handleSelectAll}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            {filteredChats.length === selected.length ? 'Desmarcar todos' : 'Selecionar todos'}
          </button>
          <span className="text-sm text-gray-500">
            {selected.length} de {filteredChats.length} selecionados
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <span className="text-gray-600 font-medium">Buscando todos os chats...</span>
              <span className="text-sm text-gray-500 mt-2">Isso pode levar alguns segundos</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <AlertTriangle className="text-red-500 mb-4" size={48} />
              <p className="text-red-600 text-center mb-4">{error}</p>
              <button
                onClick={loadChats}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <MessageCircle className="text-gray-400 mb-4" size={48} />
              <p className="text-gray-500 text-center">
                {searchTerm ? 'Nenhum chat encontrado com esse termo' : 'Nenhum chat disponível'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredChats.map((chat) => {
                const isSelected = selected.some(c => c.id === chat.id);
                return (
                  <div
                    key={chat.id}
                    onClick={() => toggleChatSelection(chat)}
                    className={`px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          {chat.isGroup ? (
                            <Users className="text-green-600" size={20} />
                          ) : (
                            <MessageCircle className="text-blue-600" size={20} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {chat.name}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {chat.id}
                          </p>
                          {chat.unreadCount > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              {chat.unreadCount} não lidas
                            </span>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="text-blue-600" size={20} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={selected.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Confirmar ({selected.length})
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatSelectionModal;