import { useState, useEffect } from 'react';
import { X, Search, UserPlus, Shield, AlertTriangle } from 'lucide-react';
import { Avatar } from './ui/Avatar';
import { uazapiService } from '../services/uazapiService';

interface BlockedContact {
  id: string;
  name: string;
  phone: string;
  profileImage?: string;
  blockedAt?: string;
}

interface BlocksModalProps {
  isOpen: boolean;
  onClose: () => void;
  blockedContacts: BlockedContact[];
  onLoadBlockedContacts: () => void;
  onUnblockContact: (contactId: string) => void;
  loading: boolean;
}

export function BlocksModal({
  isOpen,
  onClose,
  blockedContacts,
  onLoadBlockedContacts,
  onUnblockContact,
  loading
}: BlocksModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredContacts, setFilteredContacts] = useState<BlockedContact[]>([]);

  useEffect(() => {
    if (isOpen) {
      onLoadBlockedContacts();
    }
  }, [isOpen, onLoadBlockedContacts]);

  useEffect(() => {
    const filtered = blockedContacts.filter(contact =>
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.phone.includes(searchTerm)
    );
    setFilteredContacts(filtered);
  }, [blockedContacts, searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-red-600" />
            <h2 className="text-lg font-semibold">Contatos Bloqueados</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar contatos bloqueados..."
              className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto max-h-96">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-red-600 border-t-transparent rounded-full" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="p-8 text-center">
              <div className="rounded-full bg-gray-100 h-16 w-16 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500 mb-2">
                {searchTerm ? 'Nenhum contato bloqueado encontrado' : 'Nenhum contato bloqueado'}
              </p>
              <button
                onClick={onLoadBlockedContacts}
                className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
              >
                Atualizar
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredContacts.map((contact) => (
                <div key={contact.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar
                        src={uazapiService.getProxiedImageUrl(contact.profileImage || '')}
                          alt={contact.name}
                        name={contact.name}
                        size="lg"
                        />
                      <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-1">
                        <Shield className="h-3 w-3 text-white" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{contact.name}</h3>
                      <p className="text-sm text-gray-500">{contact.phone}</p>
                      {contact.blockedAt && (
                        <p className="text-xs text-gray-400">
                          Bloqueado em {new Date(contact.blockedAt).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        if (window.confirm(`Tem certeza que deseja desbloquear ${contact.name}?`)) {
                          onUnblockContact(contact.id);
                        }
                      }}
                      className="flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 text-sm"
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Desbloquear
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span>
                {filteredContacts.length} contato(s) bloqueado(s)
              </span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}