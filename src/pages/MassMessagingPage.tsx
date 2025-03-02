import { useState } from 'react';
import { Send, Image, Mic, Smile, AlertTriangle, Clock, Calendar, Phone, Users, MessageSquare } from 'lucide-react';
import { cn } from '../lib/utils';
import { InstanceModal } from '../components/InstanceModal';
import { useInstance } from '../contexts/InstanceContext';

export function MassMessagingPage() {
  const [messageType, setMessageType] = useState<'text' | 'media' | 'audio'>('text');
  const [delay, setDelay] = useState(5);
  const [sendMode, setSendMode] = useState<'now' | 'schedule'>('now');
  const [messageText, setMessageText] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const { selectedInstance, setShowInstanceModal } = useInstance();

  const handleSubmit = () => {
    // Add submit logic here
    console.log('Submitting campaign...');
  };

  return (
    <div className="space-y-6">
      <InstanceModal />

      {selectedInstance ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Recipients */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Destinatários</h2>

              {/* Contacts Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <Send className="h-5 w-5 text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">Contatos</h3>
                    <p className="text-sm text-gray-500">Selecione contatos individuais</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button className="p-2 text-center rounded-lg border border-primary-200 bg-primary-50 text-primary-700">
                    Nenhum
                  </button>
                  <button className="p-2 text-center rounded-lg border border-gray-200 hover:border-primary-200 hover:bg-primary-50">
                    Todos
                  </button>
                  <button className="p-2 text-center rounded-lg border border-gray-200 hover:border-primary-200 hover:bg-primary-50">
                    Selecionar
                  </button>
                </div>
              </div>

              {/* Groups Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">Grupos</h3>
                    <p className="text-sm text-gray-500">Selecione grupos de contato</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button className="p-2 text-center rounded-lg border border-primary-200 bg-primary-50 text-primary-700">
                    Nenhum
                  </button>
                  <button className="p-2 text-center rounded-lg border border-gray-200 hover:border-primary-200 hover:bg-primary-50">
                    Todos
                  </button>
                  <button className="p-2 text-center rounded-lg border border-gray-200 hover:border-primary-200 hover:bg-primary-50">
                    Selecionar
                  </button>
                </div>
              </div>

              {/* Chats Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">Chats</h3>
                    <p className="text-sm text-gray-500">Selecione conversas existentes</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button className="p-2 text-center rounded-lg border border-primary-200 bg-primary-50 text-primary-700">
                    Nenhum
                  </button>
                  <button className="p-2 text-center rounded-lg border border-gray-200 hover:border-primary-200 hover:bg-primary-50">
                    Todos
                  </button>
                  <button className="p-2 text-center rounded-lg border border-gray-200 hover:border-primary-200 hover:bg-primary-50">
                    Selecionar
                  </button>
                </div>
              </div>

              {/* Total Recipients */}
              <div className="pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  Total de destinatários selecionados:
                  <span className="ml-1 text-lg font-semibold text-gray-900">0</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Campaign Form */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 space-y-6">
              {/* Campaign Name */}
              <div>
                <label htmlFor="campaignName" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Campanha
                </label>
                <input
                  id="campaignName"
                  type="text"
                  placeholder="Digite o nome da campanha"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Message Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Tipo de Mensagem
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    className={cn(
                      "flex flex-col items-center gap-3 p-6 rounded-lg border transition-all",
                      messageType === 'text'
                        ? "border-primary-600 bg-primary-50 text-primary-700"
                        : "border-gray-200 hover:bg-gray-50"
                    )}
                    onClick={() => setMessageType('text')}
                  >
                    <Send className="h-8 w-8" />
                    <span className="font-medium">Texto</span>
                  </button>
                  <button
                    className={cn(
                      "flex flex-col items-center gap-3 p-6 rounded-lg border transition-all",
                      messageType === 'media'
                        ? "border-primary-600 bg-primary-50 text-primary-700"
                        : "border-gray-200 hover:bg-gray-50"
                    )}
                    onClick={() => setMessageType('media')}
                  >
                    <Image className="h-8 w-8" />
                    <span className="font-medium">Mídia</span>
                  </button>
                  <button
                    className={cn(
                      "flex flex-col items-center gap-3 p-6 rounded-lg border transition-all",
                      messageType === 'audio'
                        ? "border-primary-600 bg-primary-50 text-primary-700"
                        : "border-gray-200 hover:bg-gray-50"
                    )}
                    onClick={() => setMessageType('audio')}
                  >
                    <Mic className="h-8 w-8" />
                    <span className="font-medium">Áudio</span>
                  </button>
                </div>
              </div>

              {/* Message Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mensagem
                </label>
                <div className="relative">
                  <textarea
                    rows={6}
                    placeholder="Digite sua mensagem..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  />
                  <button
                    className="absolute right-3 bottom-3 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    title="Adicionar emoji"
                  >
                    <Smile className="h-5 w-5" />
                  </button>
                </div>
                {messageType === 'media' && (
                  <div className="mt-4">
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Image className="w-8 h-8 mb-3 text-gray-400" />
                          <p className="mb-2 text-sm text-gray-500">
                            <span className="font-medium">Clique para enviar</span> ou arraste e solte
                          </p>
                          <p className="text-xs text-gray-500">PNG, JPG ou GIF (MAX. 2MB)</p>
                        </div>
                        <input type="file" className="hidden" accept="image/*" />
                      </label>
                    </div>
                  </div>
                )}
                {messageType === 'audio' && (
                  <div className="mt-4 flex items-center justify-center">
                    <button className="flex items-center gap-2 px-4 py-2 text-primary-600 hover:bg-primary-50 rounded-lg">
                      <Mic className="h-5 w-5" />
                      <span>Gravar Áudio</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Delay Slider */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Delay entre mensagens
                  </label>
                  <span className="text-sm text-gray-500">
                    {delay}s
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="60"
                  value={delay}
                  onChange={(e) => setDelay(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                />
                <div className="mt-1 text-sm text-amber-600 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Delays muito baixos podem causar bloqueio. Use com responsabilidade.
                </div>
              </div>

              {/* Send Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Modo de Envio
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    className={cn(
                      "flex flex-col items-center gap-3 p-6 rounded-lg border transition-all",
                      sendMode === 'now'
                        ? "border-primary-600 bg-primary-50 text-primary-700"
                        : "border-gray-200 hover:bg-gray-50"
                    )}
                    onClick={() => setSendMode('now')}
                  >
                    <Send className="h-8 w-8" />
                    <span className="font-medium">Enviar Agora</span>
                  </button>
                  <button
                    className={cn(
                      "flex flex-col items-center gap-3 p-6 rounded-lg border transition-all",
                      sendMode === 'schedule'
                        ? "border-primary-600 bg-primary-50 text-primary-700"
                        : "border-gray-200 hover:bg-gray-50"
                    )}
                    onClick={() => setSendMode('schedule')}
                  >
                    <Clock className="h-8 w-8" />
                    <span className="font-medium">Agendar Envio</span>
                  </button>
                </div>
              </div>

              {/* Schedule Options */}
              {sendMode === 'schedule' && (
                <div className="space-y-4 pt-4 border-t border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data de Envio
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hora de Envio
                    </label>
                    <div className="relative">
                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Send className="h-4 w-4" />
                {sendMode === 'schedule' ? 'Agendar' : 'Enviar Agora'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="max-w-md mx-auto">
            <Phone className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Selecione uma Instância
            </h3>
            <p className="text-gray-500 mb-6">
              Para começar, selecione uma instância do WhatsApp para enviar as mensagens.
            </p>
            <button
              onClick={() => setShowInstanceModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Phone className="h-4 w-4" />
              Selecionar Instância
            </button>
          </div>
        </div>
      )}
    </div>
  );
}