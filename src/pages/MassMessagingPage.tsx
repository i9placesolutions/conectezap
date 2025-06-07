import { useState, ChangeEvent, useEffect } from 'react';
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
  Loader2,
  BarChart2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { InstanceModal } from '../components/InstanceModal';
import { useInstance } from '../contexts/InstanceContext';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { ContactSelectionModal } from '../components/mass/ContactSelectionModal';
import { GroupSelectionModal } from '../components/mass/GroupSelectionModal';
import { useAuth } from '../contexts/AuthContext';

// Importando o serviço UAZAPI e seus tipos para garantir compatibilidade
import { Group, Contact, uazapiService } from '../services/uazapiService';

// Importando funções do Supabase
import { 
  uploadCampaignMedia, 
  createMassCampaign, 
  updateMassCampaign, 
  MassCampaign 
} from '../lib/supabase';

// Tipo para a mensagem
interface MessageData {
  type: 'text' | 'media' | 'audio';
  text: string;
  mediaFile?: File | null;
  mediaPreview?: string | null;
  mediaUrl?: { url: string; path: string } | null;
}

export function MassMessagingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Estado de controle do fluxo
  const [currentStep, setCurrentStep] = useState<'recipients' | 'message' | 'schedule' | 'confirm'>('recipients');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState<string | null>(null);
  const [currentCampaign, setCurrentCampaign] = useState<MassCampaign | null>(null);
  
  // Estado da mensagem
  const [messageData, setMessageData] = useState<MessageData>({
    type: 'text',
    text: '',
    mediaFile: null,
    mediaPreview: null
  });
  const [campaignName, setCampaignName] = useState('');
  
  // Estado de agendamento
  const [minDelay, setMinDelay] = useState(3); // Delay mínimo em segundos
  const [maxDelay, setMaxDelay] = useState(7); // Delay máximo em segundos
  const [sendMode, setSendMode] = useState<'now' | 'schedule'>('now');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  
  // Estado dos blocos
  const [useBlocks, setUseBlocks] = useState(false);
  const [blockSize, setBlockSize] = useState(50); // Quantidade de contatos por bloco
  const [delayBetweenBlocks, setDelayBetweenBlocks] = useState(300); // Delay entre blocos em segundos (5 minutos)
  
  // Estado dos destinatários
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Group[]>([]);
  
  // Referência à API do WhatsApp
  const { selectedInstance, setShowInstanceModal } = useInstance();
  
  // Exibir modal de seleção de instância automaticamente ao carregar a página
  useEffect(() => {
    if (!selectedInstance) {
      setShowInstanceModal(true);
    }
  }, [selectedInstance, setShowInstanceModal]);
  
  // Função para atualizar dados da mensagem
  const updateMessageData = (updates: Partial<MessageData>) => {
    setMessageData(prev => ({ ...prev, ...updates }));
  };
  
  // Handler para upload de arquivo
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Verificar tamanho do arquivo (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Máximo permitido: 5MB');
        return;
      }
      
      // Verificar se o usuário está autenticado
      if (!user?.id) {
        toast.error('Usuário não autenticado');
        return;
      }
      
      setUploadingMedia('uploading');
      
      try {
        // Fazer upload do arquivo para o Supabase
        const mediaUrl = await uploadCampaignMedia(file, user.id);
        
        // Criar preview local
        const preview = URL.createObjectURL(file);
        
        // Atualizar dados da mensagem
        updateMessageData({
          mediaFile: file,
          mediaPreview: preview,
          mediaUrl: mediaUrl
        });
        
        toast.success('Arquivo enviado com sucesso!');
      } catch (error) {
        console.error('Erro ao fazer upload:', error);
        toast.error('Erro ao fazer upload do arquivo');
      } finally {
        setUploadingMedia(null);
      }
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
      
      // Validar se a mensagem tem conteúdo
      if (!messageData.text.trim() && !messageData.mediaFile) {
        toast.error('Adicione uma mensagem com texto ou mídia');
        return;
      }
      
      // Para mensagens de áudio, implementar validação quando necessário
      if (messageData.type === 'audio' && !messageData.text.trim()) {
        toast.error('Grave um áudio ou digite uma mensagem');
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
      
      // Verificar se a instância está selecionada
      if (!selectedInstance || !selectedInstance.token) {
        toast.error('Selecione uma instância válida');
        return;
      }
      
      // Verificar se o usuário está autenticado
      if (!user?.id) {
        toast.error('Usuário não autenticado');
        return;
      }
      
      // Preparar dados para o envio
      const numbers: string[] = [];
      
      // Adicionar números de contatos individuais
      selectedContacts.forEach(contact => {
        // Garantir que o número está no formato correto (apenas números)
        const cleanNumber = contact.number.replace(/\D/g, '');
        if (cleanNumber) numbers.push(cleanNumber);
      });
      
      // Adicionar JIDs dos grupos selecionados
      selectedGroups.forEach(group => {
        // Verificar se tem o JID (ID do WhatsApp) do grupo
        if (group.jid) {
          // O ID do grupo já está no formato correto (@g.us)
          numbers.push(group.jid);
        } else if (group.id) {
          // Usar o ID como alternativa
          numbers.push(group.id);
        }
      });
      
      if (numbers.length === 0) {
        toast.error('Nenhum número válido encontrado nos destinatários selecionados');
        return;
      }
      
      // Primeiro, salvar a campanha no Supabase
      const campaignData: Partial<MassCampaign> = {
        user_id: user.id,
        campaign_name: campaignName,
        message_text: messageData.text || '',
        message_type: messageData.type || 'text',
        media_url: messageData.type === 'media' && messageData.mediaUrl ? messageData.mediaUrl.url : undefined,
        media_filename: messageData.type === 'media' && messageData.mediaFile ? messageData.mediaFile.name : undefined,
        media_mimetype: messageData.type === 'media' && messageData.mediaFile ? messageData.mediaFile.type : undefined,
        recipients_count: numbers.length,
        sent_count: 0,
        failed_count: 0,
        status: sendMode === 'schedule' ? 'scheduled' : 'sending',
        min_delay: minDelay * 1000,
        max_delay: maxDelay * 1000,
        scheduled_for: sendMode === 'schedule' && scheduleDate && scheduleTime
          ? new Date(`${scheduleDate}T${scheduleTime}`).toISOString()
          : undefined
      };
      
      const savedCampaign = await createMassCampaign(campaignData);
      
      if (!savedCampaign) {
        toast.error('Erro ao salvar campanha no banco de dados');
        return;
      }
      
      setCurrentCampaign(savedCampaign);
      
      // Preparar dados da mídia se houver
      let mediaData = null;
      if (messageData?.type === 'media' && messageData?.mediaUrl) {
        // Usar a URL do Supabase em vez de base64
        mediaData = {
          mimetype: messageData?.mediaFile ? messageData.mediaFile.type : 'image/jpeg',
          data: messageData.mediaUrl.url, // URL do Supabase
          filename: messageData?.mediaFile ? messageData.mediaFile.name : 'media'
        };
      }
      
      // Construir objeto de dados para envio
      const massMessageData = {
        campaignName: campaignName,
        message: messageData?.text || '',
        numbers: numbers,
        minDelay: minDelay * 1000, // Converter para milissegundos
        maxDelay: maxDelay * 1000, // Converter para milissegundos
        media: mediaData,
        // Dados de agendamento, se aplicável
        scheduledFor: sendMode === 'schedule' && scheduleDate && scheduleTime
          ? new Date(`${scheduleDate}T${scheduleTime}`).getTime() // Timestamp em milissegundos
          : undefined
      };
      
      console.log('Enviando dados:', massMessageData);
      console.log('Instância selecionada:', selectedInstance);
      console.log('Campanha salva:', savedCampaign);
      
      // Mostrar mensagem de sucesso imediatamente e processar em segundo plano
      toast.success('Campanha iniciada! O envio está sendo processado em segundo plano. Você pode acompanhar o progresso na página de relatórios.');
      
      // Resetar o formulário imediatamente
      setCurrentStep('recipients');
      setSelectedContacts([]);
      setSelectedGroups([]);
      setMessageData({ text: '', type: 'text', mediaFile: null, mediaPreview: null, mediaUrl: null });
      setCampaignName('');
      setSendMode('now');
      setScheduleDate('');
      setScheduleTime('');
      setUseBlocks(false);
      setCurrentCampaign(null);
      
      // Navegar para a página de relatórios imediatamente
      navigate('/messages/campaigns');
      
      // Processar envio em segundo plano
      setTimeout(async () => {
        try {
          // Verificar se deve enviar em blocos
          if (useBlocks && numbers.length > blockSize) {
            // Dividir contatos em blocos
            const blocks = [];
            for (let i = 0; i < numbers.length; i += blockSize) {
              blocks.push(numbers.slice(i, i + blockSize));
            }
            
            console.log(`Enviando em ${blocks.length} blocos de até ${blockSize} contatos cada`);
            
            let totalSent = 0;
            let totalFailed = 0;
            const folderIds = [];
            
            // Enviar cada bloco
            for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
              const block = blocks[blockIndex];
              const blockName = `${campaignName} - Bloco ${blockIndex + 1}/${blocks.length}`;
              
              try {
                console.log(`Enviando bloco ${blockIndex + 1}/${blocks.length} com ${block.length} contatos`);
                
                const blockData = {
                  ...massMessageData,
                  campaignName: blockName,
                  numbers: block
                };
                
                const blockResult = await uazapiService.sendMassMessage(selectedInstance.token!, blockData);
                
                if (blockResult && blockResult.success) {
                  totalSent += block.length;
                  if (blockResult.folder_id) {
                    folderIds.push(blockResult.folder_id);
                  }
                  console.log(`Bloco ${blockIndex + 1} enviado com sucesso`);
                } else {
                  totalFailed += block.length;
                  console.error(`Erro no bloco ${blockIndex + 1}:`, blockResult);
                }
                
                // Aguardar delay entre blocos (exceto no último bloco)
                if (blockIndex < blocks.length - 1) {
                  console.log(`Aguardando ${delayBetweenBlocks} segundos antes do próximo bloco...`);
                  await new Promise(resolve => setTimeout(resolve, delayBetweenBlocks * 1000));
                }
                
              } catch (blockError) {
                console.error(`Erro ao enviar bloco ${blockIndex + 1}:`, blockError);
                totalFailed += block.length;
              }
            }
            
            // Atualizar status da campanha
            const finalStatus = totalFailed === 0 ? 'completed' : totalSent > 0 ? 'completed' : 'failed';
            if (savedCampaign?.id) {
              await updateMassCampaign(savedCampaign.id, {
                status: finalStatus,
                sent_count: totalSent,
                failed_count: totalFailed
              });
            }
            
            console.log(`Campanha em blocos finalizada: ${totalSent} enviados, ${totalFailed} falharam`);
            
          } else {
            // Envio normal (sem blocos)
            const result = await uazapiService.sendMassMessage(selectedInstance.token!, massMessageData);
            
            console.log('Resultado do envio:', result);
            
            if (result && result.success) {
              // Atualizar status da campanha para completed
              if (savedCampaign?.id) {
                  await updateMassCampaign(savedCampaign.id, {
                  status: 'completed',
                  sent_count: numbers.length
                });
              }
              
              console.log('Campanha enviada com sucesso em segundo plano');
            } else {
              // Atualizar status da campanha para failed
              if (savedCampaign?.id) {
                await updateMassCampaign(savedCampaign.id, {
                  status: 'failed',
                  failed_count: numbers.length
                });
              }
              
              console.error('Erro ao enviar campanha em segundo plano');
            }
          }
        } catch (backgroundError) {
          console.error('Erro no processamento em segundo plano:', backgroundError);
          
          // Atualizar status da campanha para failed
          if (savedCampaign?.id) {
            await updateMassCampaign(savedCampaign.id, {
              status: 'failed'
            });
          }
        }
      }, 100); // Delay mínimo para garantir que a navegação aconteça primeiro
    } catch (error) {
      console.error('Erro ao enviar campanha:', error);
      
      // Se temos uma campanha salva, atualizar status para failed
      if (currentCampaign) {
        await updateMassCampaign(currentCampaign.id, {
          status: 'failed'
        });
      }
      
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



  // Função para navegar para a página de histórico
  const goToHistory = () => {
    navigate('/messages/reports');
  };

  return (
    <div className="space-y-4 sm:space-y-6">
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
      
      {/* Cabeçalho e botão para visualizar histórico */}
      {selectedInstance && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Disparo em Massa</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Envie mensagens para múltiplos contatos</p>
          </div>
          <button
            onClick={goToHistory}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-primary-100 hover:bg-primary-200 text-primary-700 rounded-lg transition-colors text-sm sm:text-base"
          >
            <BarChart2 className="h-4 w-4" />
            <span className="hidden sm:inline">Ver Histórico de Campanhas</span>
            <span className="sm:hidden">Histórico</span>
          </button>
        </div>
      )}
      
      {/* Conteúdo principal */}
      {selectedInstance ? (
        <div className="space-y-6">
          {/* Indicador de progresso */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
            <div className="max-w-4xl mx-auto">
              <ol className="flex items-center w-full">
                <li className={`flex items-center flex-1 ${currentStep === 'recipients' ? 'text-primary-600' : 'text-gray-500'}`}>
                  <span className={`flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full ${currentStep === 'recipients' ? 'bg-primary-100 text-primary-600 border border-primary-600' : 'bg-gray-100'} shrink-0 text-xs sm:text-sm font-medium`}>
                    1
                  </span>
                  <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-medium hidden xs:inline">Destinatários</span>
                  <span className="ml-1 text-xs font-medium xs:hidden">Dest.</span>
                  <div className={`flex-1 h-1 ml-2 sm:ml-4 ${currentStep !== 'recipients' ? 'bg-primary-600' : 'bg-gray-200'} rounded`}></div>
                </li>
                <li className={`flex items-center flex-1 ${currentStep === 'message' ? 'text-primary-600' : 'text-gray-500'}`}>
                  <span className={`flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full ${currentStep === 'message' ? 'bg-primary-100 text-primary-600 border border-primary-600' : currentStep === 'recipients' ? 'bg-gray-100' : 'bg-primary-100 text-primary-600'} shrink-0 text-xs sm:text-sm font-medium`}>
                    2
                  </span>
                  <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-medium hidden xs:inline">Mensagem</span>
                  <span className="ml-1 text-xs font-medium xs:hidden">Msg</span>
                  <div className={`flex-1 h-1 ml-2 sm:ml-4 ${currentStep === 'schedule' || currentStep === 'confirm' ? 'bg-primary-600' : 'bg-gray-200'} rounded`}></div>
                </li>
                <li className={`flex items-center flex-1 ${currentStep === 'schedule' ? 'text-primary-600' : 'text-gray-500'}`}>
                  <span className={`flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full ${currentStep === 'schedule' ? 'bg-primary-100 text-primary-600 border border-primary-600' : currentStep === 'confirm' ? 'bg-primary-100 text-primary-600' : 'bg-gray-100'} shrink-0 text-xs sm:text-sm font-medium`}>
                    3
                  </span>
                  <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-medium hidden xs:inline">Configuração</span>
                  <span className="ml-1 text-xs font-medium xs:hidden">Config</span>
                  <div className={`flex-1 h-1 ml-2 sm:ml-4 ${currentStep === 'confirm' ? 'bg-primary-600' : 'bg-gray-200'} rounded`}></div>
                </li>
                <li className={`flex items-center ${currentStep === 'confirm' ? 'text-primary-600' : 'text-gray-500'}`}>
                  <span className={`flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full ${currentStep === 'confirm' ? 'bg-primary-100 text-primary-600 border border-primary-600' : 'bg-gray-100'} shrink-0 text-xs sm:text-sm font-medium`}>
                    4
                  </span>
                  <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-medium hidden xs:inline">Confirmação</span>
                  <span className="ml-1 text-xs font-medium xs:hidden">Conf.</span>
                </li>
              </ol>
            </div>
          </div>
          
          {/* Etapa 1: Seleção de destinatários */}
          {currentStep === 'recipients' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Selecione os Destinatários</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {/* Contatos */}
                  <div className="bg-gray-50 rounded-lg p-4 sm:p-5 border border-gray-200">
                    <div className="flex items-start sm:items-center justify-between mb-4 gap-2">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                          <Send className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base sm:text-lg font-medium truncate">Contatos</h3>
                          <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Selecione contatos individuais</p>
                        </div>
                      </div>
                      <span className="bg-primary-100 text-primary-700 text-xs font-medium px-2 sm:px-2.5 py-1 rounded-full whitespace-nowrap">
                        {selectedContacts.length}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <button 
                        onClick={handleClearContacts}
                        className="p-2 text-center rounded-lg border border-gray-200 hover:border-primary-200 hover:bg-primary-50 text-xs sm:text-sm font-medium"
                      >
                        Nenhum
                      </button>
                      <button 
                        onClick={() => setShowContactModal(true)}
                        className="p-2 text-center rounded-lg border border-gray-200 hover:border-primary-200 hover:bg-primary-50 text-xs sm:text-sm font-medium"
                      >
                        Selecionar
                      </button>
                    </div>
                    
                    {selectedContacts.length > 0 && (
                      <div className="max-h-32 sm:max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white">
                        {selectedContacts.map(contact => (
                          <div key={contact.id} className="py-1 px-2 text-xs sm:text-sm flex items-center justify-between gap-2">
                            <span className="font-medium truncate">{contact.name}</span>
                            <span className="text-gray-500 text-xs whitespace-nowrap">{contact.number}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Grupos */}
                  <div className="bg-gray-50 rounded-lg p-4 sm:p-5 border border-gray-200">
                    <div className="flex items-start sm:items-center justify-between mb-4 gap-2">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                          <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base sm:text-lg font-medium truncate">Grupos</h3>
                          <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Selecione grupos de contato</p>
                        </div>
                      </div>
                      <span className="bg-primary-100 text-primary-700 text-xs font-medium px-2 sm:px-2.5 py-1 rounded-full whitespace-nowrap">
                        {selectedGroups.length}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <button 
                        onClick={handleClearGroups}
                        className="p-2 text-center rounded-lg border border-gray-200 hover:border-primary-200 hover:bg-primary-50 text-xs sm:text-sm font-medium"
                      >
                        Nenhum
                      </button>
                      <button 
                        onClick={() => setShowGroupModal(true)}
                        className="p-2 text-center rounded-lg border border-gray-200 hover:border-primary-200 hover:bg-primary-50 text-xs sm:text-sm font-medium"
                      >
                        Selecionar
                      </button>
                    </div>
                    
                    {selectedGroups.length > 0 && (
                      <div className="max-h-32 sm:max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white">
                        {selectedGroups.map(group => (
                          <div key={group.id} className="py-1 px-2 text-xs sm:text-sm flex items-center justify-between gap-2">
                            <span className="font-medium truncate">{group.name}</span>
                            <span className="text-gray-500 text-xs whitespace-nowrap">{group.participantsCount} part.</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Total de destinatários */}
                <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-primary-50 border border-primary-100 rounded-lg">
                  <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 sm:h-5 sm:w-5 text-primary-600 flex-shrink-0" />
                      <span className="text-primary-800 font-medium text-sm sm:text-base">Total de destinatários</span>
                    </div>
                    <span className="text-lg sm:text-xl font-bold text-primary-800">{getTotalRecipients()}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 p-3 sm:p-4 border-t border-gray-200">
                <div className="text-xs sm:text-sm text-gray-500">
                  {getTotalRecipients()} destinatário{getTotalRecipients() !== 1 ? 's' : ''} selecionado{getTotalRecipients() !== 1 ? 's' : ''}
                </div>
                <button
                  onClick={handleNextStep}
                  disabled={getTotalRecipients() === 0}
                  className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
          
          {/* Etapa 2: Composição das mensagens */}
          {currentStep === 'message' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Configure sua Mensagem</h2>
                
                {/* Nome da campanha */}
                <div className="mb-4 sm:mb-6">
                  <label htmlFor="campaignName" className="block text-sm font-medium text-gray-700 mb-2">
                    Nome da Campanha *
                  </label>
                  <input
                    id="campaignName"
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="Ex: Promoção Black Friday 2024"
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm sm:text-base"
                  />
                  <p className="text-xs text-gray-500 mt-1">Este nome ajudará você a identificar a campanha nos relatórios</p>
                </div>
                
                {/* Configuração da mensagem */}
                <div className="border border-gray-200 rounded-lg p-3 sm:p-4">
                  {/* Tipo de mensagem */}
                  <div className="mb-4 sm:mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Tipo de Mensagem *
                    </label>
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      <button
                        className={cn(
                          "flex flex-col items-center gap-1 sm:gap-2 p-3 sm:p-4 rounded-lg border transition-all",
                          messageData.type === 'text'
                            ? "border-primary-600 bg-primary-50 text-primary-700"
                            : "border-gray-200 hover:bg-gray-50"
                        )}
                        onClick={() => updateMessageData({ type: 'text' })}
                      >
                        <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="text-xs sm:text-sm font-medium">Texto</span>
                      </button>
                      <button
                        className={cn(
                          "flex flex-col items-center gap-1 sm:gap-2 p-3 sm:p-4 rounded-lg border transition-all",
                          messageData.type === 'media'
                            ? "border-primary-600 bg-primary-50 text-primary-700"
                            : "border-gray-200 hover:bg-gray-50"
                        )}
                        onClick={() => updateMessageData({ type: 'media' })}
                      >
                        <Image className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="text-xs sm:text-sm font-medium">Mídia</span>
                      </button>
                      <button
                        className={cn(
                          "flex flex-col items-center gap-1 sm:gap-2 p-3 sm:p-4 rounded-lg border transition-all",
                          messageData.type === 'audio'
                            ? "border-primary-600 bg-primary-50 text-primary-700"
                            : "border-gray-200 hover:bg-gray-50"
                        )}
                        onClick={() => updateMessageData({ type: 'audio' })}
                      >
                        <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span className="text-xs sm:text-sm font-medium">Áudio</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* Conteúdo da mensagem */}
                  <div className="mb-4 sm:mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Texto da Mensagem *
                    </label>
                    <div className="relative">
                      <textarea
                        rows={4}
                        placeholder="Digite sua mensagem aqui..."
                        value={messageData.text}
                        onChange={(e) => updateMessageData({ text: e.target.value })}
                        className="w-full px-3 sm:px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-sm sm:text-base"
                      />
                      <button
                        className="absolute right-2 sm:right-3 bottom-2 sm:bottom-3 p-1 sm:p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                        title="Adicionar emoji"
                      >
                        <Smile className="h-4 w-4 sm:h-5 sm:w-5" />
                      </button>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Use variáveis como {{nome}} para personalizar</span>
                      <span>{messageData.text.length}/1000</span>
                    </div>
                  </div>
                  
                  {/* Upload de mídia */}
                  {messageData.type === 'media' && (
                    <div className="mb-4 sm:mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Mídia *
                      </label>
                      
                      {!messageData.mediaPreview ? (
                        <div className="flex items-center justify-center w-full">
                          <label className={cn(
                            "flex flex-col items-center justify-center w-full h-32 sm:h-40 border-2 border-dashed rounded-lg cursor-pointer transition-all",
                            uploadingMedia === 'uploading'
                              ? "border-primary-300 bg-primary-50" 
                              : "border-gray-300 bg-gray-50 hover:bg-gray-100"
                          )}>
                            <div className="flex flex-col items-center justify-center pt-4 pb-5 px-4">
                              {uploadingMedia === 'uploading' ? (
                                <>
                                  <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 mb-2 sm:mb-3 text-primary-500 animate-spin" />
                                  <p className="mb-1 sm:mb-2 text-xs sm:text-sm text-primary-600 font-medium text-center">
                                    Fazendo upload...
                                  </p>
                                </>
                              ) : (
                                <>
                                  <FileUp className="w-6 h-6 sm:w-8 sm:h-8 mb-2 sm:mb-3 text-gray-400" />
                                  <p className="mb-1 sm:mb-2 text-xs sm:text-sm text-gray-500 text-center">
                                    <span className="font-medium">Clique para enviar</span>
                                    <span className="hidden sm:inline"> ou arraste e solte</span>
                                  </p>
                                  <p className="text-xs text-gray-500 text-center">PNG, JPG, GIF, MP4, MP3, WAV<br className="sm:hidden" /><span className="hidden sm:inline"> </span>(MAX. 5MB)</p>
                                </>
                              )}
                            </div>
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*,video/mp4,audio/*"
                              onChange={handleFileChange}
                              disabled={uploadingMedia === 'uploading'}
                            />
                          </label>
                        </div>
                      ) : (
                        <div className="relative w-full h-40 sm:h-48 rounded-lg overflow-hidden border border-gray-200">
                          {messageData.mediaFile?.type.startsWith('image/') ? (
                            <img 
                              src={messageData.mediaPreview} 
                              alt="Preview" 
                              className="w-full h-full object-contain bg-gray-50"
                            />
                          ) : messageData.mediaFile?.type.startsWith('video/') ? (
                            <video 
                              src={messageData.mediaPreview} 
                              controls
                              className="w-full h-full object-contain bg-gray-50"
                            />
                          ) : (
                            <div className="flex items-center justify-center w-full h-full bg-gray-100">
                              <div className="text-center px-4">
                                <Mic className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 text-gray-400" />
                                <p className="text-xs sm:text-sm text-gray-600 break-all">{messageData.mediaFile?.name}</p>
                              </div>
                            </div>
                          )}
                          <button
                            onClick={() => updateMessageData({ 
                              mediaFile: null, 
                              mediaPreview: null, 
                              mediaUrl: undefined 
                            })}
                            className="absolute top-2 right-2 p-1 sm:p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                            disabled={uploadingMedia === 'uploading'}
                            title="Remover mídia"
                          >
                            <X className="h-3 w-3 sm:h-4 sm:w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 p-3 sm:p-4 border-t border-gray-200">
                <button
                  onClick={handlePreviousStep}
                  className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 text-gray-600 font-medium rounded-lg hover:bg-gray-100 transition-colors text-sm sm:text-base order-2 sm:order-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Voltar
                </button>
                <button
                  onClick={handleNextStep}
                  disabled={!campaignName.trim() || (!messageData.text.trim() && !messageData.mediaFile)}
                  className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base order-1 sm:order-2"
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
              <div className="p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Configure o Envio</h2>
                
                {/* Intervalo entre mensagens */}
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-sm sm:text-base font-medium text-gray-800 mb-3 sm:mb-4">Intervalo entre mensagens</h3>
                  
                  {/* Delay mínimo */}
                  <div className="mb-4">
                    <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 mb-2">
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
                  <div className="mb-3">
                    <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 mb-2">
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
                  
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-700">
                      💡 O delay aleatório entre mensagens ajuda a evitar detecção de spam pelo WhatsApp.
                    </p>
                  </div>
                </div>
                
                {/* Configuração de Blocos */}
                <div className="mb-4 sm:mb-6">
                  <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 mb-3 sm:mb-4">
                    <div>
                      <h3 className="text-sm sm:text-base font-medium text-gray-800">Envio em Blocos</h3>
                      <p className="text-xs text-gray-500 mt-1">Divida o envio em grupos menores</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useBlocks}
                        onChange={(e) => setUseBlocks(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                  
                  {useBlocks && (
                    <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      {/* Tamanho do bloco */}
                      <div>
                        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Contatos por bloco
                          </label>
                          <span className="text-sm font-medium text-primary-600">
                            {blockSize} contatos
                          </span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="500"
                          step="10"
                          value={blockSize}
                          onChange={(e) => setBlockSize(Number(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Pequeno: 10</span>
                          <span>Grande: 500</span>
                        </div>
                      </div>
                      
                      {/* Delay entre blocos */}
                      <div>
                        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Intervalo entre blocos
                          </label>
                          <span className="text-sm font-medium text-primary-600">
                            {Math.floor(delayBetweenBlocks / 60)}min {delayBetweenBlocks % 60}s
                          </span>
                        </div>
                        <input
                          type="range"
                          min="60"
                          max="3600"
                          step="60"
                          value={delayBetweenBlocks}
                          onChange={(e) => setDelayBetweenBlocks(Number(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Rápido: 1min</span>
                          <span>Lento: 60min</span>
                        </div>
                      </div>
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <div className="text-xs text-blue-700">
                            <p className="font-medium mb-2">Como funciona o envio em blocos:</p>
                            <ul className="space-y-1 text-xs">
                              <li>• Seus contatos serão divididos em grupos menores</li>
                              <li>• Cada bloco será enviado como uma campanha separada</li>
                              <li>• Haverá um intervalo entre o envio de cada bloco</li>
                              <li>• Isso ajuda a evitar limitações do WhatsApp</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      
                      {getTotalRecipients() > 0 && (
                        <div className="text-xs sm:text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
                          <strong>Resumo:</strong> {getTotalRecipients()} contatos serão divididos em{' '}
                          <strong>{Math.ceil(getTotalRecipients() / blockSize)} blocos</strong> de até{' '}
                          <strong>{blockSize} contatos</strong> cada.
                        </div>
                      )}
                     </div>
                   )}
                 </div>
                 
                 {/* Modo de envio */}
                <div className="mb-4 sm:mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Modo de Envio *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <button
                      className={cn(
                        "flex flex-col items-center gap-2 sm:gap-3 p-4 sm:p-6 rounded-lg border transition-all",
                        sendMode === 'now'
                          ? "border-primary-600 bg-primary-50 text-primary-700"
                          : "border-gray-200 hover:bg-gray-50"
                      )}
                      onClick={() => setSendMode('now')}
                    >
                      <Send className="h-6 w-6 sm:h-8 sm:w-8" />
                      <span className="font-medium text-sm sm:text-base">Enviar Agora</span>
                    </button>
                    <button
                      className={cn(
                        "flex flex-col items-center gap-2 sm:gap-3 p-4 sm:p-6 rounded-lg border transition-all",
                        sendMode === 'schedule'
                          ? "border-primary-600 bg-primary-50 text-primary-700"
                          : "border-gray-200 hover:bg-gray-50"
                      )}
                      onClick={() => setSendMode('schedule')}
                    >
                      <Clock className="h-6 w-6 sm:h-8 sm:w-8" />
                      <span className="font-medium text-sm sm:text-base">Agendar Envio</span>
                    </button>
                  </div>
                </div>
                
                {/* Opções de agendamento */}
                {sendMode === 'schedule' && (
                  <div className="space-y-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Data de Envio *
                        </label>
                        <div className="relative">
                          <input
                            type="date"
                            value={scheduleDate}
                            onChange={(e) => setScheduleDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full pl-10 pr-3 sm:pr-4 py-2 sm:py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm sm:text-base"
                          />
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Hora de Envio *
                        </label>
                        <div className="relative">
                          <input
                            type="time"
                            value={scheduleTime}
                            onChange={(e) => setScheduleTime(e.target.value)}
                            className="w-full pl-10 pr-3 sm:pr-4 py-2 sm:py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm sm:text-base"
                          />
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 p-3 sm:p-4 border-t border-gray-200">
                <button
                  onClick={handlePreviousStep}
                  className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 text-gray-600 font-medium rounded-lg hover:bg-gray-100 transition-colors text-sm sm:text-base order-2 sm:order-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Voltar
                </button>
                <button
                  onClick={handleNextStep}
                  disabled={sendMode === 'schedule' && (!scheduleDate || !scheduleTime)}
                  className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base order-1 sm:order-2"
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
              <div className="p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Confirme e Envie</h2>
                
                <div className="space-y-4 sm:space-y-6">
                  {/* Resumo da campanha */}
                  <div className="bg-gray-50 rounded-lg p-4 sm:p-6 border border-gray-200">
                    <h3 className="text-base sm:text-lg font-medium mb-3 sm:mb-4">Resumo da Campanha</h3>
                    
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex flex-col xs:flex-row xs:justify-between gap-1">
                        <span className="text-gray-600 text-sm sm:text-base">Nome da Campanha:</span>
                        <span className="font-medium text-sm sm:text-base break-words">{campaignName}</span>
                      </div>
                      
                      <div className="flex flex-col xs:flex-row xs:justify-between gap-1">
                        <span className="text-gray-600 text-sm sm:text-base">Total de Destinatários:</span>
                        <span className="font-medium text-sm sm:text-base">{getTotalRecipients()}</span>
                      </div>
                      
                      <div className="flex flex-col xs:flex-row xs:justify-between gap-1">
                        <span className="text-gray-600 text-sm sm:text-base">Tipo de Mensagem:</span>
                        <span className="font-medium text-sm sm:text-base">
                          {messageData?.type === 'text' ? 'Texto' : messageData?.type === 'media' ? 'Imagem' : 'Áudio'}
                        </span>
                      </div>
                      
                      <div className="flex flex-col xs:flex-row xs:justify-between gap-1">
                        <span className="text-gray-600 text-sm sm:text-base">Intervalo entre mensagens:</span>
                        <span className="font-medium text-sm sm:text-base">{minDelay} a {maxDelay} segundos</span>
                      </div>
                      
                      <div className="flex flex-col xs:flex-row xs:justify-between gap-1">
                        <span className="text-gray-600 text-sm sm:text-base">Modo de Envio:</span>
                        <span className="font-medium text-sm sm:text-base">
                          {sendMode === 'now' ? 'Imediato' : 'Agendado'}
                        </span>
                      </div>
                      
                      {sendMode === 'schedule' && (
                        <div className="flex flex-col xs:flex-row xs:justify-between gap-1">
                          <span className="text-gray-600 text-sm sm:text-base">Data e Hora Agendada:</span>
                          <span className="font-medium text-sm sm:text-base">
                            {new Date(`${scheduleDate}T${scheduleTime}`).toLocaleString('pt-BR')}
                          </span>
                        </div>
                      )}
                      
                      {useBlocks && (
                        <>
                          <div className="flex flex-col xs:flex-row xs:justify-between gap-1">
                            <span className="text-gray-600 text-sm sm:text-base">Envio em Blocos:</span>
                            <span className="font-medium text-blue-600 text-sm sm:text-base">Ativado</span>
                          </div>
                          
                          <div className="flex flex-col xs:flex-row xs:justify-between gap-1">
                            <span className="text-gray-600 text-sm sm:text-base">Contatos por Bloco:</span>
                            <span className="font-medium text-sm sm:text-base">{blockSize}</span>
                          </div>
                          
                          <div className="flex flex-col xs:flex-row xs:justify-between gap-1">
                            <span className="text-gray-600 text-sm sm:text-base">Número de Blocos:</span>
                            <span className="font-medium text-sm sm:text-base">{Math.ceil(getTotalRecipients() / blockSize)}</span>
                          </div>
                          
                          <div className="flex flex-col xs:flex-row xs:justify-between gap-1">
                            <span className="text-gray-600 text-sm sm:text-base">Intervalo entre Blocos:</span>
                            <span className="font-medium text-sm sm:text-base">
                              {Math.floor(delayBetweenBlocks / 60)}min {delayBetweenBlocks % 60}s
                            </span>
                          </div>
                          
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3 sm:mt-4">
                            <div className="flex items-start gap-2">
                              <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                              <div className="text-xs sm:text-sm text-blue-700">
                                <p className="font-medium mb-1">Envio em Blocos Configurado</p>
                                <p>Seus {getTotalRecipients()} contatos serão divididos em {Math.ceil(getTotalRecipients() / blockSize)} blocos. Cada bloco será enviado como uma campanha separada no WhatsApp, com intervalo de {Math.floor(delayBetweenBlocks / 60)} minutos entre eles.</p>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Prévia da mensagem */}
                  <div className="bg-gray-50 rounded-lg p-4 sm:p-6 border border-gray-200">
                    <h3 className="text-base sm:text-lg font-medium mb-3 sm:mb-4">Prévia da Mensagem</h3>
                    
                    <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200">
                      {messageData?.type === 'media' && messageData?.mediaPreview && (
                        <div className="mb-3">
                          <img 
                            src={messageData.mediaPreview} 
                            alt="Preview" 
                            className="max-h-32 sm:max-h-48 rounded-lg mx-auto"
                          />
                        </div>
                      )}
                      
                      <div className="whitespace-pre-wrap text-sm sm:text-base">{messageData?.text}</div>
                    </div>
                  </div>
                  
                  {/* Aviso de responsabilidade */}
                  <div className="bg-amber-50 rounded-lg p-3 sm:p-4 border border-amber-200">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-amber-800 mb-1 text-sm sm:text-base">Aviso Importante</h4>
                        <p className="text-xs sm:text-sm text-amber-700">
                          O envio de mensagens em massa pode violar os termos de serviço do WhatsApp se usado para spam.
                          Use esta ferramenta com responsabilidade e apenas para destinatários que consentiram em receber suas mensagens.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 p-3 sm:p-4 border-t border-gray-200">
                <button
                  onClick={handlePreviousStep}
                  className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 text-gray-600 font-medium rounded-lg hover:bg-gray-100 transition-colors text-sm sm:text-base order-2 sm:order-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Voltar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base order-1 sm:order-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="hidden xs:inline">{sendMode === 'schedule' ? 'Agendando...' : 'Enviando...'}</span>
                      <span className="xs:hidden">{sendMode === 'schedule' ? 'Agendando' : 'Enviando'}</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span className="hidden xs:inline">{sendMode === 'schedule' ? 'Agendar Envio' : 'Enviar Agora'}</span>
                      <span className="xs:hidden">{sendMode === 'schedule' ? 'Agendar' : 'Enviar'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8 text-center">
          <div className="max-w-md mx-auto">
            <Phone className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-gray-400 mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
              Selecione uma Instância
            </h3>
            <p className="text-sm sm:text-base text-gray-500 mb-4 sm:mb-6">
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
