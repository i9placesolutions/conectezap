import { useState, ChangeEvent } from 'react';
import { 
  Send, 
  Image, 
  Mic, 
  Smile, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  Phone, 
  Users, 
  ChevronRight, 
  Info, 
  FileUp, 
  X, 
  Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { InstanceModal } from '../components/InstanceModal';
import { useInstance } from '../contexts/InstanceContext';
import { toast } from 'react-hot-toast';
import { ContactSelectionModal } from '../components/mass/ContactSelectionModal';
import { GroupSelectionModal } from '../components/mass/GroupSelectionModal';

// Importando diretamente os tipos do serviço UAZAPI para garantir compatibilidade
import { Group, Contact } from '../services/uazapiService';

export function MassMessagingPage() {
  // Estado de controle do fluxo
  const [currentStep, setCurrentStep] = useState<'recipients' | 'message' | 'schedule' | 'confirm'>('recipients');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  
  // Estado da mensagem
  const [messageType, setMessageType] = useState<'text' | 'media' | 'audio'>('text');
  const [messageText, setMessageText] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  
  // Estado de agendamento
  const [minDelay, setMinDelay] = useState(3); // Delay mínimo em segundos
  const [maxDelay, setMaxDelay] = useState(7); // Delay máximo em segundos
  const [sendMode, setSendMode] = useState<'now' | 'schedule'>('now');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  
  // Estado dos destinatários
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Group[]>([]);
  
  // Referência à API do WhatsApp
  const { selectedInstance, setShowInstanceModal } = useInstance();
  
  // Handler para upload de arquivo
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Verificar tamanho do arquivo (2MB max)
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo permitido: 2MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaFile(file);
        setMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Navegação entre etapas
  const handleNextStep = () => {
    if (currentStep === 'recipients') {
      if (getTotalRecipients() === 0) {
        toast.error('Selecione pelo menos um destinatário');
        return;
      }
      setCurrentStep('message');
    } else if (currentStep === 'message') {
      if (!campaignName.trim()) {
        toast.error('Digite um nome para a campanha');
        return;
      }
      if (!messageText.trim()) {
        toast.error('Digite uma mensagem');
        return;
      }
      setCurrentStep('schedule');
    } else if (currentStep === 'schedule') {
      if (sendMode === 'schedule' && (!scheduleDate || !scheduleTime)) {
        toast.error('Selecione a data e hora para agendamento');
        return;
      }
      setCurrentStep('confirm');
    }
  };
  
  const handlePreviousStep = () => {
    if (currentStep === 'message') {
      setCurrentStep('recipients');
    } else if (currentStep === 'schedule') {
      setCurrentStep('message');
    } else if (currentStep === 'confirm') {
      setCurrentStep('schedule');
    }
  };
  
  // Cálculo do total de destinatários
  const getTotalRecipients = (): number => {
    return selectedContacts.length + selectedGroups.length;
  };
  // Envio da mensagem
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      // Lógica para enviar mensagem seria implementada aqui
      // usando o serviço uazapi
      
      // Simular processamento
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('Campanha enviada com sucesso!');
      
      // Resetar o formulário
      setCurrentStep('recipients');
      setSelectedContacts([]);
      setSelectedGroups([]);
      setMessageText('');
      setCampaignName('');
      setMediaFile(null);
      setMediaPreview(null);
      setSendMode('now');
      setScheduleDate('');
      setScheduleTime('');
    } catch (error) {
      console.error('Erro ao enviar campanha:', error);
      toast.error('Erro ao enviar campanha. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Funções para selecionar contatos e grupos


  const handleClearContacts = () => {
    setSelectedContacts([]);
  };

  const handleClearGroups = () => {
    setSelectedGroups([]);
  };



  return (
    <div className="space-y-6">
      <InstanceModal />
      
      {/* Modais de seleção */}
      <ContactSelectionModal 
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        onSelect={setSelectedContacts}
        instanceToken={selectedInstance?.token || ''}
        selectedContacts={selectedContacts}
      />
      
      <GroupSelectionModal 
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        onSelect={setSelectedGroups}
        instanceToken={selectedInstance?.token || ''}
        selectedGroups={selectedGroups}
      />
      
      {/* Conteúdo principal */}
      {selectedInstance ? (
        <div className="space-y-6">
          {/* Indicador de progresso */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="max-w-4xl mx-auto">
              <ol className="flex items-center w-full justify-between">
                <li className={`flex items-center ${currentStep === 'recipients' ? 'text-primary-600' : 'text-gray-500'}`}>
                  <span className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep === 'recipients' ? 'bg-primary-100 text-primary-600 border border-primary-600' : 'bg-gray-100'} shrink-0`}>
                    1
                  </span>
                  <span className="ms-2 text-sm font-medium">Destinatários</span>
                  <div className={`w-full h-1 mx-4 ${currentStep !== 'recipients' ? 'bg-primary-600' : 'bg-gray-200'}`}></div>
                </li>
                <li className={`flex items-center ${currentStep === 'message' ? 'text-primary-600' : 'text-gray-500'}`}>
                  <span className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep === 'message' ? 'bg-primary-100 text-primary-600 border border-primary-600' : currentStep === 'recipients' ? 'bg-gray-100' : 'bg-primary-100 text-primary-600'} shrink-0`}>
                    2
                  </span>
                  <span className="ms-2 text-sm font-medium">Mensagem</span>
                  <div className={`w-full h-1 mx-4 ${currentStep === 'schedule' || currentStep === 'confirm' ? 'bg-primary-600' : 'bg-gray-200'}`}></div>
                </li>
                <li className={`flex items-center ${currentStep === 'schedule' ? 'text-primary-600' : 'text-gray-500'}`}>
                  <span className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep === 'schedule' ? 'bg-primary-100 text-primary-600 border border-primary-600' : currentStep === 'confirm' ? 'bg-primary-100 text-primary-600' : 'bg-gray-100'} shrink-0`}>
                    3
                  </span>
                  <span className="ms-2 text-sm font-medium">Configuração</span>
                  <div className={`w-full h-1 mx-4 ${currentStep === 'confirm' ? 'bg-primary-600' : 'bg-gray-200'}`}></div>
                </li>
                <li className={`flex items-center ${currentStep === 'confirm' ? 'text-primary-600' : 'text-gray-500'}`}>
                  <span className={`flex items-center justify-center w-8 h-8 rounded-full ${currentStep === 'confirm' ? 'bg-primary-100 text-primary-600 border border-primary-600' : 'bg-gray-100'} shrink-0`}>
                    4
                  </span>
                  <span className="ms-2 text-sm font-medium">Confirmação</span>
                </li>
              </ol>
            </div>
          </div>
          
          {/* Etapa 1: Seleção de destinatários */}
          {currentStep === 'recipients' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Selecione os Destinatários</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Contatos */}
                  <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <Send className="h-5 w-5 text-primary-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium">Contatos</h3>
                          <p className="text-sm text-gray-500">Selecione contatos individuais</p>
                        </div>
                      </div>
                      <span className="bg-primary-100 text-primary-700 text-xs font-medium px-2.5 py-1 rounded-full">
                        {selectedContacts.length} selecionados
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <button 
                        onClick={handleClearContacts}
                        className="p-2 text-center rounded-lg border border-gray-200 hover:border-primary-200 hover:bg-primary-50 text-sm font-medium"
                      >
                        Nenhum
                      </button>
                      <button 
                        onClick={() => setShowContactModal(true)}
                        className="p-2 text-center rounded-lg border border-gray-200 hover:border-primary-200 hover:bg-primary-50 text-sm font-medium"
                      >
                        Selecionar
                      </button>
                    </div>
                    
                    {selectedContacts.length > 0 && (
                      <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white">
                        {selectedContacts.map(contact => (
                          <div key={contact.id} className="py-1 px-2 text-sm flex items-center justify-between">
                            <span className="font-medium">{contact.name}</span>
                            <span className="text-gray-500">{contact.number}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Grupos */}
                  <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium">Grupos</h3>
                          <p className="text-sm text-gray-500">Selecione grupos de contato</p>
                        </div>
                      </div>
                      <span className="bg-primary-100 text-primary-700 text-xs font-medium px-2.5 py-1 rounded-full">
                        {selectedGroups.length} selecionados
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <button 
                        onClick={handleClearGroups}
                        className="p-2 text-center rounded-lg border border-gray-200 hover:border-primary-200 hover:bg-primary-50 text-sm font-medium"
                      >
                        Nenhum
                      </button>
                      <button 
                        onClick={() => setShowGroupModal(true)}
                        className="p-2 text-center rounded-lg border border-gray-200 hover:border-primary-200 hover:bg-primary-50 text-sm font-medium"
                      >
                        Selecionar
                      </button>
                    </div>
                    
                    {selectedGroups.length > 0 && (
                      <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white">
                        {selectedGroups.map(group => (
                          <div key={group.id} className="py-1 px-2 text-sm flex items-center justify-between">
                            <span className="font-medium">{group.name}</span>
                            <span className="text-gray-500">{group.participantsCount} participantes</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Total de destinatários */}
                <div className="mt-6 p-4 bg-primary-50 border border-primary-100 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Info className="h-5 w-5 text-primary-600" />
                      <span className="text-primary-800 font-medium">Total de destinatários</span>
                    </div>
                    <span className="text-xl font-bold text-primary-800">{getTotalRecipients()}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end p-4 border-t border-gray-200">
                <button
                  onClick={handleNextStep}
                  disabled={getTotalRecipients() === 0}
                  className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
          
          {/* Etapa 2: Composição da mensagem */}
          {currentStep === 'message' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Componha sua Mensagem</h2>
                
                {/* Nome da campanha */}
                <div className="mb-6">
                  <label htmlFor="campaignName" className="block text-sm font-medium text-gray-700 mb-1">
                    Nome da Campanha
                  </label>
                  <input
                    id="campaignName"
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="Digite um nome para identificar esta campanha"
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                
                {/* Tipo de mensagem */}
                <div className="mb-6">
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
                
                {/* Conteúdo da mensagem */}
                <div className="mb-6">
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
                </div>
                
                {/* Upload de mídia */}
                {messageType === 'media' && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Imagem
                    </label>
                    
                    {!mediaPreview ? (
                      <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <FileUp className="w-8 h-8 mb-3 text-gray-400" />
                            <p className="mb-2 text-sm text-gray-500">
                              <span className="font-medium">Clique para enviar</span> ou arraste e solte
                            </p>
                            <p className="text-xs text-gray-500">PNG, JPG ou GIF (MAX. 2MB)</p>
                          </div>
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={handleFileChange}
                          />
                        </label>
                      </div>
                    ) : (
                      <div className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-200">
                        <img 
                          src={mediaPreview} 
                          alt="Preview" 
                          className="w-full h-full object-contain"
                        />
                        <button
                          onClick={() => {
                            setMediaFile(null);
                            setMediaPreview(null);
                          }}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Gravação de áudio */}
                {messageType === 'audio' && (
                  <div className="mb-6 flex items-center justify-center">
                    <button className="flex items-center gap-2 px-6 py-3 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200">
                      <Mic className="h-5 w-5" />
                      <span className="font-medium">Gravar Áudio</span>
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between p-4 border-t border-gray-200">
                <button
                  onClick={handlePreviousStep}
                  className="flex items-center gap-2 px-6 py-2 text-gray-600 font-medium rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={handleNextStep}
                  disabled={!messageText.trim() || !campaignName.trim()}
                  className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
          
          {/* Etapa 3: Configuração de envio */}
          {currentStep === 'schedule' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Configure o Envio</h2>
                
                {/* Intervalo entre mensagens */}
                <div className="mb-6">
                  <h3 className="text-md font-medium text-gray-800 mb-4">Intervalo entre mensagens</h3>
                  
                  {/* Delay mínimo */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Delay mínimo (segundos)
                      </label>
                      <span className="text-sm font-medium text-primary-600">
                        {minDelay}s
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={minDelay}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        setMinDelay(value);
                        // Garantir que maxDelay seja sempre maior ou igual a minDelay
                        if (value > maxDelay) {
                          setMaxDelay(value);
                        }
                      }}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Rápido: 1s</span>
                      <span>Lento: 20s</span>
                    </div>
                  </div>
                  
                  {/* Delay máximo */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Delay máximo (segundos)
                      </label>
                      <span className="text-sm font-medium text-primary-600">
                        {maxDelay}s
                      </span>
                    </div>
                    <input
                      type="range"
                      min={minDelay}
                      max="60"
                      value={maxDelay}
                      onChange={(e) => setMaxDelay(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Mínimo: {minDelay}s</span>
                      <span>Máximo: 60s</span>
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500 italic mt-2">
                    O delay aleatório entre mensagens ajuda a evitar detecção de spam pelo WhatsApp.
                  </p>
                </div>
                
                {/* Modo de envio */}
                <div className="mb-6">
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
                
                {/* Opções de agendamento */}
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
              
              <div className="flex justify-between p-4 border-t border-gray-200">
                <button
                  onClick={handlePreviousStep}
                  className="flex items-center gap-2 px-6 py-2 text-gray-600 font-medium rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={handleNextStep}
                  disabled={sendMode === 'schedule' && (!scheduleDate || !scheduleTime)}
                  className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
          
          {/* Etapa 4: Confirmação */}
          {currentStep === 'confirm' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Confirme e Envie</h2>
                
                <div className="space-y-6">
                  {/* Resumo da campanha */}
                  <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <h3 className="text-lg font-medium mb-4">Resumo da Campanha</h3>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Nome da Campanha:</span>
                        <span className="font-medium">{campaignName}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total de Destinatários:</span>
                        <span className="font-medium">{getTotalRecipients()}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tipo de Mensagem:</span>
                        <span className="font-medium">
                          {messageType === 'text' ? 'Texto' : messageType === 'media' ? 'Imagem' : 'Áudio'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600">Intervalo entre mensagens:</span>
                        <span className="font-medium">{minDelay} a {maxDelay} segundos</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600">Modo de Envio:</span>
                        <span className="font-medium">
                          {sendMode === 'now' ? 'Imediato' : 'Agendado'}
                        </span>
                      </div>
                      
                      {sendMode === 'schedule' && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Data e Hora Agendada:</span>
                          <span className="font-medium">
                            {new Date(`${scheduleDate}T${scheduleTime}`).toLocaleString('pt-BR')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Prévia da mensagem */}
                  <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <h3 className="text-lg font-medium mb-4">Prévia da Mensagem</h3>
                    
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                      {messageType === 'media' && mediaPreview && (
                        <div className="mb-3">
                          <img 
                            src={mediaPreview} 
                            alt="Preview" 
                            className="max-h-48 rounded-lg mx-auto"
                          />
                        </div>
                      )}
                      
                      <div className="whitespace-pre-wrap">{messageText}</div>
                    </div>
                  </div>
                  
                  {/* Aviso de responsabilidade */}
                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-amber-800 mb-1">Aviso Importante</h4>
                        <p className="text-sm text-amber-700">
                          O envio de mensagens em massa pode violar os termos de serviço do WhatsApp se usado para spam.
                          Use esta ferramenta com responsabilidade e apenas para destinatários que consentiram em receber suas mensagens.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between p-4 border-t border-gray-200">
                <button
                  onClick={handlePreviousStep}
                  className="flex items-center gap-2 px-6 py-2 text-gray-600 font-medium rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {sendMode === 'schedule' ? 'Agendando...' : 'Enviando...'}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      {sendMode === 'schedule' ? 'Agendar Envio' : 'Enviar Agora'}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="max-w-md mx-auto">
            <Phone className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Selecione uma Instância
            </h3>
            <p className="text-gray-500 mb-6">
              Para começar, selecione uma instância do WhatsApp conectada para enviar as mensagens.
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
