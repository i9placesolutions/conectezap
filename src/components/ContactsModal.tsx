import React, { useState, useEffect } from 'react';
import { X, Search, UserPlus, UserMinus, Phone, Mail } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Avatar } from './ui/Avatar';

interface Contact {
  id: string;
  name: string;
  phone: string;
  profileImage?: string;
  isBlocked?: boolean;
}

interface ContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: Contact[];
  onLoadContacts: () => void;
  onBlockContact: (contactId: string) => void;
  onUnblockContact: (contactId: string) => void;
  loading: boolean;
}

export function ContactsModal({
  isOpen,
  onClose,
  contacts,
  onLoadContacts,
  onBlockContact,
  onUnblockContact,
  loading
}: ContactsModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);

  useEffect(() => {
    if (isOpen) {
      onLoadContacts();
    }
  }, [isOpen, onLoadContacts]);

  useEffect(() => {
    const filtered = contacts.filter(contact =>
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.phone.includes(searchTerm)
    );
    setFilteredContacts(filtered);
  }, [contacts, searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Gerenciar Contatos</h2>
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
              placeholder="Buscar contatos..."
              className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto max-h-96">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="p-8 text-center">
              <div className="rounded-full bg-gray-100 h-16 w-16 flex items-center justify-center mx-auto mb-4">
                <Phone className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500 mb-2">Nenhum contato encontrado</p>
              <button
                onClick={onLoadContacts}
                className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                Atualizar
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredContacts.map((contact) => (
                <div key={contact.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <Avatar
                      src={contact.profileImage?.includes('pps.whatsapp.net') ? undefined : contact.profileImage}
                          alt={contact.name}
                      name={contact.name}
                      size="lg"
                    />
                    <div>
                      <h3 className="font-medium text-gray-900">{contact.name}</h3>
                      <p className="text-sm text-gray-500">{contact.phone}</p>
                      {contact.isBlocked && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Bloqueado
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {contact.isBlocked ? (
                      <button
                        onClick={() => onUnblockContact(contact.id)}
                        className="flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 text-sm"
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Desbloquear
                      </button>
                    ) : (
                      <button
                        onClick={() => onBlockContact(contact.id)}
                        className="flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm"
                      >
                        <UserMinus className="h-4 w-4 mr-1" />
                        Bloquear
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {filteredContacts.length} contato(s) encontrado(s)
            </span>
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