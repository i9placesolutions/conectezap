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
  ChevronLeft,
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
import { filterValidNumbers, addToBlacklist, getBlacklistStats } from '../lib/blacklist';

// Importando o serviço UAZAPI e seus tipos para garantir compatibilidade
import { Group, Contact, uazapiService } from '../services/uazapiService';

// Importando funções do Supabase
import { 
  uploadCampaignMedia, 
  createMassCampaign, 
  updateMassCampaign, 
  MassCampaign 
} from '../lib/supabase';

// Tipo para os dados da mensagem da campanha
interface MessageData {
  type: 'text' | 'media' | 'audio'; // Tipo da mensagem: texto, mídia ou áudio
  text: string; // Conteúdo de texto da mensagem principal
  alternativeTexts: string[]; // Textos alternativos para variação
  useAlternativeTexts: boolean; // Se deve usar textos alternativos
  mediaFile?: File | null; // Arquivo de mídia selecionado pelo usuário
  mediaPreview?: string | null; // URL de preview da mídia para exibição
  mediaUrl?: { url: string; path: string } | null; // URL final da mídia após upload
}

// Configurações anti-spam avançadas
interface AntiSpamConfig {
  validateNumbers: boolean; // Validar números antes do envio
  enableWarmup: boolean; // Sistema de aquecimento gradual
  monitorDelivery: boolean; // Monitorar taxa de entrega
  autoBlacklist: boolean; // Blacklist automática
  smartDelays: boolean; // Delays inteligentes
  maxDailyMessages: number; // Limite diário por instância
  deliveryThreshold: number; // % mínimo de entrega para continuar
}



// Monitoramento de entrega
interface DeliveryStats {
  sent: number;
  delivered: number;
  failed: number;
  rate: number; // Taxa de entrega em %
}

export function MassMessagingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Estado de controle do fluxo da campanha
  const [currentStep, setCurrentStep] = useState<'recipients' | 'message' | 'schedule' | 'confirm'>('recipients'); // Etapa atual do assistente de criação
  const [isSubmitting, setIsSubmitting] = useState(false); // Indica se está enviando a campanha
  const [showContactModal, setShowContactModal] = useState(false); // Controla exibição do modal de seleção de contatos
  const [showGroupModal, setShowGroupModal] = useState(false); // Controla exibição do modal de seleção de grupos
  const [uploadingMedia, setUploadingMedia] = useState<string | null>(null); // Estado do upload de mídia
  const [currentCampaign, setCurrentCampaign] = useState<MassCampaign | null>(null); // Dados da campanha atual
  
  // Estado dos dados da mensagem
  const [messageData, setMessageData] = useState<MessageData>({
    type: 'text', // Tipo padrão: mensagem de texto
    text: '', // Conteúdo da mensagem
    alternativeTexts: [], // Textos alternativos
    useAlternativeTexts: false, // Usar textos alternativos
    mediaFile: null, // Arquivo de mídia
    mediaPreview: null // Preview da mídia
  });
  const [campaignName, setCampaignName] = useState(''); // Nome identificador da campanha
  
  // Estado de configuração de agendamento e timing
  const [minDelay, setMinDelay] = useState(3); // Delay mínimo entre mensagens em segundos
  const [maxDelay, setMaxDelay] = useState(7); // Delay máximo entre mensagens em segundos
  const [sendMode, setSendMode] = useState<'now' | 'schedule'>('now'); // Modo de envio: imediato ou agendado
  const [scheduleDate, setScheduleDate] = useState(''); // Data agendada para envio da campanha
  const [scheduleTime, setScheduleTime] = useState(''); // Horário agendado para envio da campanha
  
  // Estado de configuração de envio em blocos
  const [useBlocks, setUseBlocks] = useState(false); // Habilita envio em blocos para campanhas grandes
  const [blockSize, setBlockSize] = useState(50); // Quantidade de contatos por bloco de envio
  const [delayBetweenBlocks, setDelayBetweenBlocks] = useState(300); // Delay entre blocos em segundos (5 minutos padrão)
  
  // Estado de configuração de pausa automática
  const [useAutoPause, setUseAutoPause] = useState(false); // Habilita pausa automática durante o envio
  const [pauseAfterCount, setPauseAfterCount] = useState(50); // Pausar após X mensagens enviadas
  const [pauseDurationMinutes, setPauseDurationMinutes] = useState(5); // Duração da pausa em minutos
  
  // Estado de seleção de destinatários
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]); // Lista de contatos individuais selecionados
  const [selectedGroups, setSelectedGroups] = useState<Group[]>([]); // Lista de grupos selecionados
  
  // Configurações anti-spam avançadas
  const [antiSpamConfig, setAntiSpamConfig] = useState<AntiSpamConfig>({
    validateNumbers: true,
    enableWarmup: false,
    monitorDelivery: true,
    autoBlacklist: true,
    smartDelays: true,
    maxDailyMessages: 1000,
    deliveryThreshold: 80
  });
  
  // Estados para validação e monitoramento
  const [validatingNumbers, setValidatingNumbers] = useState(false);
  const [deliveryStats] = useState<DeliveryStats>({
    sent: 0,
    delivered: 0,
    failed: 0,
    rate: 0
  });
  const [invalidNumbers, setInvalidNumbers] = useState<string[]>([]);
  const [blacklistedNumbers, setBlacklistedNumbers] = useState<string[]>([]);
  const [blacklistStats, setBlacklistStats] = useState({ total: 0, byReason: {}, recentlyAdded: 0 });
  
  // Estados para monitoramento de blocos em tempo real
  const [blockProgress, setBlockProgress] = useState<{
    isRunning: boolean;
    currentBlock: number;
    totalBlocks: number;
    completedBlocks: number;
    failedBlocks: number;
    currentStatus: string;
  }>({
    isRunning: false,
    currentBlock: 0,
    totalBlocks: 0,
    completedBlocks: 0,
    failedBlocks: 0,
    currentStatus: ''
  });
  
  // Referência à instância do WhatsApp selecionada
  const { selectedInstance, setShowInstanceModal } = useInstance();
  
  // Exibir modal de seleção de instância automaticamente ao carregar a página
  useEffect(() => {
    if (!selectedInstance) {
      setShowInstanceModal(true);
    }
  }, [selectedInstance, setShowInstanceModal]);

  // Carregar estatísticas de blacklist quando instância mudar
  useEffect(() => {
    if (selectedInstance?.id) {
      const stats = getBlacklistStats(selectedInstance.id);
      setBlacklistStats(stats);
    }
  }, [selectedInstance?.id]);

  // Auto-reset do progresso de blocos após timeout (failsafe)
  useEffect(() => {
    if (blockProgress.isRunning) {
      const timeout = setTimeout(() => {
        console.warn('⚠️ Timeout do progresso de blocos - resetando estado');
        setBlockProgress(prev => ({
          ...prev,
          isRunning: false,
          currentStatus: '⏰ Timeout - Verifique os logs para mais detalhes'
        }));
      }, 10 * 60 * 1000); // 10 minutos timeout

      return () => clearTimeout(timeout);
    }
  }, [blockProgress.isRunning]);
  
  // Função para atualizar dados da mensagem de forma incremental
  const updateMessageData = (updates: Partial<MessageData>) => {
    setMessageData(prev => ({ ...prev, ...updates }));
  };
  
  // Funções para gerenciar textos alternativos
  const addAlternativeText = () => {
    if (messageData.alternativeTexts.length < 10) { // Máximo de 10 textos alternativos
      updateMessageData({
        alternativeTexts: [...messageData.alternativeTexts, '']
      });
    }
  };
  
  const updateAlternativeText = (index: number, text: string) => {
    const newTexts = [...messageData.alternativeTexts];
    newTexts[index] = text;
    updateMessageData({
      alternativeTexts: newTexts
    });
  };
  
  const removeAlternativeText = (index: number) => {
    const newTexts = messageData.alternativeTexts.filter((_, i) => i !== index);
    updateMessageData({
      alternativeTexts: newTexts
    });
  };
  
  // Manipulador para upload de arquivo de mídia
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
  
  // Função para navegar para a próxima etapa do fluxo de campanha
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
      
      // Validar textos alternativos se estiverem ativados
      if (messageData.useAlternativeTexts) {
        const validAlternatives = messageData.alternativeTexts.filter(text => text.trim());
        if (validAlternatives.length === 0) {
          toast.error('Adicione pelo menos um texto alternativo válido ou desative as variações');
          return;
        }
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
  
  // Função para navegar para a etapa anterior do fluxo de campanha
  const handlePreviousStep = () => {
    if (currentStep === 'message') {
      setCurrentStep('recipients');
    } else if (currentStep === 'schedule') {
      setCurrentStep('message');
    } else if (currentStep === 'confirm') {
      setCurrentStep('schedule');
    }
  };
  
  // Função para calcular o total de destinatários selecionados
  const getTotalRecipients = (): number => {
    return selectedContacts.length + selectedGroups.length;
  };

  // Função para gerar delay inteligente (distribuição gaussiana)
  const generateSmartDelay = (minDelay: number, maxDelay: number): number => {
    if (!antiSpamConfig.smartDelays) {
      return Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
    }
    
    const mean = (minDelay + maxDelay) / 2;
    const stdDev = (maxDelay - minDelay) / 6;
    
    // Box-Muller transform para distribuição normal
    let u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    const delay = Math.round(mean + z * stdDev);
    
    return Math.max(minDelay, Math.min(maxDelay, delay));
  };

  // Função para validar números antes do envio
  const validateNumbers = async (numbers: string[]): Promise<string[]> => {
    if (!antiSpamConfig.validateNumbers || !selectedInstance?.token) {
      return numbers;
    }

    setValidatingNumbers(true);
    const validNumbers: string[] = [];
    const invalidNums: string[] = [];

    try {
      toast.loading('Validando números no WhatsApp...', { id: 'validating' });
      
      // Processar números em lotes de 20 para não sobrecarregar a API
      const batchSize = 20;
      const batches = [];
      
      for (let i = 0; i < numbers.length; i += batchSize) {
        batches.push(numbers.slice(i, i + batchSize));
      }
      
      let processedCount = 0;
      
      for (const batch of batches) {
        try {
          console.log(`Validando lote de ${batch.length} números...`);
          const results = await uazapiService.checkNumbers(selectedInstance.token, batch);
          
          for (const result of results) {
            if (result.exists) {
              validNumbers.push(result.number);
            } else {
              invalidNums.push(result.number);
              // Adicionar número inválido à blacklist se configurado
              if (antiSpamConfig.autoBlacklist && selectedInstance?.id) {
                addToBlacklist(result.number, 'invalid', selectedInstance.id);
              }
            }
          }
          
          processedCount += batch.length;
          
          // Atualizar progresso
          toast.loading(`Validando números... ${processedCount}/${numbers.length}`, { id: 'validating' });
          
          // Delay entre lotes para não sobrecarregar
          if (batches.length > 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
        } catch (error) {
          console.warn(`Erro ao validar lote de números:`, error);
          // Em caso de erro, incluir todos os números do lote para não bloquear o envio
          for (const number of batch) {
            if (antiSpamConfig.autoBlacklist && selectedInstance?.id) {
              addToBlacklist(number, 'error', selectedInstance.id);
            }
            validNumbers.push(number);
          }
        }
      }

      setInvalidNumbers(invalidNums);
      
      if (invalidNums.length > 0) {
        toast.dismiss('validating');
        toast(`${invalidNums.length} números inválidos foram removidos automaticamente`, { 
          icon: '⚠️',
          duration: 4000 
        });
      } else {
        toast.dismiss('validating');
        toast.success('Todos os números foram validados!');
      }
      
    } catch (error) {
      console.error('Erro na validação:', error);
      toast.dismiss('validating');
      toast.error('Erro na validação. Continuando sem validar.');
      return numbers; // Retorna todos os números em caso de erro
    } finally {
      setValidatingNumbers(false);
    }

    return validNumbers;
  };

  // Função para verificar limite diário
  const checkDailyLimit = (): boolean => {
    if (!antiSpamConfig.enableWarmup) return true;
    
    const today = new Date().toISOString().split('T')[0];
    const storageKey = `warmup_${selectedInstance?.id}_${today}`;
    const todayCount = parseInt(localStorage.getItem(storageKey) || '0');
    
    return todayCount < antiSpamConfig.maxDailyMessages;
  };

  // Função para atualizar contador diário
  const updateDailyCount = (count: number): void => {
    const today = new Date().toISOString().split('T')[0];
    const storageKey = `warmup_${selectedInstance?.id}_${today}`;
    const todayCount = parseInt(localStorage.getItem(storageKey) || '0');
    localStorage.setItem(storageKey, (todayCount + count).toString());
  };



  // Função para aplicar configurações inteligentes baseadas no volume
  const applySmartSettings = (totalRecipients: number): void => {
    if (totalRecipients <= 100) {
      // Campanhas pequenas
      setMinDelay(10);
      setMaxDelay(30);
      setPauseAfterCount(30);
      setPauseDurationMinutes(3);
      setUseBlocks(false);
    } else if (totalRecipients <= 500) {
      // Campanhas médias
      setMinDelay(15);
      setMaxDelay(45);
      setPauseAfterCount(40);
      setPauseDurationMinutes(5);
      setUseBlocks(true);
      setBlockSize(50);
      setDelayBetweenBlocks(600); // 10 minutos
    } else {
      // Campanhas grandes
      setMinDelay(30);
      setMaxDelay(60);
      setPauseAfterCount(25);
      setPauseDurationMinutes(10);
      setUseBlocks(true);
      setBlockSize(Math.min(50, Math.ceil(totalRecipients / 20)));
      setDelayBetweenBlocks(1800); // 30 minutos
    }
  };
  
  // Função principal para envio da campanha de mensagens
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
      let numbers: string[] = [];
      
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

      // === SISTEMA ANTI-SPAM ===
      
      // 1. Verificar limite diário
      if (!checkDailyLimit()) {
        toast.error(`Limite diário de ${antiSpamConfig.maxDailyMessages} mensagens atingido. Tente novamente amanhã.`);
        return;
      }

      // 2. Aplicar configurações inteligentes baseadas no volume
      if (antiSpamConfig.smartDelays) {
        applySmartSettings(numbers.length);
        toast(`Configurações otimizadas aplicadas para ${numbers.length} contatos`, {
          icon: '🎯',
          duration: 3000
        });
      }

      // 3. Filtrar números blacklisted
      if (antiSpamConfig.autoBlacklist && selectedInstance?.id) {
        const { valid, blacklisted } = filterValidNumbers(numbers, selectedInstance.id);
        numbers = valid;
        setBlacklistedNumbers(blacklisted);
        
        if (blacklisted.length > 0) {
          toast(`${blacklisted.length} números foram automaticamente removidos (blacklist)`, {
            icon: '🚫',
            duration: 4000
          });
        }
      }

      // 4. Validar números antes do envio
      if (antiSpamConfig.validateNumbers) {
        numbers = await validateNumbers(numbers);
        
        if (numbers.length === 0) {
          toast.error('Nenhum número válido encontrado após validação');
          return;
        }
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
      
      // Preparar mensagens (principal + alternativas)
      const allMessages = [messageData?.text || ''];
      if (messageData?.useAlternativeTexts) {
        const validAlternatives = messageData.alternativeTexts.filter(text => text.trim());
        allMessages.push(...validAlternatives);
      }

      // Log para debug das variações
      console.log('=== DEBUG VARIAÇÕES ===');
      console.log('Texto principal:', messageData?.text);
      console.log('Usar alternativas:', messageData?.useAlternativeTexts);
      console.log('Textos alternativos brutos:', messageData?.alternativeTexts);
      console.log('Textos alternativos válidos:', messageData?.alternativeTexts.filter(text => text.trim()));
      console.log('Todas as mensagens:', allMessages);
      console.log('========================');

      // Construir objeto de dados para envio
      const massMessageData = {
        campaignName: campaignName,
        message: messageData?.text || '',
        alternativeMessages: messageData?.useAlternativeTexts ? allMessages : undefined,
        numbers: numbers,
        minDelay: antiSpamConfig.smartDelays ? generateSmartDelay(minDelay, maxDelay) * 1000 : minDelay * 1000,
        maxDelay: antiSpamConfig.smartDelays ? generateSmartDelay(minDelay, maxDelay) * 1000 : maxDelay * 1000,
        media: mediaData,
        // Configurações de pausa automática
        autoPause: useAutoPause ? {
          enabled: true,
          pauseAfterCount: pauseAfterCount,
          pauseDurationMinutes: pauseDurationMinutes
        } : undefined,
        // Anti-spam config
        antiSpamConfig: antiSpamConfig,
        // Dados de agendamento, se aplicável
        scheduledFor: sendMode === 'schedule' && scheduleDate && scheduleTime
          ? new Date(`${scheduleDate}T${scheduleTime}`).getTime() // Timestamp em milissegundos
          : undefined
      };

      // Atualizar contador diário se configurado
      if (antiSpamConfig.enableWarmup) {
        updateDailyCount(numbers.length);
      }
      
      console.log('Enviando dados:', massMessageData);
      console.log('Instância selecionada:', selectedInstance);
      console.log('Campanha salva:', savedCampaign);

      // SALVAR CONFIGURAÇÕES ANTES DE RESETAR
      const blockConfig = {
        useBlocks: useBlocks,
        blockSize: blockSize,
        delayBetweenBlocks: delayBetweenBlocks,
        useAutoPause: useAutoPause,
        pauseAfterCount: pauseAfterCount,
        pauseDurationMinutes: pauseDurationMinutes
      };
      
      console.log('=== CONFIGURAÇÃO DE BLOCOS ===');
      console.log('Use Blocks:', blockConfig.useBlocks);
      console.log('Block Size:', blockConfig.blockSize);
      console.log('Total Numbers:', numbers.length);
      console.log('Should Use Blocks:', blockConfig.useBlocks && numbers.length > blockConfig.blockSize);
      console.log('Delay Between Blocks:', blockConfig.delayBetweenBlocks);
      console.log('=============================');
      
      // Mostrar mensagem de sucesso imediatamente e processar em segundo plano
      if (blockConfig.useBlocks && numbers.length > blockConfig.blockSize) {
        const totalBlocks = Math.ceil(numbers.length / blockConfig.blockSize);
        toast.success(`Campanha em ${totalBlocks} blocos iniciada! Acompanhe o progresso na página de relatórios.`);
      } else {
        toast.success('Campanha iniciada! O envio está sendo processado em segundo plano.');
      }
      
      // Resetar o formulário imediatamente
      setCurrentStep('recipients');
      setSelectedContacts([]);
      setSelectedGroups([]);
      setMessageData({ 
        text: '', 
        type: 'text', 
        alternativeTexts: [], 
        useAlternativeTexts: false, 
        mediaFile: null, 
        mediaPreview: null, 
        mediaUrl: null 
      });
      setCampaignName('');
      setSendMode('now');
      setScheduleDate('');
      setScheduleTime('');
      setUseBlocks(false);
      setUseAutoPause(false);
      setPauseAfterCount(50);
      setPauseDurationMinutes(5);
      setCurrentCampaign(null);
      
      // Navegar para a página de relatórios imediatamente
      navigate('/messages/campaigns');
      
      // Processar envio em segundo plano
      setTimeout(async () => {
        try {
          // Verificar se deve enviar em blocos usando as configurações salvas
          if (blockConfig.useBlocks && numbers.length > blockConfig.blockSize) {
            console.log('🚀 === INICIANDO ENVIO EM BLOCOS ===');
            console.log(`📊 Total de contatos: ${numbers.length}`);
            console.log(`📦 Tamanho do bloco: ${blockConfig.blockSize}`);
            console.log(`⏱️ Delay entre blocos: ${blockConfig.delayBetweenBlocks}s`);
            console.log(`📧 Campanha: ${campaignData.campaign_name}`);
            console.log(`🔑 Instância: ${selectedInstance.name || selectedInstance.id}`);
            
            // Validar configurações antes de começar
            if (blockConfig.blockSize <= 0) {
              console.error('❌ Erro: Tamanho do bloco inválido');
              throw new Error('Tamanho do bloco deve ser maior que 0');
            }
            
            if (blockConfig.delayBetweenBlocks < 0) {
              console.error('❌ Erro: Delay entre blocos inválido');
              throw new Error('Delay entre blocos não pode ser negativo');
            }
            
            // Dividir contatos em blocos
            const blocks = [];
            for (let i = 0; i < numbers.length; i += blockConfig.blockSize) {
              blocks.push(numbers.slice(i, i + blockConfig.blockSize));
            }
            
            console.log(`Criados ${blocks.length} blocos:`);
            blocks.forEach((block, index) => {
              console.log(`- Bloco ${index + 1}: ${block.length} contatos`);
            });
            
            // Inicializar monitoramento de progresso
            setBlockProgress({
              isRunning: true,
              currentBlock: 0,
              totalBlocks: blocks.length,
              completedBlocks: 0,
              failedBlocks: 0,
              currentStatus: 'Iniciando envio em blocos...'
            });
            
            let totalSent = 0;
            let totalFailed = 0;
            const folderIds = [];
            const blockResults = [];
            
            // Enviar cada bloco SEQUENCIALMENTE
            for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
              const block = blocks[blockIndex];
              const blockName = `${campaignData.campaign_name} - Bloco ${blockIndex + 1}/${blocks.length}`;
              
              console.log(`\n=== PROCESSANDO BLOCO ${blockIndex + 1}/${blocks.length} ===`);
              console.log(`Contatos neste bloco: ${block.length}`);
              console.log(`Números: ${block.slice(0, 3).join(', ')}${block.length > 3 ? '...' : ''}`);
              
              // Atualizar progresso
              setBlockProgress(prev => ({
                ...prev,
                currentBlock: blockIndex + 1,
                currentStatus: `Enviando bloco ${blockIndex + 1} de ${blocks.length} (${block.length} contatos)`
              }));
              
              const startTime = Date.now();
              
              try {
                const blockData = {
                  ...massMessageData,
                  campaignName: blockName,
                  numbers: block
                };
                
                console.log(`Enviando bloco ${blockIndex + 1}...`);
                
                const blockResult = await uazapiService.sendMassMessage(selectedInstance.token!, blockData);
                
                const endTime = Date.now();
                const duration = Math.round((endTime - startTime) / 1000);
                
                if (blockResult && blockResult.success) {
                  totalSent += block.length;
                  if (blockResult.folder_id) {
                    folderIds.push(blockResult.folder_id);
                  }
                  blockResults.push({
                    blockIndex: blockIndex + 1,
                    success: true,
                    count: block.length,
                    folderId: blockResult.folder_id,
                    duration: duration
                  });
                  
                  console.log(`✅ Bloco ${blockIndex + 1} enviado com sucesso em ${duration}s`);
                  console.log(`   Folder ID: ${blockResult.folder_id}`);
                  
                  // Atualizar progresso - bloco concluído com sucesso
                  setBlockProgress(prev => ({
                    ...prev,
                    completedBlocks: prev.completedBlocks + 1,
                    currentStatus: `Bloco ${blockIndex + 1} concluído com sucesso (${block.length} contatos)`
                  }));
                } else {
                  totalFailed += block.length;
                  blockResults.push({
                    blockIndex: blockIndex + 1,
                    success: false,
                    count: block.length,
                    error: blockResult,
                    duration: duration
                  });
                  
                  console.error(`❌ Erro no bloco ${blockIndex + 1} após ${duration}s:`, blockResult);
                  
                  // Atualizar progresso - bloco com falha
                  setBlockProgress(prev => ({
                    ...prev,
                    failedBlocks: prev.failedBlocks + 1,
                    currentStatus: `Bloco ${blockIndex + 1} falhou (${block.length} contatos)`
                  }));
                }
                
                // Aguardar delay entre blocos (exceto no último bloco)
                if (blockIndex < blocks.length - 1) {
                  console.log(`⏳ Aguardando ${blockConfig.delayBetweenBlocks}s antes do próximo bloco...`);
                  
                  // Atualizar progresso - aguardando
                  setBlockProgress(prev => ({
                    ...prev,
                    currentStatus: `Aguardando ${blockConfig.delayBetweenBlocks}s antes do próximo bloco...`
                  }));
                  
                  // Countdown visual no console e atualização de progresso
                  for (let countdown = blockConfig.delayBetweenBlocks; countdown > 0; countdown--) {
                    if (countdown % 10 === 0 || countdown <= 5) {
                      console.log(`   ${countdown}s restantes...`);
                      setBlockProgress(prev => ({
                        ...prev,
                        currentStatus: `Aguardando ${countdown}s antes do próximo bloco...`
                      }));
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000));
                  }
                  
                  console.log(`✨ Delay concluído! Iniciando bloco ${blockIndex + 2}`);
                }
                
              } catch (blockError) {
                const endTime = Date.now();
                const duration = Math.round((endTime - startTime) / 1000);
                
                console.error(`💥 Erro crítico no bloco ${blockIndex + 1} após ${duration}s:`, blockError);
                totalFailed += block.length;
                
                                 const errorMessage = blockError instanceof Error ? blockError.message : 'Erro desconhecido';
                 
                 blockResults.push({
                   blockIndex: blockIndex + 1,
                   success: false,
                   count: block.length,
                   error: errorMessage,
                   duration: duration
                 });
                 
                 // Atualizar progresso - erro crítico
                 setBlockProgress(prev => ({
                   ...prev,
                   failedBlocks: prev.failedBlocks + 1,
                   currentStatus: `Erro crítico no bloco ${blockIndex + 1}: ${errorMessage}`
                 }));
                 
                 // Em caso de erro crítico, decidir se continua ou para
                 if (errorMessage.includes('token') || errorMessage.includes('auth')) {
                   console.error('🚨 Erro de autenticação detectado. Parando envio de blocos.');
                   setBlockProgress(prev => ({
                     ...prev,
                     currentStatus: '🚨 Envio interrompido: Erro de autenticação'
                   }));
                   break;
                 }
              }
            }
            
            console.log('\n=== RESUMO FINAL DOS BLOCOS ===');
            console.log(`Total de blocos processados: ${blockResults.length}/${blocks.length}`);
            console.log(`Contatos enviados com sucesso: ${totalSent}`);
            console.log(`Contatos com falha: ${totalFailed}`);
            console.log(`Folder IDs criados: ${folderIds.join(', ')}`);
            
            blockResults.forEach(result => {
              const status = result.success ? '✅' : '❌';
              console.log(`${status} Bloco ${result.blockIndex}: ${result.count} contatos em ${result.duration}s`);
              if (result.folderId) console.log(`   Folder ID: ${result.folderId}`);
              if (result.error) console.log(`   Erro: ${result.error}`);
            });
            
            // Atualizar status da campanha com os folder_ids dos blocos
            const finalStatus = totalFailed === 0 ? 'completed' : totalSent > 0 ? 'completed' : 'failed';
            if (savedCampaign?.id) {
              await updateMassCampaign(savedCampaign.id, {
                status: finalStatus,
                sent_count: totalSent,
                failed_count: totalFailed,
                // Salvar os folder_ids dos blocos para controle posterior
                folder_ids: folderIds.join(',')
              });
            }
            
            console.log(`🏁 Campanha em blocos finalizada com status: ${finalStatus}`);
            
            // Finalizar monitoramento de progresso
            setBlockProgress(prev => ({
              ...prev,
              isRunning: false,
              currentStatus: `✅ Campanha finalizada: ${totalSent} enviados, ${totalFailed} falharam`
            }));
            
            // Notificação final para o usuário
            if (totalFailed === 0) {
              toast.success(`🎉 Todos os ${blocks.length} blocos enviados com sucesso! Total: ${totalSent} mensagens`, {
                duration: 6000
              });
            } else if (totalSent > 0) {
              toast(`⚠️ Campanha parcialmente concluída: ${totalSent} enviados, ${totalFailed} falharam`, {
                icon: '📊',
                duration: 6000
              });
            } else {
              toast.error(`❌ Falha no envio: ${totalFailed} mensagens falharam`, {
                duration: 6000
              });
            }
            
          } else {
            // Envio normal (sem blocos)
            const result = await uazapiService.sendMassMessage(selectedInstance.token!, massMessageData);
            
            console.log('Resultado do envio:', result);
            
            if (result && result.success) {
              // Atualizar status da campanha para completed e salvar o folder_id
              if (savedCampaign?.id) {
                const updateData: any = {
                  status: 'completed',
                  sent_count: numbers.length
                };
                
                // Salvar o folder_id para controle posterior
                if (result.folder_id) {
                  updateData.folder_id = result.folder_id;
                  console.log('Salvando folder_id no banco:', result.folder_id);
                }
                
                await updateMassCampaign(savedCampaign.id, updateData);
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

  // Funções para gerenciar seleção de destinatários
  
  // Função para limpar todos os contatos selecionados
  const handleClearContacts = () => {
    setSelectedContacts([]);
  };

  // Função para limpar todos os grupos selecionados
  const handleClearGroups = () => {
    setSelectedGroups([]);
  };

  // Função para navegar para a página de relatórios de campanhas
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

      {/* Monitor de Progresso de Blocos */}
      {blockProgress.isRunning && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <h3 className="text-lg font-semibold text-gray-900">Enviando em Blocos</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Progresso:</span>
              <span className="font-medium">
                Bloco {blockProgress.currentBlock} de {blockProgress.totalBlocks}
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ 
                  width: `${(blockProgress.completedBlocks + blockProgress.failedBlocks) / blockProgress.totalBlocks * 100}%` 
                }}
              ></div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-bold text-green-600">{blockProgress.completedBlocks}</div>
                <div className="text-gray-600">Concluídos</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-red-600">{blockProgress.failedBlocks}</div>
                <div className="text-gray-600">Falharam</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-gray-600">
                  {blockProgress.totalBlocks - blockProgress.completedBlocks - blockProgress.failedBlocks}
                </div>
                <div className="text-gray-600">Restantes</div>
              </div>
            </div>
            
            <div className="text-sm text-gray-600 bg-gray-50 rounded p-2">
              <strong>Status:</strong> {blockProgress.currentStatus}
            </div>
          </div>
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
                      Texto da Mensagem Principal *
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
                      <span>Use variáveis como {'{nome}'} para personalizar</span>
                      <span>{messageData.text.length}/1000</span>
                    </div>
                  </div>
                  
                  {/* Textos Alternativos */}
                  <div className="mb-4 sm:mb-6">
                    <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Variações de Mensagem
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          Adicione textos diferentes para cada mensagem enviada
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={messageData.useAlternativeTexts}
                          onChange={(e) => updateMessageData({ useAlternativeTexts: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>
                    
                    {messageData.useAlternativeTexts && (
                      <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-gray-600">
                            Textos alternativos ({messageData.alternativeTexts.length}/10)
                          </p>
                          <button
                            type="button"
                            onClick={addAlternativeText}
                            disabled={messageData.alternativeTexts.length >= 10}
                            className="flex items-center gap-1 px-3 py-1 text-xs bg-primary-100 text-primary-700 rounded-md hover:bg-primary-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            + Adicionar Texto
                          </button>
                        </div>
                        
                        {messageData.alternativeTexts.map((text, index) => (
                          <div key={index} className="flex gap-2">
                            <div className="flex-1">
                              <textarea
                                rows={3}
                                placeholder={`Variação ${index + 1} da mensagem...`}
                                value={text}
                                onChange={(e) => updateAlternativeText(index, e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-sm"
                              />
                              <div className="text-xs text-gray-500 mt-1">
                                {text.length}/1000
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeAlternativeText(index)}
                              className="p-2 h-fit text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                              title="Remover texto"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        
                        {messageData.alternativeTexts.length === 0 && (
                          <div className="text-center py-4">
                            <p className="text-sm text-gray-500 mb-2">
                              Nenhum texto alternativo adicionado
                            </p>
                            <button
                              type="button"
                              onClick={addAlternativeText}
                              className="text-xs text-primary-600 hover:text-primary-700"
                            >
                              Clique em "Adicionar Texto" para começar
                            </button>
                          </div>
                        )}
                        
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                            <div className="text-xs text-blue-700">
                              <p className="font-medium mb-1">Como funciona:</p>
                              <ul className="space-y-1">
                                <li>• O sistema escolherá aleatoriamente entre o texto principal e os alternativos</li>
                                <li>• Isso torna cada mensagem única e reduz chance de detecção de spam</li>
                                <li>• Deixe textos vazios para removê-los automaticamente</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
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
                  disabled={
                    !campaignName.trim() || 
                    (!messageData.text.trim() && !messageData.mediaFile) ||
                    (messageData.useAlternativeTexts && messageData.alternativeTexts.filter(text => text.trim()).length === 0)
                  }
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
                 
                 {/* Configuração de Pausa Automática */}
                 <div className="mb-4 sm:mb-6">
                   <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 mb-3 sm:mb-4">
                     <div>
                       <h3 className="text-sm sm:text-base font-medium text-gray-800">Pausa Automática</h3>
                       <p className="text-xs text-gray-500 mt-1">Pausar automaticamente durante o envio</p>
                     </div>
                     <label className="relative inline-flex items-center cursor-pointer">
                       <input
                         type="checkbox"
                         checked={useAutoPause}
                         onChange={(e) => setUseAutoPause(e.target.checked)}
                         className="sr-only peer"
                       />
                       <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                     </label>
                   </div>
                   
                   {useAutoPause && (
                     <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                       {/* Quantidade para pausar */}
                       <div>
                         <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 mb-2">
                           <label className="block text-sm font-medium text-gray-700">
                             Pausar após quantas mensagens
                           </label>
                           <span className="text-sm font-medium text-primary-600">
                             {pauseAfterCount} mensagens
                           </span>
                         </div>
                         <input
                           type="range"
                           min="10"
                           max="200"
                           step="10"
                           value={pauseAfterCount}
                           onChange={(e) => setPauseAfterCount(Number(e.target.value))}
                           className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                         />
                         <div className="flex justify-between text-xs text-gray-500 mt-1">
                           <span>Pouco: 10</span>
                           <span>Muito: 200</span>
                         </div>
                       </div>
                       
                       {/* Duração da pausa */}
                       <div>
                         <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 mb-2">
                           <label className="block text-sm font-medium text-gray-700">
                             Duração da pausa
                           </label>
                           <span className="text-sm font-medium text-primary-600">
                             {pauseDurationMinutes} minuto{pauseDurationMinutes !== 1 ? 's' : ''}
                           </span>
                         </div>
                         <input
                           type="range"
                           min="1"
                           max="60"
                           step="1"
                           value={pauseDurationMinutes}
                           onChange={(e) => setPauseDurationMinutes(Number(e.target.value))}
                           className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                         />
                         <div className="flex justify-between text-xs text-gray-500 mt-1">
                           <span>Rápido: 1min</span>
                           <span>Longo: 60min</span>
                         </div>
                       </div>
                       
                       <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                         <div className="flex items-start gap-2">
                           <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                           <div className="text-xs text-blue-700">
                             <p className="font-medium mb-2">Como funciona a pausa automática:</p>
                             <ul className="space-y-1 text-xs">
                               <li>• O sistema pausará automaticamente após enviar {pauseAfterCount} mensagens</li>
                               <li>• Durante a pausa de {pauseDurationMinutes} minuto{pauseDurationMinutes !== 1 ? 's' : ''}, nenhuma mensagem será enviada</li>
                               <li>• Após a pausa, o envio será retomado automaticamente</li>
                               <li>• Isso ajuda a evitar limitações e bloqueios do WhatsApp</li>
                             </ul>
                           </div>
                         </div>
                       </div>
                       
                       {getTotalRecipients() > 0 && (
                         <div className="text-xs sm:text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
                           <strong>Estimativa:</strong> Com {getTotalRecipients()} contatos, haverá aproximadamente{' '}
                           <strong>{Math.ceil(getTotalRecipients() / pauseAfterCount)} pausas</strong> de{' '}
                           <strong>{pauseDurationMinutes} minuto{pauseDurationMinutes !== 1 ? 's' : ''}</strong> cada.
                         </div>
                       )}
                      </div>
                    )}
                  </div>
                 
                 {/* Configurações Anti-Spam */}
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-sm sm:text-base font-medium text-gray-800 mb-3 sm:mb-4">Proteção Anti-Spam</h3>
                  
                  <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Validação de números */}
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-gray-700">Validar Números</span>
                          <p className="text-xs text-gray-500">Verificar se existem no WhatsApp</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={antiSpamConfig.validateNumbers}
                            onChange={(e) => setAntiSpamConfig(prev => ({ ...prev, validateNumbers: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                      </div>

                      {/* Delays inteligentes */}
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-gray-700">Delays Inteligentes</span>
                          <p className="text-xs text-gray-500">Distribuição mais natural</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={antiSpamConfig.smartDelays}
                            onChange={(e) => setAntiSpamConfig(prev => ({ ...prev, smartDelays: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                      </div>

                      {/* Monitoramento */}
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-gray-700">Monitorar Entrega</span>
                          <p className="text-xs text-gray-500">Alertas se delivery baixo</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={antiSpamConfig.monitorDelivery}
                            onChange={(e) => setAntiSpamConfig(prev => ({ ...prev, monitorDelivery: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                      </div>

                      {/* Auto blacklist */}
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-gray-700">Blacklist Auto</span>
                          <p className="text-xs text-gray-500">Remover números com erro</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={antiSpamConfig.autoBlacklist}
                            onChange={(e) => setAntiSpamConfig(prev => ({ ...prev, autoBlacklist: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                      </div>
                    </div>

                    {/* Limite diário */}
                    <div>
                      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Limite diário por instância
                        </label>
                        <span className="text-sm font-medium text-green-600">
                          {antiSpamConfig.maxDailyMessages} mensagens
                        </span>
                      </div>
                      <input
                        type="range"
                        min="100"
                        max="5000"
                        step="100"
                        value={antiSpamConfig.maxDailyMessages}
                        onChange={(e) => setAntiSpamConfig(prev => ({ ...prev, maxDailyMessages: Number(e.target.value) }))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Conservador: 100</span>
                        <span>Agressivo: 5000</span>
                      </div>
                    </div>

                    <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <div className="text-green-600">🛡️</div>
                        <div className="text-xs text-green-700">
                          <p className="font-medium mb-1">Sistema Anti-Spam Ativo</p>
                          <p>Essas configurações ajudam a evitar banimentos e melhoram a taxa de entrega das suas campanhas.</p>
                        </div>
                      </div>
                    </div>
                  </div>
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
                      
                      {messageData?.useAlternativeTexts && (
                        <div className="flex flex-col xs:flex-row xs:justify-between gap-1">
                          <span className="text-gray-600 text-sm sm:text-base">Variações de Texto:</span>
                          <span className="font-medium text-primary-600 text-sm sm:text-base">
                            {messageData.alternativeTexts.filter(text => text.trim()).length + 1} textos diferentes
                          </span>
                        </div>
                      )}
                      
                      <div className="flex flex-col xs:flex-row xs:justify-between gap-1">
                        <span className="text-gray-600 text-sm sm:text-base">Intervalo entre mensagens:</span>
                        <span className="font-medium text-sm sm:text-base">
                          {minDelay} a {maxDelay} segundos {antiSpamConfig.smartDelays && '(Inteligente)'}
                        </span>
                      </div>

                      {/* Configurações Anti-Spam */}
                      <div className="flex flex-col xs:flex-row xs:justify-between gap-1">
                        <span className="text-gray-600 text-sm sm:text-base">Proteção Anti-Spam:</span>
                        <span className="font-medium text-green-600 text-sm sm:text-base">
                          {[
                            antiSpamConfig.validateNumbers && 'Validação',
                            antiSpamConfig.smartDelays && 'Delays Smart',
                            antiSpamConfig.monitorDelivery && 'Monitoramento',
                            antiSpamConfig.autoBlacklist && 'Auto-Blacklist'
                          ].filter(Boolean).join(', ') || 'Desabilitada'}
                        </span>
                      </div>

                      {antiSpamConfig.enableWarmup && (
                        <div className="flex flex-col xs:flex-row xs:justify-between gap-1">
                          <span className="text-gray-600 text-sm sm:text-base">Limite Diário:</span>
                          <span className="font-medium text-sm sm:text-base">{antiSpamConfig.maxDailyMessages} mensagens</span>
                        </div>
                      )}

                      {invalidNumbers.length > 0 && (
                        <div className="flex flex-col xs:flex-row xs:justify-between gap-1">
                          <span className="text-gray-600 text-sm sm:text-base">Números Inválidos:</span>
                          <span className="font-medium text-red-600 text-sm sm:text-base">{invalidNumbers.length} removidos</span>
                        </div>
                      )}

                      {blacklistedNumbers.length > 0 && (
                        <div className="flex flex-col xs:flex-row xs:justify-between gap-1">
                          <span className="text-gray-600 text-sm sm:text-base">Números Blacklisted:</span>
                          <span className="font-medium text-orange-600 text-sm sm:text-base">{blacklistedNumbers.length} removidos</span>
                        </div>
                      )}

                      {blacklistStats.total > 0 && (
                        <div className="flex flex-col xs:flex-row xs:justify-between gap-1">
                          <span className="text-gray-600 text-sm sm:text-base">Total na Blacklist:</span>
                          <span className="font-medium text-gray-600 text-sm sm:text-base">{blacklistStats.total} números</span>
                        </div>
                      )}
                      
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
                      
                      {useAutoPause && (
                        <>
                          <div className="flex flex-col xs:flex-row xs:justify-between gap-1">
                            <span className="text-gray-600 text-sm sm:text-base">Pausa Automática:</span>
                            <span className="font-medium text-orange-600 text-sm sm:text-base">Ativada</span>
                          </div>
                          
                          <div className="flex flex-col xs:flex-row xs:justify-between gap-1">
                            <span className="text-gray-600 text-sm sm:text-base">Pausar a cada:</span>
                            <span className="font-medium text-sm sm:text-base">{pauseAfterCount} mensagens</span>
                          </div>
                          
                          <div className="flex flex-col xs:flex-row xs:justify-between gap-1">
                            <span className="text-gray-600 text-sm sm:text-base">Duração da pausa:</span>
                            <span className="font-medium text-sm sm:text-base">{pauseDurationMinutes} minuto{pauseDurationMinutes !== 1 ? 's' : ''}</span>
                          </div>
                          
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-3 sm:mt-4">
                            <div className="flex items-start gap-2">
                              <Info className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                              <div className="text-xs sm:text-sm text-orange-700">
                                <p className="font-medium mb-1">Pausa Automática Configurada</p>
                                <p>O envio pausará automaticamente a cada {pauseAfterCount} mensagens por {pauseDurationMinutes} minuto{pauseDurationMinutes !== 1 ? 's' : ''}. Com {getTotalRecipients()} contatos, haverá aproximadamente {Math.ceil(getTotalRecipients() / pauseAfterCount)} pausas.</p>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Prévia da mensagem */}
                  <div className="bg-gray-50 rounded-lg p-4 sm:p-6 border border-gray-200">
                    <h3 className="text-base sm:text-lg font-medium mb-3 sm:mb-4">
                      Prévia da{messageData?.useAlternativeTexts ? 's' : ''} Mensage{messageData?.useAlternativeTexts ? 'ns' : 'm'}
                    </h3>
                    
                    {messageData?.useAlternativeTexts ? (
                      <div className="space-y-3">
                        {/* Texto principal */}
                        <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200">
                          <div className="text-xs font-medium text-primary-600 mb-2">Texto Principal:</div>
                          {messageData?.type === 'media' && messageData?.mediaPreview && (
                            <div className="mb-3">
                              <img 
                                src={messageData.mediaPreview} 
                                alt="Preview" 
                                className="max-h-24 sm:max-h-32 rounded-lg mx-auto"
                              />
                            </div>
                          )}
                          <div className="whitespace-pre-wrap text-sm sm:text-base">{messageData?.text}</div>
                        </div>
                        
                        {/* Textos alternativos */}
                        {messageData.alternativeTexts.filter(text => text.trim()).map((text, index) => (
                          <div key={index} className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200">
                            <div className="text-xs font-medium text-gray-600 mb-2">Variação {index + 1}:</div>
                            <div className="whitespace-pre-wrap text-sm sm:text-base">{text}</div>
                          </div>
                        ))}
                        
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                            <div className="text-xs text-blue-700">
                              <p className="font-medium mb-1">Sistema de Variação</p>
                              <p>Uma dessas {messageData.alternativeTexts.filter(text => text.trim()).length + 1} mensagens será escolhida aleatoriamente para cada destinatário.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
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
                    )}
                  </div>
                  
                  {/* Estatísticas de validação */}
                  {(validatingNumbers || invalidNumbers.length > 0 || blacklistedNumbers.length > 0) && (
                    <div className="bg-blue-50 rounded-lg p-3 sm:p-4 border border-blue-200">
                      <h4 className="font-medium text-blue-800 mb-2 text-sm sm:text-base">Status de Validação</h4>
                      {validatingNumbers ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                          <span className="text-sm text-blue-700">Validando números no WhatsApp...</span>
                        </div>
                      ) : (
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-blue-700">Números válidos:</span>
                            <span className="font-medium text-blue-800">{getTotalRecipients() - invalidNumbers.length - blacklistedNumbers.length}</span>
                          </div>
                          {invalidNumbers.length > 0 && (
                            <div className="flex justify-between">
                              <span className="text-red-600">Números inválidos:</span>
                              <span className="font-medium text-red-700">{invalidNumbers.length}</span>
                            </div>
                          )}
                          {blacklistedNumbers.length > 0 && (
                            <div className="flex justify-between">
                              <span className="text-orange-600">Números blacklisted:</span>
                              <span className="font-medium text-orange-700">{blacklistedNumbers.length}</span>
                            </div>
                          )}
                          {blacklistStats.total > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Total na blacklist:</span>
                              <span className="font-medium text-gray-700">{blacklistStats.total}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Estatísticas de entrega (se monitoramento ativo) */}
                  {antiSpamConfig.monitorDelivery && deliveryStats.sent > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
                      <h4 className="font-medium text-gray-800 mb-2 text-sm sm:text-base">Taxa de Entrega</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div className="text-center">
                          <div className="font-bold text-blue-600">{deliveryStats.sent}</div>
                          <div className="text-gray-600">Enviadas</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-green-600">{deliveryStats.delivered}</div>
                          <div className="text-gray-600">Entregues</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-red-600">{deliveryStats.failed}</div>
                          <div className="text-gray-600">Falharam</div>
                        </div>
                        <div className="text-center">
                          <div className={`font-bold ${deliveryStats.rate >= 80 ? 'text-green-600' : deliveryStats.rate >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {deliveryStats.rate.toFixed(1)}%
                          </div>
                          <div className="text-gray-600">Taxa</div>
                        </div>
                      </div>
                      {deliveryStats.rate < 80 && deliveryStats.delivered + deliveryStats.failed > 10 && (
                        <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs text-yellow-700">
                          ⚠️ Taxa de entrega baixa. Considere revisar as configurações ou pausar o envio.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Recomendações inteligentes */}
                  <div className="bg-purple-50 rounded-lg p-3 sm:p-4 border border-purple-200">
                    <h4 className="font-medium text-purple-800 mb-2 text-sm sm:text-base">💡 Recomendações</h4>
                    <div className="space-y-1 text-xs text-purple-700">
                      {getTotalRecipients() > 1000 && !useBlocks && (
                        <p>• Para {getTotalRecipients()} contatos, recomendamos ativar o envio em blocos</p>
                      )}
                      {maxDelay < 30 && getTotalRecipients() > 500 && (
                        <p>• Para campanhas grandes, considere aumentar o delay máximo para 30-60s</p>
                      )}
                      {!antiSpamConfig.validateNumbers && (
                        <p>• Ative a validação de números para melhorar a taxa de entrega</p>
                      )}
                      {!messageData?.useAlternativeTexts && getTotalRecipients() > 100 && (
                        <p>• Use variações de texto para parecer mais natural</p>
                      )}
                      {sendMode === 'now' && new Date().getHours() < 8 && (
                        <p>• Considere agendar para horário comercial (8h-18h)</p>
                      )}
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
