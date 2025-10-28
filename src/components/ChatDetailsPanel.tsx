import { X, User, Mail, Phone, Building2, Tag, Calendar, Shield, Users, CheckCircle2, XCircle, Info } from 'lucide-react';
import { cn } from '../lib/utils';

interface ChatDetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  chatDetails: any;
  loading: boolean;
}

export function ChatDetailsPanel({ isOpen, onClose, chatDetails, loading }: ChatDetailsPanelProps) {
  if (!isOpen) return null;

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString('pt-BR');
  };

  const formatBoolean = (value?: boolean) => {
    if (value === undefined || value === null) return 'N/A';
    return value ? 'Sim' : 'Não';
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l border-gray-200 z-40 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900">Detalhes do Contato</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">Carregando detalhes...</p>
        </div>
      )}

      {/* Content */}
      {!loading && chatDetails && (
        <div className="p-4 space-y-6">
          {/* Foto de Perfil */}
          {chatDetails.image && (
            <div className="flex justify-center">
              <img
                src={chatDetails.image}
                alt={chatDetails.name}
                className="w-32 h-32 rounded-full object-cover border-4 border-gray-100"
              />
            </div>
          )}

          {/* Nome Principal */}
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-900">{chatDetails.name || chatDetails.wa_name || 'Sem nome'}</h3>
            {chatDetails.wa_verifiedName && (
              <div className="flex items-center justify-center gap-1 mt-1">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600">Verificado</span>
              </div>
            )}
          </div>

          {/* Tipo de Conta */}
          {(chatDetails.wa_isBusiness || chatDetails.wa_isEnterprise) && (
            <div className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                {chatDetails.wa_isEnterprise ? 'Conta Empresarial' : 'Conta Business'}
              </span>
            </div>
          )}

          {/* Grupo */}
          {chatDetails.wa_isGroup && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-purple-600" />
                <span className="font-medium text-purple-900">Informações do Grupo</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Administrador:</span>
                  <span className="text-gray-900">{formatBoolean(chatDetails.wa_isGroup_admin)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Apenas admins postam:</span>
                  <span className="text-gray-900">{formatBoolean(chatDetails.wa_isGroup_announce)}</span>
                </div>
                {chatDetails.wa_group_description && (
                  <div className="mt-2 pt-2 border-t border-purple-200">
                    <p className="text-xs text-gray-600">Descrição:</p>
                    <p className="text-sm text-gray-900 mt-1">{chatDetails.wa_group_description}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Informações de Contato */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-gray-900 mb-3">Informações de Contato</h4>
            
            {chatDetails.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-gray-400" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Telefone</p>
                  <p className="text-sm text-gray-900 font-medium">{chatDetails.phone}</p>
                </div>
              </div>
            )}

            {chatDetails.wa_contactName && (
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-gray-400" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Nome no WhatsApp</p>
                  <p className="text-sm text-gray-900">{chatDetails.wa_contactName}</p>
                </div>
              </div>
            )}

            {chatDetails.lead_email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gray-400" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm text-gray-900">{chatDetails.lead_email}</p>
                </div>
              </div>
            )}
          </div>

          {/* Status do Lead */}
          {chatDetails.lead_status && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Status do Lead</h4>
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary-600" />
                <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                  {chatDetails.lead_status}
                </span>
              </div>
            </div>
          )}

          {/* Campos Customizáveis do Lead */}
          {Object.keys(chatDetails).filter(key => key.startsWith('lead_field') && chatDetails[key]).length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Informações Adicionais</h4>
              <div className="space-y-2">
                {Object.keys(chatDetails)
                  .filter(key => key.startsWith('lead_field') && chatDetails[key])
                  .map(key => {
                    const fieldNumber = key.replace('lead_field', '');
                    return (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-gray-600">Campo {fieldNumber}:</span>
                        <span className="text-gray-900 font-medium">{chatDetails[key]}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Configurações */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Configurações</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Arquivado:</span>
                <span className={cn(
                  "font-medium",
                  chatDetails.wa_archived ? "text-orange-600" : "text-gray-900"
                )}>
                  {formatBoolean(chatDetails.wa_archived)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Bloqueado:</span>
                <span className={cn(
                  "font-medium",
                  chatDetails.wa_isBlocked ? "text-red-600" : "text-gray-900"
                )}>
                  {formatBoolean(chatDetails.wa_isBlocked)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Fixado:</span>
                <span className="text-gray-900">{formatBoolean(chatDetails.wa_isPinned)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Mensagens não lidas:</span>
                <span className="text-gray-900 font-medium">{chatDetails.wa_unreadCount || 0}</span>
              </div>
            </div>
          </div>

          {/* Chatbot */}
          {chatDetails.chatbot_summary && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-5 w-5 text-purple-600" />
                <h4 className="font-semibold text-purple-900">Chatbot</h4>
              </div>
              <p className="text-sm text-gray-700">{chatDetails.chatbot_summary}</p>
              {chatDetails.chatbot_lastTrigger_id && (
                <p className="text-xs text-gray-500 mt-2">
                  Último trigger: {chatDetails.chatbot_lastTrigger_id}
                </p>
              )}
            </div>
          )}

          {/* Datas */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Datas</h4>
            <div className="space-y-2 text-sm">
              {chatDetails.wa_lastMsgTimestamp && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Última mensagem</p>
                    <p className="text-sm text-gray-900">{formatDate(chatDetails.wa_lastMsgTimestamp)}</p>
                  </div>
                </div>
              )}
              {chatDetails.createdAt && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Criado em</p>
                    <p className="text-sm text-gray-900">{formatDate(new Date(chatDetails.createdAt).getTime())}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Grupos em Comum */}
          {chatDetails.wa_commonGroups && chatDetails.wa_commonGroups.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Grupos em Comum</h4>
              <p className="text-sm text-gray-600">{chatDetails.wa_commonGroups.length} grupo(s)</p>
            </div>
          )}
        </div>
      )}

      {/* Sem dados */}
      {!loading && !chatDetails && (
        <div className="p-8 text-center">
          <XCircle className="h-12 w-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">Nenhum detalhe disponível</p>
        </div>
      )}
    </div>
  );
}
