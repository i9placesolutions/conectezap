import { useState, useEffect } from 'react';
import { X, Search, Check, Users, AlertTriangle } from 'lucide-react';
import { uazapiService, Group } from '../../services/uazapiService';
import { toast } from 'react-hot-toast';

interface GroupSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (groups: Group[]) => void;
  instanceToken: string;
  selectedGroups: Group[];
}

export function GroupSelectionModal({
  isOpen,
  onClose,
  onSelect,
  instanceToken,
  selectedGroups
}: GroupSelectionModalProps) {
  // Estado
  const [searchTerm, setSearchTerm] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Group[]>(selectedGroups);

  // Estado de erro
  const [error, setError] = useState<string | null>(null);

  // Carregar grupos da API
  useEffect(() => {
    if (isOpen && instanceToken) {
      loadGroups();
    }
  }, [isOpen, instanceToken]);

  // Resetar seleção baseado nas props
  useEffect(() => {
    setSelected(selectedGroups);
  }, [selectedGroups]);

  const loadGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      // Buscar grupos reais da API UAZAPI
      const groupsData = await uazapiService.getGroups(instanceToken, true);
      setGroups(groupsData);
      
      if (groupsData.length === 0) {
        setError('Nenhum grupo encontrado. Verifique se existem grupos nesta instância.');
      }
    } catch (error) {
      console.error('Erro ao carregar grupos:', error);
      setError('Não foi possível carregar os grupos. Tente novamente.');
      toast.error('Erro ao carregar grupos');
    } finally {
      setLoading(false);
    }
  };

  const toggleGroupSelection = (group: Group) => {
    if (selected.some(g => g.id === group.id)) {
      setSelected(selected.filter(g => g.id !== group.id));
    } else {
      setSelected([...selected, group]);
    }
  };

  const handleConfirm = () => {
    onSelect(selected);
    onClose();
  };

  const handleSelectAll = () => {
    if (filteredGroups.length === selected.length) {
      // Se todos já estão selecionados, desmarcar todos
      setSelected([]);
    } else {
      // Caso contrário, selecionar todos os filtrados
      const allGroupIds = new Set(filteredGroups.map(g => g.id));
      const currentlySelected = selected.filter(g => !allGroupIds.has(g.id));
      setSelected([...currentlySelected, ...filteredGroups]);
    }
  };

  // Filtrar grupos com base na busca
  const filteredGroups = groups.filter(group => 
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Selecionar Grupos</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Buscar grupos por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center justify-between mt-3">
            <div className="text-sm text-gray-500">
              {selected.length} grupos selecionados
            </div>
            <button
              onClick={handleSelectAll}
              className="text-sm font-medium text-primary-600 hover:text-primary-800"
            >
              {filteredGroups.length === selected.length 
                ? 'Desmarcar Todos' 
                : 'Selecionar Todos'}
            </button>
          </div>
        </div>

        {/* Group List */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="text-amber-500 mb-2">
                <AlertTriangle className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Erro ao carregar grupos</h3>
              <p className="text-gray-500">{error}</p>
              <button 
                onClick={loadGroups}
                className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          ) : filteredGroups.length > 0 ? (
            <div className="grid grid-cols-1 gap-2">
              {filteredGroups.map(group => (
                <div 
                  key={group.id}
                  onClick={() => toggleGroupSelection(group)}
                  className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between ${
                    selected.some(g => g.id === group.id)
                      ? 'bg-primary-50 border-primary-200'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-primary-100 mr-3 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary-600" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="font-medium truncate">{group.name || 'Sem nome'}</div>
                      <div className="text-sm text-gray-500">{group.participantsCount} participantes</div>
                      <div className="text-xs text-gray-400 truncate">{group.jid}</div>
                    </div>
                  </div>
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                    selected.some(g => g.id === group.id)
                      ? 'bg-primary-600 text-white'
                      : 'border border-gray-300'
                  }`}>
                    {selected.some(g => g.id === group.id) && (
                      <Check className="h-4 w-4" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="text-gray-400 mb-2">
                <Search className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhum grupo encontrado</h3>
              <p className="text-gray-500">Tente outro termo de busca ou sincronize seus grupos.</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-colors mr-2"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
