import { useState, useEffect } from 'react';
import { X, Search, Check, AlertTriangle } from 'lucide-react';
import { uazapiService, Contact } from '../../services/uazapiService';
import { toast } from 'react-hot-toast';

interface ContactSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (contacts: Contact[]) => void;
  instanceToken: string;
  selectedContacts: Contact[];
}

export function ContactSelectionModal({
  isOpen,
  onClose,
  onSelect,
  instanceToken,
  selectedContacts
}: ContactSelectionModalProps) {
  // Estado
  const [searchTerm, setSearchTerm] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Contact[]>(selectedContacts);

  // Estado de erro
  const [error, setError] = useState<string | null>(null);

  // Carregar contatos da API
  useEffect(() => {
    if (isOpen && instanceToken) {
      loadContacts();
    }
  }, [isOpen, instanceToken]);

  // Resetar seleção baseado nas props
  useEffect(() => {
    setSelected(selectedContacts);
  }, [selectedContacts]);

  const loadContacts = async () => {
    setLoading(true);
    setError(null);
    try {
      // Buscar contatos reais da API UAZAPI
      const contactsData = await uazapiService.getContacts(instanceToken);
      setContacts(contactsData);
      
      if (contactsData.length === 0) {
        setError('Nenhum contato encontrado. Verifique se existem contatos salvos nesta instância.');
      }
    } catch (error) {
      console.error('Erro ao carregar contatos:', error);
      setError('Não foi possível carregar os contatos. Tente novamente.');
      toast.error('Erro ao carregar contatos');
    } finally {
      setLoading(false);
    }
  };

  const toggleContactSelection = (contact: Contact) => {
    if (selected.some(c => c.id === contact.id)) {
      setSelected(selected.filter(c => c.id !== contact.id));
    } else {
      setSelected([...selected, contact]);
    }
  };

  const handleConfirm = () => {
    onSelect(selected);
    onClose();
  };

  const handleSelectAll = () => {
    if (filteredContacts.length === selected.length) {
      // Se todos já estão selecionados, desmarcar todos
      setSelected([]);
    } else {
      // Caso contrário, selecionar todos os filtrados
      const allContactIds = new Set(filteredContacts.map(c => c.id));
      const currentlySelected = selected.filter(c => !allContactIds.has(c.id));
      setSelected([...currentlySelected, ...filteredContacts]);
    }
  };

  // Filtrar contatos com base na busca
  const filteredContacts = contacts.filter(contact => 
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    contact.number.includes(searchTerm)
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Selecionar Contatos</h2>
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
              placeholder="Buscar contatos por nome ou número..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center justify-between mt-3">
            <div className="text-sm text-gray-500">
              {selected.length} contatos selecionados
            </div>
            <button
              onClick={handleSelectAll}
              className="text-sm font-medium text-primary-600 hover:text-primary-800"
            >
              {filteredContacts.length === selected.length 
                ? 'Desmarcar Todos' 
                : 'Selecionar Todos'}
            </button>
          </div>
        </div>

        {/* Contact List */}
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
              <h3 className="text-lg font-medium text-gray-900 mb-1">Erro ao carregar contatos</h3>
              <p className="text-gray-500">{error}</p>
              <button 
                onClick={loadContacts}
                className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          ) : filteredContacts.length > 0 ? (
            <div className="grid grid-cols-1 gap-2">
              {filteredContacts.map(contact => (
                <div 
                  key={contact.id}
                  onClick={() => toggleContactSelection(contact)}
                  className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between ${
                    selected.some(c => c.id === contact.id)
                      ? 'bg-primary-50 border-primary-200'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="font-medium truncate">{contact.name || 'Sem nome'}</div>
                    <div className="text-sm text-gray-500">{contact.number}</div>
                    <div className="text-xs text-gray-400 truncate">{contact.jid}</div>
                  </div>
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                    selected.some(c => c.id === contact.id)
                      ? 'bg-primary-600 text-white'
                      : 'border border-gray-300'
                  }`}>
                    {selected.some(c => c.id === contact.id) && (
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
              <h3 className="text-lg font-medium text-gray-900 mb-1">Nenhum contato encontrado</h3>
              <p className="text-gray-500">Tente outro termo de busca ou sincronize seus contatos.</p>
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
