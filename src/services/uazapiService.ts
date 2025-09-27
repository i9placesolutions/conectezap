import axios from 'axios';
import { getCurrentServerConfig } from './api';

// Função para obter a URL base atual do servidor selecionado
const getBaseURL = () => {
  return getCurrentServerConfig().url;
};

// Interfaces para os tipos de dados
export interface Contact {
  id: string;
  name: string;
  number: string;
  jid?: string;
  pushName?: string;
  isGroup?: boolean;
  isMyContact?: boolean;
}

export interface Group {
  id: string;
  name: string;
  participantsCount: number;
  jid?: string;
  owner?: string;
  creation?: number;
  participants?: any[];
  isGroup: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  info?: string;
  status: 'scheduled' | 'running' | 'completed' | 'paused' | 'cancelled' | 'failed' | 'ativo';
  createdAt: string;
  scheduledAt?: string;
  scheduledFor?: number;
  totalRecipients: number;
  successCount: number;
  errorCount: number;
  pendingCount: number;
  progress: number;
  messageType: 'text' | 'media' | 'audio';
  // Campos adicionais da API UAZAPI
  delayMax?: number;
  delayMin?: number;
  log_delivered?: number;
  log_failed?: number;
  log_played?: number;
  log_read?: number;
  log_sucess?: number;
  log_total?: number;
  owner?: string;
  created?: string;
  updated?: string;
}

export interface Message {
  id: string;
  chatId: string;
  fromMe: boolean;
  timestamp: number;
  body: string;
  type: string;
  mediaUrl?: string;
  quotedMsg?: any;
  isForwarded?: boolean;
  author?: string;
  pushName?: string;
  status?: 'pending' | 'sent' | 'received' | 'read';
}

export interface Chat {
  id: string;
  name: string;
  isGroup: boolean;
  unreadCount: number;
  lastMessage?: Message;
  lastMessageTimestamp?: number;
  isArchived?: boolean;
  isPinned?: boolean;
  isMuted?: boolean;
  muteEndTime?: number;
  labels?: Label[];
  profilePicUrl?: string;
}

export interface Label {
  id: string;
  name: string;
  color: number;
}

export interface BlockedContact {
  id: string;
  number: string;
  name?: string;
  jid: string;
}

// Criando instância axios com configurações dinâmicas
const createApiClient = () => {
  return axios.create({
    baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  }
});
};

// Serviço para interagir com a API UAZAPI
// Interface para rastreamento de campanhas em andamento
interface CampaignProgress {
  id: string;
  name: string;
  totalRecipients: number;
  sent: number;
  errors: number;
  status: 'running' | 'paused' | 'completed' | 'cancelled' | 'scheduled' | 'failed';
  results: any[];
  startTime: Date;
  progress: number;
  intervalId?: NodeJS.Timeout | null;
}

// Armazenamento local para campanhas ativas
const activeCampaigns: Record<string, CampaignProgress> = {};

export const uazapiService = {
  // Método para buscar contatos da instância
  async getContacts(instanceToken: string): Promise<Contact[]> {
    try {
      console.log('Buscando contatos com token:', instanceToken);
      
      if (!instanceToken) {
        console.error('Token de instância não fornecido');
        return [];
      }
      
      const api = createApiClient();
      
      // Enviando o token como header conforme documentação da UAZAPI
      const response = await api.get('/contacts', {
        headers: {
          'Accept': 'application/json',
          'token': instanceToken
        }
      });
      
      console.log('Resposta da API (contatos):', response.data);
      
      // Se não houver dados ou a resposta não for um array, retorna array vazio
      if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
        console.log('Nenhum contato retornado pela API');
        return [];
      }
      
      // Exemplo para debug
      if (response.data.length > 0) {
        console.log('Exemplo de contato retornado pela API:', response.data[0]);
      }
      
      // Transforma os dados retornados usando os campos corretos da API
      return response.data
        .filter((contact: any) => contact.jid && !contact.jid.includes('@g.us'))
        .map((contact: any) => ({
          id: contact.jid || '',
          name: contact.contactName || contact.contact_FirstName || 'Sem nome',
          number: contact.jid?.split('@')[0] || '',
          jid: contact.jid,
          pushName: contact.pushName,
          isGroup: false,
          isMyContact: !!contact.isMyContact
        }));
    } catch (error) {
      console.error('Erro ao buscar contatos:', error);
      // Adicionar mais detalhes sobre o erro para debug
      if (axios.isAxiosError(error)) {
        console.error('Detalhes do erro:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url
        });
      }
      return []; // Retorna array vazio em caso de erro para evitar quebrar a aplicação
    }
  },
  
  // Método para buscar grupos da instância
  async getGroups(instanceToken: string, forceUpdate: boolean = false): Promise<Group[]> {
    try {
      console.log('Buscando grupos com token:', instanceToken);
      console.log('Servidor atual:', getBaseURL());
      
      if (!instanceToken) {
        console.error('Token de instância não fornecido');
        return [];
      }
      
      const api = createApiClient();
      
      // Usar a rota correta conforme documentado: /group/list
      const response = await api.get('/group/list', {
        headers: {
          'Accept': 'application/json',
          'token': instanceToken
        },
        params: {
          force: forceUpdate
        }
      });
      
      console.log('Resposta da API (grupos):', response.data);
      
      // A resposta da API pode vir em diferentes formatos, verificando todos
      let groupsData: any[] = [];
      
      if (response.data?.groups && Array.isArray(response.data.groups)) {
        // Formato documentado oficial: { groups: [...] }
        groupsData = response.data.groups;
        console.log('Usando formato oficial { groups: [...] }');
      } else if (Array.isArray(response.data)) {
        // Formato alternativo: array direto
        groupsData = response.data;
        console.log('Usando formato de array direto');
      } else {
        console.error('Formato de dados não reconhecido:', response.data);
        return [];
      }
      
      console.log(`Encontrados ${groupsData.length} grupos`);
      
      // Se não houver dados, retorna array vazio
      if (!groupsData || groupsData.length === 0) {
        console.log('Nenhum grupo retornado pela API');
        return [];
      }
      
      // Log de exemplo para debug
      if (groupsData.length > 0) {
        console.log('Exemplo de grupo retornado pela API:', groupsData[0]);
      }
      
      return groupsData
        .filter((group: any) => {
          // Filtra apenas grupos válidos
          // Verifica se é um grupo pelo JID ou pelo ID que termina com @g.us
          return (group.JID && group.JID.includes('@g.us')) || 
                 (group.jid && group.jid.includes('@g.us')) ||
                 (typeof group.id === 'string' && group.id.includes('@g.us'));
        })
        .map((group: any) => ({
          // Mapeia os campos usando formato oficial e alternativo
          id: group.JID || group.jid || group.id || '',
          name: group.Name || group.name || group.subject || 'Grupo sem nome',
          participantsCount: Array.isArray(group.Participants) ? group.Participants.length : 
                            (Array.isArray(group.participants) ? group.participants.length : 0),
          jid: group.JID || group.jid || group.id,
          owner: group.OwnerJID || group.owner || '',
          creation: group.GroupCreated || group.creation || '',
          participants: group.Participants || group.participants || [],
          isGroup: true
        }));
    } catch (error) {
      console.error('Erro ao buscar grupos:', error);
      // Adicionar mais detalhes sobre o erro para debug
      if (axios.isAxiosError(error)) {
        console.error('Detalhes do erro:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url
        });
      }
      return [];
    }
  },
  
  // Método para enviar mensagem em massa usando /sender/advanced
  async sendMassMessage(instanceToken: string, data: any): Promise<any> {
    try {
      console.log('=== INÍCIO ENVIO MASSA AVANÇADO ===');
      console.log('Token recebido:', instanceToken);
      console.log('Token presente:', !!instanceToken);
      console.log('Tipo do token:', typeof instanceToken);
      console.log('Comprimento do token:', instanceToken ? instanceToken.length : 0);
      console.log('Dados completos recebidos:', JSON.stringify(data, null, 2));
      console.log('Enviando mensagem em massa usando endpoint /sender/advanced:', data);
      
      // Validar dados obrigatórios
      console.log('Validando números:', {
        hasNumbers: !!data.numbers,
        isArray: Array.isArray(data.numbers),
        length: data.numbers ? data.numbers.length : 0,
        content: data.numbers
      });
      
      if (!data.numbers || !Array.isArray(data.numbers) || data.numbers.length === 0) {
        console.error('ERRO: Lista de números inválida!');
        throw new Error('Lista de números é obrigatória e deve conter pelo menos um número');
      }
      
      if (!data.message && !data.media) {
        throw new Error('Mensagem de texto ou mídia é obrigatória');
      }
      
      // Validar token
      if (!instanceToken) {
        throw new Error('Token da instância é obrigatório');
      }
      
      const numbers = data.numbers || [];
      console.log('Array de números recebido:', {
        length: numbers.length,
        first5: numbers.slice(0, 5),
        isArray: Array.isArray(numbers),
        type: typeof numbers
      });
      
      const minDelay = data.minDelay || 3; // Já em segundos
        const maxDelay = data.maxDelay || 7; // Já em segundos
      
      // Criar ID único para a campanha
      const campaignId = `campaign_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      // Registrar a campanha para acompanhamento
      activeCampaigns[campaignId] = {
        id: campaignId,
        name: data.campaignName || 'Campanha sem nome',
        totalRecipients: numbers.length,
        sent: 0,
        errors: 0,
        status: 'running',
        results: [],
        startTime: new Date(),
        progress: 0
      };
      
      // Agora enviamos URLs diretamente, sem conversão para base64
      
      // Preparar dados de mídia uma única vez para evitar duplicação
      let mediaConfig: any = null;
      if (data.media) {
        // Usar URL diretamente do Supabase
        mediaConfig = {
          file: data.media.data, // URL direta do Supabase
          docName: data.media.filename || undefined,
          mimetype: data.media.mimetype
        };
        console.log('mediaConfig configurado:', {
          hasFile: !!mediaConfig.file,
          fileUrl: mediaConfig.file,
          mimetype: mediaConfig.mimetype,
          docName: mediaConfig.docName
        });
      }
      
      // Preparar array de mensagens para o endpoint /sender/advanced
      console.log('Iniciando preparação de mensagens para', numbers.length, 'números');
      
      // Nova estrutura: criar mensagens individuais para cada contato
      // Determinar o tipo de mensagem com base na presença de mídia
      let messageType = 'text';
      if (mediaConfig) {
        if (data.media?.mimetype.startsWith('image/')) {
          messageType = 'image';
        } else if (data.media?.mimetype.startsWith('video/')) {
          messageType = 'video';
        } else if (data.media?.mimetype.startsWith('audio/')) {
          messageType = 'audio';
        } else {
          messageType = 'document';
        }
      }
      
      // Criar mensagens individuais para cada número
      const messages: any[] = [];
      
      // Preparar array de mensagens disponíveis (principal + alternativas)
      const availableMessages: string[] = [];
      
      // Se há variações habilitadas, usar todas as mensagens do array alternativeMessages
      if (data.alternativeMessages && Array.isArray(data.alternativeMessages)) {
        // Usar todas as mensagens válidas (incluindo a principal que já está no array)
        const validMessages = data.alternativeMessages.filter((text: string) => text && text.trim());
        availableMessages.push(...validMessages);
      } else if (data.message) {
        // Se não há variações, usar apenas a mensagem principal
        availableMessages.push(data.message);
      }

      console.log('Mensagens disponíveis para variação:', {
          totalTextos: availableMessages.length,
          usandoVariacoes: availableMessages.length > 1,
          textos: availableMessages.map((text: string) => text.substring(0, 50) + '...')
        });
      
      for (const number of numbers) {
        const message: any = {
          number: number, // Número individual
          type: messageType
        };
        
        // Escolher texto aleatoriamente entre as opções disponíveis
        if (availableMessages.length > 0) {
          if (availableMessages.length === 1) {
            // Se há apenas uma mensagem, usar ela
            message.text = availableMessages[0];
          } else {
            // Se há múltiplas mensagens, escolher uma aleatoriamente
            const randomIndex = Math.floor(Math.random() * availableMessages.length);
            message.text = availableMessages[randomIndex];
            
            console.log(`Contato ${number.substring(0, 5)}***: usando texto ${randomIndex + 1}/${availableMessages.length}`);
          }
        }
        
        // Se for mídia, adicionar configurações usando URL direta
        if (mediaConfig) {
          message.file = mediaConfig.file; // URL direta do Supabase
          
          if (mediaConfig.docName && messageType === 'document') {
            message.docName = mediaConfig.docName;
          }
        }
        
        messages.push(message);
      }
      
      console.log('Mensagens preparadas para envio:', {
        totalMessages: messages.length,
        totalContacts: numbers.length,
        messageStructure: {
          type: messageType,
          hasText: !!data.message,
          hasFile: !!mediaConfig?.file,
          firstNumber: messages[0]?.number ? messages[0].number.substring(0, 5) + '***' : 'N/A',
          fileSize: mediaConfig?.file ? mediaConfig.file.length : 0
        },
        hasValidMessages: messages.length > 0,
        allHaveNumbers: messages.every((msg: any) => msg.number && msg.number.length > 0),
        allHaveType: messages.every((msg: any) => msg.type)
      });
      
      // URLs não precisam de validação de tamanho como base64
      // O arquivo já está armazenado no Supabase

      interface CampaignProcessingData {
        delayMin: number;
        delayMax: number;
        info: string;
        messages: any[]; // Idealmente, tipar os objetos de mensagem aqui também
        scheduled_for?: number;
        autoPause?: {
          enabled: boolean;
          pauseAfterCount: number;
          pauseDurationMinutes: number;
        };
      }
      
      const requestData: CampaignProcessingData = {
        delayMin: minDelay,
        delayMax: maxDelay,
        info: data.campaignName || 'Campanha ConecteZap',
        messages: messages
        // scheduled_for será undefined por padrão, o que é ok para opcional
      };
      
      // Se for agendada, processar e adicionar o timestamp (em milissegundos)
      if (data.scheduledFor) {
        if (data.scheduledFor instanceof Date) {
          requestData.scheduled_for = data.scheduledFor.getTime();
        } else if (typeof data.scheduledFor === 'number') {
          requestData.scheduled_for = data.scheduledFor;
        } else {
          // Log ou tratamento para tipo inesperado de data.scheduledFor, se necessário
          console.warn('Tipo inesperado para data.scheduledFor:', data.scheduledFor);
        }
      }

      // Função para enviar todas as mensagens de uma vez
      const sendAdvancedMessage = async (requestData: CampaignProcessingData) => {
        console.log('Enviando todas as', requestData.messages.length, 'mensagens de uma vez');
        
        // Validar estrutura antes do envio
        if (!requestData.messages || requestData.messages.length === 0) {
          throw new Error('Nenhuma mensagem válida para enviar');
        }
        
        // Validar cada mensagem
        for (const msg of requestData.messages) {
          if (!msg.number || !msg.type) {
            throw new Error(`Mensagem inválida: ${JSON.stringify(msg)}`);
          }
          
          // Validar formato do número (deve ter pelo menos 10 dígitos)
          const cleanNumber = msg.number.replace(/\D/g, '');
          if (cleanNumber.length < 10) {
            throw new Error(`Número inválido: ${msg.number}`);
          }
        }
        
        console.log('Enviando para /sender/advanced:', {
          url: '/sender/advanced',
          method: 'POST',
          headers: { token: instanceToken ? 'presente' : 'ausente' },
          messagesCount: requestData.messages.length
        });
        
        try {
          // Abordagem simplificada para envio em massa via /sender/advanced
          console.log(`Preparando ${requestData.messages.length} contatos para envio via /sender/advanced`);
          
          // Extraímos todos os números em um array
          const phones = requestData.messages.map((msg: any) => msg.number);
          
          // Log detalhado para debug
          console.log('DEBUG - Números extraídos:', {
            totalContatos: phones.length,
            primeiros5Numeros: phones.slice(0, 5),
            ultimos5Numeros: phones.slice(-5)
          });
          
          // Estratégia: Uma única campanha com todas as mensagens
          // As mensagens já vêm individuais do sendMassMessage
          const massMessages = requestData.messages;
          
          console.log(`Enviando ${massMessages.length} mensagens em uma única campanha`);
          
          // Definindo o tipo para o payload
          interface UazapiSenderAdvancedPayload {
            delayMin: number;
            delayMax: number;
            info: string;
            messages: any[];
            scheduled_for?: number;
            autoPause?: {
              enabled: boolean;
              pauseAfterCount: number;
              pauseDurationMinutes: number;
            };
          }
          
          // Construir o payload com todas as mensagens
          // A API UAZAPI espera delayMin e delayMax em segundos, não em milissegundos
          const baseDelayMin = requestData.delayMin || 1;
          const baseDelayMax = requestData.delayMax || 3;
          
          console.log('⏱️ Configurações de delay:', {
            delayMinEnviado: baseDelayMin,
            delayMaxEnviado: baseDelayMax,
            unidade: 'segundos'
          });
          
          const payload: UazapiSenderAdvancedPayload = {
            delayMin: baseDelayMin,
            delayMax: baseDelayMax,
            info: requestData.info || 'Campanha ConecteZap',
            messages: massMessages
          };
          
          // Adicionar scheduled_for se estiver definido
          if (requestData.scheduled_for) {
            payload.scheduled_for = requestData.scheduled_for;
          }
          
          // Adicionar configurações de pausa automática se estiverem habilitadas
          // NOTA: A API UAZAPI pode não processar nativamente essas configurações de pausa automática
          // Essas configurações são enviadas para compatibilidade futura ou processamento customizado
          if (requestData.autoPause && requestData.autoPause.enabled) {
            payload.autoPause = {
              enabled: true,
              pauseAfterCount: requestData.autoPause.pauseAfterCount,
              pauseDurationMinutes: requestData.autoPause.pauseDurationMinutes
            };
            console.log('⏸️ Configurações de pausa automática incluídas no payload:', payload.autoPause);
          }
          
          console.log('Estrutura da campanha única:', {
            totalMessages: massMessages.length,
            totalContacts: phones.length,
            tipo: massMessages[0]?.file ? (massMessages[0]?.docName ? 'document' : 'image') : 'text',
            primeirosContatos: phones.slice(0, 3).map(p => p.substring(0, 5) + '***'),
            primeirasMensagens: massMessages.slice(0, 3).map(msg => ({
              number: msg.number.substring(0, 5) + '***',
              type: msg.type,
              hasText: !!msg.text,
              hasFile: !!msg.file
            })),
            delayMin: payload.delayMin,
            delayMax: payload.delayMax,
            scheduled_for: payload.scheduled_for || 'não agendado',
            autoPause: payload.autoPause || 'desabilitado'
          });
          
          // Fazer a requisição para o endpoint /sender/advanced
          const api = createApiClient(); const response = await api.post('/sender/advanced', payload, {
            headers: {
              'token': instanceToken
            },
            timeout: 300000 // 5 minutos de timeout para grandes volumes
          });
          
          console.log('Campanha única enviada com sucesso:', {
            status: response.status,
            folder_id: response.data?.folder_id,
            count: response.data?.count,
            data: response.data
          });
          
          return response.data;
          
        } catch (error: any) {
          console.error('Erro detalhado no envio via /sender/advanced:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message,
            config: {
              url: error.config?.url,
              method: error.config?.method,
              baseURL: error.config?.baseURL
            },
            requestData: {
              delayMin: requestData.delayMin,
              delayMax: requestData.delayMax,
              info: requestData.info,
              messagesCount: requestData.messages?.length || 0
            }
          });
          
          console.error('Resposta completa do erro:', error.response);
          console.error('Dados da resposta de erro:', error.response?.data);
          console.error('Headers enviados:', { 
            token: instanceToken ? 'presente' : 'ausente',
            'Content-Type': 'application/json'
          });
          console.error('URL completa:', `${getBaseURL()}/sender/advanced`);
          console.error('Dados enviados parcial:', {
            totalMessages: requestData.messages?.length || 0,
            firstMessageNumber: requestData.messages?.[0]?.number || 'N/A',
            firstMessageType: requestData.messages?.[0]?.type || 'text'
          });
          throw error;
        }
      };
      
      try {
        console.log(`Preparando envio de ${messages.length} mensagens`);
        
        if (messages.length === 0) {
          throw new Error('Nenhuma mensagem válida para enviar.');
        }
        
        // Preparar dados para o envio
        
        // Enviar todas as mensagens de uma vez
        const result = await sendAdvancedMessage(requestData);
        
        // Verificar se as mensagens foram agendadas ou enviadas imediatamente
        const isScheduled = data.scheduledFor && data.scheduledFor > Date.now();
        
        // Atualizar estatísticas da campanha
        if (isScheduled) {
          // Se foi agendado, marcar como scheduled
          activeCampaigns[campaignId].status = 'scheduled';
          activeCampaigns[campaignId].progress = 100; // Agendamento concluído
          activeCampaigns[campaignId].sent = 0; // Ainda não foi enviado
        } else {
          // Se foi enviado imediatamente, marcar como completed
          activeCampaigns[campaignId].status = 'completed';
          activeCampaigns[campaignId].progress = 100;
          activeCampaigns[campaignId].sent = messages.length;
        }
        
        // Extrair números para resultados
        const numbersForResults = messages.map((msg: any) => msg.number);
        activeCampaigns[campaignId].results = numbersForResults.map((number: string) => ({
          number,
          success: !isScheduled && result && ((result as any).success || (result as any).status === 'success'),
          data: result // Usar o resultado da API
        }));
        
        console.log(`Campanha única enviada com sucesso via /sender/advanced:`, {
          folder_id: result.folder_id,
          count: result.count,
          status: result.status
        });
        
        return {
          success: true,
          message: 'Campanha única enviada com sucesso via endpoint /sender/advanced!',
          campaignId,
          results: result,
          endpoint: '/sender/advanced',
          totalSent: messages.length,
          folder_id: result.folder_id
        };
        
      } catch (error) {
        console.error('Erro ao enviar mensagem em massa:', error);
        
        // Atualizar estatísticas em caso de erro
        activeCampaigns[campaignId].errors = messages.length;
        activeCampaigns[campaignId].status = 'cancelled'; // usado 'cancelled' em vez de 'failed'
        // Extrair números para resultados de erro
        const phoneNumbers = messages.map((msg: any) => msg.number);
        activeCampaigns[campaignId].results = phoneNumbers.map((number: string) => ({
          number,
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        }));
        
        throw error;
      }
      
    } catch (error) {
      console.error('Erro ao preparar mensagem em massa:', error);
      throw error;
    }
  },
  
  // Método para enviar mensagem agendada através da API UAZAPI
  async sendScheduledMessage(instanceToken: string, data: any): Promise<any> {
    try {
      console.log('Enviando mensagem agendada para a API UAZAPI');
      
      // Criar ID único para a campanha
      const campaignId = `scheduled_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      // Registrar a campanha para acompanhamento
      activeCampaigns[campaignId] = {
        id: campaignId,
        name: data.campaignName || 'Campanha agendada',
        totalRecipients: data.numbers.length,
        sent: 0,
        errors: 0,
        status: 'scheduled',
        results: [],
        startTime: new Date(),
        progress: 0
      };
      
      const results = [];
      const numbers = data.numbers || [];
      
      // Determinar qual endpoint usar com base no tipo de mensagem
      let endpoint = '/send/text';
      if (data.media) {
        endpoint = '/send/media';
      }
      
      // Para cada número, enviar a mensagem com o parâmetro de agendamento
      for (const number of numbers) {
        // Criar objeto de dados para este destinatário
        const messageData: any = {
          number: number,
          text: data.message,
          delay: 0, // Sem delay adicional na hora do envio
          // Adicionar o timestamp de agendamento
          scheduledAt: data.scheduledFor
        };
        
        // Se for mídia, adicionar os campos necessários
        if (data.media) {
          // Detectar o tipo de mídia baseado no mimetype
          messageData.type = data.media.mimetype.startsWith('image') ? 'image' : 
                           data.media.mimetype.startsWith('video') ? 'video' : 
                           data.media.mimetype.startsWith('audio') ? 'audio' : 'document';
          
          // Para mídia, usar URL diretamente do Supabase
          messageData.file = data.media.data; // URL direta do Supabase
          
          // Para documentos, adicionar nome do arquivo
          if (messageData.type === 'document' && data.media.filename) {
            messageData.docName = data.media.filename;
          }
          
          // Para mídia, manter o campo text conforme documentação da API
          // O campo text é usado tanto para mensagens de texto quanto para legendas de mídia
          if (data.message && data.message.trim()) {
            messageData.text = data.message;
          }
        }
        
        try {
          // Fazer a requisição para este número
          console.log(`Agendando envio para ${number} usando endpoint ${endpoint}. Timestamp: ${data.scheduledFor}`);
          
          const api = createApiClient(); const response = await api.post(endpoint, messageData, {
            headers: {
              'token': instanceToken
            }
          });
          
          results.push(response.data);
          activeCampaigns[campaignId].results.push({
            number,
            success: true,
            data: response.data,
            scheduled: true,
            scheduledAt: new Date(data.scheduledFor * 1000).toISOString()
          });
          activeCampaigns[campaignId].sent++;
        } catch (error) {
          console.error(`Erro ao agendar envio para ${number}:`, error);
          activeCampaigns[campaignId].errors++;
          activeCampaigns[campaignId].results.push({
            number,
            success: false,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        }
      }
      
      // Atualizar progresso
      activeCampaigns[campaignId].progress = 100; // Agendamento concluído
      
      return {
        success: true,
        campaignId,
        scheduled: true,
        scheduledFor: new Date(data.scheduledFor * 1000).toISOString(),
        results
      };
    } catch (error) {
      console.error('Erro ao agendar mensagem:', error);
      if (axios.isAxiosError(error)) {
        console.error('Detalhes do erro:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
      }
      throw error;
    }
  },
  
  // Método para listar campanhas
  async getCampaigns(instanceToken?: string, status?: string): Promise<Campaign[]> {
    // Se um token for fornecido, buscar campanhas na API da UAZAPI
    if (instanceToken) {
      console.log(`Buscando campanhas com token: ${instanceToken}`);
      return this.getCampaignsFromAPI(instanceToken, status);
    }
    
    // Caso contrário, retornar campanhas do armazenamento local (para desenvolvimento/testes)
    return Object.values(activeCampaigns).map(campaign => ({
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      createdAt: campaign.startTime.toISOString(),
      totalRecipients: campaign.totalRecipients,
      successCount: campaign.sent,
      errorCount: campaign.errors,
      pendingCount: campaign.totalRecipients - campaign.sent - campaign.errors,
      progress: Math.floor((campaign.sent + campaign.errors) / campaign.totalRecipients * 100),
      messageType: 'text' // Placeholder - precisamos salvar esse dado ao criar a campanha
    }));
  },
  
  // Método para buscar campanhas da API UAZAPI
  async getCampaignsFromAPI(instanceToken: string, status?: string): Promise<Campaign[]> {
    try {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[${timestamp}] Buscando logs de campanhas com token: ${instanceToken.substring(0, 10)}...`);
      
      // Construir URL com parâmetros de query se status for fornecido
      let url = '/sender/listfolders';
      const params = new URLSearchParams();
      
      if (status && (status === 'Active' || status === 'Archived')) {
        params.append('status', status);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      console.log(`[${timestamp}] Fazendo requisição para: ${url}`);
      
      // Implementação real com a API UAZAPI
      const api = createApiClient(); const response = await api.get(url, {
        headers: {
          'Accept': 'application/json',
          'token': instanceToken,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      console.log(`[${timestamp}] Resposta da API recebida:`, {
        status: response.status,
        dataLength: Array.isArray(response.data) ? response.data.length : 'não é array',
        data: response.data
      });
      
      // Transformar os dados da API para o formato da nossa interface
      const campaigns = await Promise.all(response.data.map(async (campaign: any) => {
        const total = campaign.log_total || 0;
        const processed = (campaign.log_sucess || 0) + (campaign.log_failed || 0);
        const progress = this.calculateProgress(campaign);
        
        // Usar dados da API diretamente conforme documentação
        const detailedLogs = {
          log_delivered: campaign.log_delivered || 0,
          log_read: campaign.log_read || 0,
          log_failed: campaign.log_failed || 0,
          log_sucess: campaign.log_sucess || 0
        };
        
        // Log detalhado para debug
        console.log(`\n=== DEBUG CAMPANHA ${campaign.id} ===`);
        console.log('Dados brutos da API:', {
          id: campaign.id,
          status: campaign.status,
          log_total: campaign.log_total,
          log_sucess: campaign.log_sucess,
          log_failed: campaign.log_failed,
          log_delivered: campaign.log_delivered,
          log_read: campaign.log_read,
          info: campaign.info,
          created: campaign.created,
          updated: campaign.updated
        });
        console.log('Logs detalhados:', detailedLogs);
        console.log('Cálculos:', {
          total,
          processed,
          progress: progress + '%',
          'processed >= total': processed >= total,
          'progress >= 100': progress >= 100
        });
        
        // Determinar o status real usando lógica melhorada
        let realStatus = this.mapApiStatus(campaign.status);
        console.log('Status inicial mapeado:', realStatus);
        
        // PRIORIDADE 1: Verificar se a campanha está realmente ativa (em execução)
        if (this.isCampaignActive(campaign)) {
          // Se está ativa, manter como ativo independente do status da API
          if (!['paused', 'cancelled', 'failed'].includes(realStatus)) {
            realStatus = 'ativo';
            console.log(`🔄 Campanha ${campaign.id} marcada como ATIVA: ${processed}/${total} mensagens processadas`);
          }
        }
        // PRIORIDADE 2: Verificar se a campanha deve ser marcada como concluída
        else if (this.isCampaignCompleted(campaign)) {
          realStatus = 'completed';
          console.log(`✅ Campanha ${campaign.id} marcada como CONCLUÍDA`);
        }
        // PRIORIDADE 3: Se não está ativa nem concluída, manter o status mapeado da API
        // Não forçar conclusão prematuramente - deixar a API determinar o status
        console.log(`📊 Campanha ${campaign.id} mantendo status da API: ${realStatus}`);
        
        console.log('Status final determinado:', realStatus);
        console.log('=== FIM DEBUG ===\n');
        
        return {
          id: campaign.id,
          name: campaign.info || `Campanha ${campaign.id.substring(0, 8)}`,
          info: campaign.info,
          status: realStatus,
          createdAt: campaign.created,
          scheduledAt: campaign.scheduled_for ? new Date(campaign.scheduled_for).toISOString() : undefined,
          scheduledFor: campaign.scheduled_for,
          totalRecipients: total,
          successCount: detailedLogs.log_sucess,
          errorCount: detailedLogs.log_failed,
          pendingCount: Math.max(0, total - processed),
          progress: progress,
          messageType: 'text',
          delayMax: campaign.delayMax,
          delayMin: campaign.delayMin,
          log_delivered: detailedLogs.log_delivered,
          log_failed: detailedLogs.log_failed,
          log_played: campaign.log_played,
          log_read: detailedLogs.log_read,
          log_sucess: detailedLogs.log_sucess,
          log_total: campaign.log_total,
          owner: campaign.owner,
          created: campaign.created,
          updated: campaign.updated
        };
      }));
      
      return campaigns;
    } catch (error: any) {
      const timestamp = new Date().toLocaleTimeString();
      console.error(`[${timestamp}] ❌ Erro ao buscar campanhas da API:`, {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        headers: error.config?.headers,
        instanceToken: instanceToken.substring(0, 10) + '...'
      });
      
      // Verificar tipos específicos de erro
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        console.error('🌐 Erro de conectividade: Não foi possível conectar à API UAZAPI');
      } else if (error.response?.status === 401) {
        console.error('🔐 Erro de autenticação: Token de instância inválido ou expirado');
      } else if (error.response?.status === 403) {
        console.error('🚫 Erro de autorização: Sem permissão para acessar este recurso');
      } else if (error.response?.status === 404) {
        console.error('📂 Recurso não encontrado: Endpoint /sender/listfolders não existe');
      } else if (error.response?.status >= 500) {
        console.error('🔥 Erro do servidor: API UAZAPI está com problemas internos');
      }
      
      return [];
    }
  },
  
  // Helper para mapear status da API para o formato da interface
  mapApiStatus(apiStatus: string): Campaign['status'] {
    if (!apiStatus) return 'failed';

    const status = apiStatus.toLowerCase();

    // Status que indicam campanha ativa/em execução
    if (['ativo', 'active', 'running', 'processing', 'sending', 'in_progress', 'executing', 'started', 'em andamento'].includes(status)) {
      return 'ativo';
    }

    // Status que indicam campanha pausada
    if (['paused', 'pausing', 'suspended', 'stopped', 'halted', 'parado'].includes(status)) {
      return 'paused';
    }

    // Status que indicam campanha concluída com sucesso
    if (['completed', 'done', 'finished', 'success', 'archived', 'finalized', 'concluido', 'finalizado'].includes(status)) {
      return 'completed';
    }

    // Status que indicam campanha cancelada
    if (['cancelled', 'canceled', 'aborted', 'terminated', 'stopped_by_user', 'cancelado'].includes(status)) {
      return 'cancelled';
    }

    // Status que indicam falha na campanha
    if (['failed', 'error', 'failed_to_send', 'error_sending', 'timeout', 'connection_error', 'falhou', 'erro'].includes(status)) {
      return 'failed';
    }

    // Status que indicam campanha agendada
    if (['scheduled', 'pending', 'waiting', 'queued', 'scheduled_for_later', 'agendado', 'pendente'].includes(status)) {
      return 'scheduled';
    }

    // Status desconhecido - log para debug e assumir como scheduled para ser mais conservador
    console.warn(`⚠️ Status desconhecido da campanha: ${apiStatus}`);
    console.log('Status da API:', apiStatus, '-> Mapeado para: scheduled (conservador)');
    return 'scheduled';
  },
  
  // Helper para calcular o progresso da campanha
  calculateProgress(campaign: any): number {
    const total = campaign.log_total || 0;
    if (total === 0) return 0;
    
    const processed = (campaign.log_sucess || 0) + (campaign.log_failed || 0);
    const progress = Math.floor((processed / total) * 100);
    
    return Math.min(progress, 100); // Garantir que não passe de 100%
  },

  // Helper para determinar se uma campanha deve ser considerada concluída
  isCampaignCompleted(campaign: any): boolean {
    const total = campaign.log_total || 0;
    const processed = (campaign.log_sucess || 0) + (campaign.log_failed || 0);
    const progress = this.calculateProgress(campaign);
    
    // Verificar se a campanha é muito recente (menos de 5 minutos)
    const campaignDate = campaign.created ? new Date(campaign.created) : new Date();
    const minutesAgo = (new Date().getTime() - campaignDate.getTime()) / (1000 * 60);
    const hoursAgo = minutesAgo / 60;
    
    // NUNCA marcar como concluída se for muito recente (menos de 5 minutos)
    if (minutesAgo < 5) {
      console.log(`🆕 Campanha ${campaign.id} muito recente (${minutesAgo.toFixed(1)} min), NÃO concluir`);
      return false;
    }
    
    // Verificar se todas as mensagens foram processadas E o progresso é 100%
    const allMessagesProcessed = total > 0 && processed >= total && progress >= 100;
    
    // Verificar se a campanha é muito antiga (mais de 6 horas) e tem progresso quase completo (95%+)
    const isOldWithHighProgress = hoursAgo > 6 && progress >= 95;
    
    // Verificar se o status da API já indica conclusão explícita
    const apiStatusComplete = [
      'Done', 'done', 'completed', 'Completed', 'COMPLETED',
      'Archived', 'archived', 'ARCHIVED',
      'finished', 'Finished', 'FINISHED',
      'finalizado', 'Finalizado', 'FINALIZADO'
    ].includes(campaign.status);
    
    const shouldComplete = allMessagesProcessed || isOldWithHighProgress || apiStatusComplete;
    
    console.log(`=== VERIFICAÇÃO DE CONCLUSÃO - Campanha ${campaign.id} ===`);
    console.log('Total mensagens:', total);
    console.log('Processadas:', processed);
    console.log('Progresso:', progress + '%');
    console.log('Minutos desde criação:', minutesAgo.toFixed(1));
    console.log('Horas desde criação:', hoursAgo.toFixed(1));
    console.log('Status da API:', campaign.status);
    console.log('Verificações:');
    console.log('  - Muito recente (<5min):', minutesAgo < 5);
    console.log('  - Todas processadas E 100%:', allMessagesProcessed);
    console.log('  - Antiga com 95%+ progresso:', isOldWithHighProgress);
    console.log('  - Status API completo:', apiStatusComplete);
    console.log('RESULTADO: Deve completar?', shouldComplete);
    console.log('=== FIM VERIFICAÇÃO ===');
    
    return shouldComplete;
  },

  // Helper para determinar se uma campanha está realmente ativa
  isCampaignActive(campaign: any): boolean {
    const total = campaign.log_total || 0;
    const processed = (campaign.log_sucess || 0) + (campaign.log_failed || 0);
    
    console.log(`=== VERIFICAÇÃO DE ATIVIDADE - Campanha ${campaign.id} ===`);
    console.log('Total mensagens:', total);
    console.log('Processadas:', processed);
    console.log('Status da API:', campaign.status);
    
    // Se não há mensagens, não pode estar ativa
    if (total === 0) {
      console.log('❌ Não ativa: Sem mensagens');
      return false;
    }
    
    // Se já processou todas, não está mais ativa
    if (processed >= total) {
      console.log('❌ Não ativa: Todas mensagens processadas');
      return false;
    }
    
    // Verificar se a campanha não é muito antiga
    const campaignDate = campaign.created ? new Date(campaign.created) : new Date();
    const hoursAgo = (new Date().getTime() - campaignDate.getTime()) / (1000 * 60 * 60);
    const minutesAgo = hoursAgo * 60;
    
    console.log('Minutos desde criação:', minutesAgo.toFixed(1));
    console.log('Horas desde criação:', hoursAgo.toFixed(1));
    
    // Verificar status da API primeiro
    const activeStatuses = ['ativo', 'Active', 'active', 'running', 'em andamento', 'in progress', 'processing'];
    const apiIsActive = activeStatuses.includes(campaign.status);
    
    console.log('Status da API indica ativo?', apiIsActive);
    console.log('Processadas < Total?', processed < total);
    
    // Se a API indica que está ativa, considerar ativa (especialmente para campanhas recém-iniciadas)
    if (apiIsActive && processed < total) {
      console.log(`✅ ATIVA pela API: ${processed}/${total} processadas`);
      console.log('=== FIM VERIFICAÇÃO ATIVIDADE ===');
      return true;
    }
    
    // Para campanhas recém-criadas (menos de 1 hora), ser mais permissivo
    if (hoursAgo < 1 && processed < total) {
      console.log(`✅ ATIVA por ser recém-criada (${hoursAgo.toFixed(1)}h)`);
      console.log('=== FIM VERIFICAÇÃO ATIVIDADE ===');
      return true;
    }
    
    // Se passou mais de 72 horas e não progrediu muito, considerar não ativa
    if (hoursAgo > 72 && processed < (total * 0.05)) {
      console.log(`❌ Não ativa: Muito antiga (${hoursAgo.toFixed(1)}h) com progresso baixo`);
      console.log('=== FIM VERIFICAÇÃO ATIVIDADE ===');
      return false;
    }
    
    console.log('❌ Não ativa: Nenhuma condição atendida');
    console.log('=== FIM VERIFICAÇÃO ATIVIDADE ===');
    return false;
  },
  
  // Método para obter detalhes de uma campanha
  getCampaignDetails(campaignId: string): any {
    const campaign = activeCampaigns[campaignId];
    if (!campaign) return null;
    
    return {
      ...campaign,
      status: campaign.status,
      progress: Math.floor((campaign.sent + campaign.errors) / campaign.totalRecipients * 100),
      successRate: campaign.sent > 0 ? Math.floor((campaign.sent / (campaign.sent + campaign.errors)) * 100) : 0,
      timeElapsed: new Date().getTime() - campaign.startTime.getTime()
    };
  },
  
  // Simulação local para testes (não usar em produção)
  pauseCampaignLocal(campaignId: string): void {
    const campaign = activeCampaigns[campaignId];
    if (campaign && campaign.status === 'running') {
      campaign.status = 'paused';
      if (campaign.intervalId) {
        clearInterval(campaign.intervalId);
        campaign.intervalId = null;
      }
    }
  },
  
  // Simulação local para testes (não usar em produção)
  resumeCampaignLocal(campaignId: string): void {
    const campaign = activeCampaigns[campaignId];
    if (campaign && campaign.status === 'paused') {
      campaign.status = 'running';
      // Simulação de processamento - não é necessário para a API real
    }
  },
  
  // Simulação local para testes (não usar em produção)
  deleteCampaignLocal(campaignId: string): void {
    if (activeCampaigns[campaignId]) {
      const campaign = activeCampaigns[campaignId];
      if (campaign.intervalId) {
        clearInterval(campaign.intervalId);
      }
      delete activeCampaigns[campaignId];
    }
  },
  
  // Métodos para gerenciar campanhas na API UAZAPI
  async pauseCampaign(instanceToken: string, campaignId: string): Promise<boolean> {
    try {
      const api = createApiClient(); const response = await api.post('/message/queue/pause', { id: campaignId }, {
        headers: {
          'Accept': 'application/json',
          'token': instanceToken
        }
      });
      
      console.log('Resposta da API ao pausar campanha:', response.data);
      return response.data.success || false;
    } catch (error) {
      console.error('Erro ao pausar campanha:', error);
      return false;
    }
  },
  
  async resumeCampaign(instanceToken: string, campaignId: string): Promise<boolean> {
    try {
      const api = createApiClient();
      const response = await api.post('/message/queue/resume', { id: campaignId }, {
        headers: {
          'Accept': 'application/json',
          'token': instanceToken
        }
      });
      
      console.log('Resposta da API ao retomar campanha:', response.data);
      return response.data.success || false;
    } catch (error) {
      console.error('Erro ao retomar campanha:', error);
      return false;
    }
  },
  
  async deleteCampaign(instanceToken: string, campaignId: string): Promise<boolean> {
    try {
      const api = createApiClient();
      const response = await api.delete(`/message/queue/folder/${campaignId}`, {
        headers: {
          'Accept': 'application/json',
          'token': instanceToken
        }
      });
      
      console.log('Resposta da API ao deletar campanha:', response.data);
      return response.data.success || false;
    } catch (error) {
      console.error('Erro ao deletar campanha:', error);
      return false;
    }
  },

  // ===== NOVAS FUNÇÕES PARA GERENCIAR CAMPANHAS COM API /sender/edit =====

  async manageCampaign(instanceToken: string, folderId: string, action: 'stop' | 'continue' | 'delete'): Promise<{ success: boolean; deleted?: number; message?: string }> {
    try {
      const api = createApiClient(); const response = await api.post('/sender/edit', {
        folder_id: folderId,
        action: action
      }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'token': instanceToken
        }
      });
      
      console.log(`Resposta da API ao ${action} campanha:`, response.data);
      return {
        success: true,
        deleted: response.data.deleted,
        message: `Campanha ${action === 'stop' ? 'parada' : action === 'continue' ? 'continuada' : 'deletada'} com sucesso`
      };
    } catch (error: any) {
      console.error(`Erro ao ${action} campanha:`, error);
      return {
        success: false,
        message: error.response?.data?.message || `Erro ao ${action} campanha`
      };
    }
  },

  async stopCampaign(instanceToken: string, folderId: string): Promise<{ success: boolean; message?: string }> {
    const result = await this.manageCampaign(instanceToken, folderId, 'stop');
    return {
      success: result.success,
      message: result.message
    };
  },

  async continueCampaign(instanceToken: string, folderId: string): Promise<{ success: boolean; message?: string }> {
    const result = await this.manageCampaign(instanceToken, folderId, 'continue');
    return {
      success: result.success,
      message: result.message
    };
  },

  async deleteCampaignNew(instanceToken: string, folderId: string): Promise<{ success: boolean; deleted?: number; message?: string }> {
    return await this.manageCampaign(instanceToken, folderId, 'delete');
  },

  // ===== NOVOS ENDPOINTS PARA CHATS, BLOQUEIOS, CONTATOS E ETIQUETAS =====

  // Buscar chats usando a API UAZAPI oficial conforme documentação
  async searchChats(instanceToken: string, filters: any = {}): Promise<Chat[]> {
    try {
      console.log('🔍 BUSCANDO CONVERSAS - Token:', instanceToken?.substring(0, 10) + '...');
      console.log('🔍 BUSCANDO CONVERSAS - URL Base:', getBaseURL());
      
      const api = createApiClient(); 
      
      // Preparar filtros conforme documentação oficial da API UAZAPI
      // Estrutura baseada no endpoint POST /chat/find
      const requestBody = {
        sort: "-wa_lastMsgTimestamp", // Ordenar por última mensagem (mais recentes primeiro)
        limit: filters.limit || 999999, // ILIMITADO - carregar TODOS os chats sem exceção
        offset: filters.offset || 0,
        // Filtros adicionais podem ser adicionados aqui conforme necessário
        // wa_isGroup: false, // Para filtrar apenas conversas individuais
        // wa_unreadCount: ">0", // Para filtrar apenas conversas com mensagens não lidas
        ...filters // Mesclar filtros personalizados se houver
      };
      
      // Remover propriedades que não devem estar no body da requisição
      delete requestBody.includeLastMessage;
      
      console.log('📤 DADOS DA REQUISIÇÃO (seguindo documentação oficial):', requestBody);
      
      const response = await api.post('/chat/find', requestBody, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'token': instanceToken
        }
      });
      
      console.log('📱 RESPOSTA DA API:');
      console.log('- Status:', response.status);
      console.log('- Headers:', response.headers);
      console.log('- Estrutura da resposta:', {
        hasChats: !!response.data?.chats,
        hasPagination: !!response.data?.pagination,
        hasStats: !!response.data?.totalChatsStats,
        chatsLength: Array.isArray(response.data?.chats) ? response.data.chats.length : 'N/A',
        isArray: Array.isArray(response.data),
        responseType: typeof response.data
      });
      console.log('- Dados completos:', response.data);
      
      // A API pode retornar diferentes formatos, vamos tratar todos
      let chatsArray: any[] = [];
      
      // FORMATO 1: Estrutura oficial { chats: [], pagination: {}, totalChatsStats: {} }
      if (response.data && response.data.chats && Array.isArray(response.data.chats)) {
        chatsArray = response.data.chats;
        console.log('✅ FORMATO OFICIAL DETECTADO: { chats: [...] }');
        console.log('📊 Estatísticas totais:', response.data.totalChatsStats);
        console.log('📊 Paginação:', response.data.pagination);
      }
      // FORMATO 2: Array direto (formato legado)
      else if (Array.isArray(response.data)) {
        chatsArray = response.data;
        console.log('⚠️ FORMATO LEGADO DETECTADO: array direto');
      }
      // FORMATO 3: Resposta sem dados ou formato não reconhecido
      else {
        console.error('❌ RESPOSTA NÃO CONFORME DOCUMENTAÇÃO:');
        console.error('- Esperado: { chats: [], pagination: {}, totalChatsStats: {} } ou array direto');
        console.error('- Recebido:', response.data);
        return [];
      }
      
      if (chatsArray.length === 0) {
        console.log('⚠️ API retornou resposta válida, mas sem conversas');
        return [];
      }
      
      console.log(`📋 PROCESSANDO ${chatsArray.length} CONVERSAS DA API`);
      console.log('🔍 PRIMEIRA CONVERSA (exemplo):', chatsArray[0]);
      console.log('🔍 CAMPOS DISPONÍVEIS:', Object.keys(chatsArray[0] || {}));
      
      const mappedChats = chatsArray.map((chat: any, index: number) => {
        // Mapear usando os campos da documentação oficial UAZAPI
        const mappedChat = {
          id: chat.wa_chatid || chat.wa_fastid || chat.id || chat.jid || '',
          name: chat.lead_name || chat.wa_contactName || chat.wa_name || chat.name || 'Sem nome',
          isGroup: chat.wa_isGroup || chat.isGroup || false,
          unreadCount: chat.wa_unreadCount || chat.unreadCount || 0,
          lastMessageTimestamp: chat.wa_lastMsgTimestamp || chat.lastMessageTimestamp || Date.now(),
          isArchived: chat.wa_archived || chat.isArchived || false,
          isPinned: chat.wa_isPinned || chat.isPinned || false,
          isMuted: (chat.wa_muteEndTime || 0) > Date.now(),
        muteEndTime: chat.wa_muteEndTime || 0,
          profilePicUrl: chat.image || chat.imagePreview || chat.profilePicUrl || ''
        };
        
        // Log detalhado apenas para os primeiros 3 chats
        if (index < 3) {
          console.log(`📋 Chat ${index + 1} mapeado:`, {
            original: {
              id: chat.wa_chatid || chat.wa_fastid || chat.id,
              name: chat.lead_name || chat.wa_contactName,
              isGroup: chat.wa_isGroup,
              unread: chat.wa_unreadCount,
              lastMsg: chat.wa_lastMsgTimestamp
            },
            mapped: {
              id: mappedChat.id.length > 20 ? mappedChat.id.substring(0, 20) + '...' : mappedChat.id,
              name: mappedChat.name,
              isGroup: mappedChat.isGroup,
              unread: mappedChat.unreadCount,
              lastMsg: new Date(mappedChat.lastMessageTimestamp).toLocaleString()
            }
          });
        }
        
        return mappedChat;
      });
      
      // ILIMITADO - Aceitar TODOS os chats (apenas filtrar por ID válido)
      const validChats = mappedChats.filter((chat: any) => {
        const hasValidId = chat.id && chat.id.length > 0;
        return hasValidId; // Remover filtro de nome para carregar TODOS os chats
      });
      
      console.log(`✅ SUCESSO: ${validChats.length} de ${mappedChats.length} conversas carregadas (TODAS sem filtros)`);
      
      if (response.data?.totalChatsStats) {
        console.log('📊 Estatísticas da API:', response.data.totalChatsStats);
      }
      
      return validChats;
      
    } catch (error: any) {
      console.error('❌ ERRO na requisição /chat/find:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        headers: error.config?.headers
      });
      
      // Verificar erros específicos
      if (error.response?.status === 400) {
        console.warn('⚠️ Erro 400: Possível problema nos parâmetros da requisição');
      } else if (error.response?.status === 401) {
        console.warn('⚠️ Erro 401: Token inválido ou instância não autorizada');
      } else if (error.response?.status === 404) {
        console.warn('⚠️ Erro 404: Endpoint não encontrado - verifique a URL base');
      } else if (error.response?.status >= 500) {
        console.warn('⚠️ Erro do servidor: Problema interno da API UAZAPI');
      }
      
      return [];
    }
  },

  // Método para buscar TODOS os chats usando paginação
  async getAllChats(instanceToken: string, filters: any = {}): Promise<Chat[]> {
    try {
      console.log('🔍 BUSCANDO TODOS OS CHATS - Token:', instanceToken?.substring(0, 10) + '...');
      console.log('🔍 Filtros recebidos:', filters);
      
      const allChats: Chat[] = [];
      let offset = 0;
      const limit = 999999; // ILIMITADO - buscar TODOS os chats de uma vez
      let hasMoreChats = true;
      let pageCount = 0;
      
      while (hasMoreChats) { // SEM LIMITE de páginas
        pageCount++;
        console.log(`📄 Buscando página ${pageCount} (offset: ${offset}, limit: ${limit})`);
        
        const pageFilters = {
          ...filters,
          limit,
          offset
        };
        
        console.log('📤 Filtros da página:', pageFilters);
        
        const pageChats = await this.searchChats(instanceToken, pageFilters);
        
        console.log(`📥 Página ${pageCount} retornou ${pageChats.length} chats`);
        
        if (pageChats.length === 0) {
          hasMoreChats = false;
          console.log('✅ Não há mais chats para buscar');
        } else {
          allChats.push(...pageChats);
          offset += limit;
          
          // Se retornou menos que o limite, provavelmente é a última página
          if (pageChats.length < limit) {
            hasMoreChats = false;
            console.log('✅ Última página encontrada');
          }
        }
        
        console.log(`📊 Total de chats coletados até agora: ${allChats.length}`);
      }
      
      console.log(`✅ BUSCA COMPLETA: ${allChats.length} chats encontrados no total`);
      return allChats;
      
    } catch (error: any) {
      console.error('❌ ERRO ao buscar todos os chats:', error);
      return [];
    }
  },

  // Etiquetar chat
  async labelChat(instanceToken: string, number: string, labelIds: string[]): Promise<boolean> {
    try {
      const api = createApiClient(); const response = await api.post('/chat/labels', {
        number: number,
        labelids: labelIds
      }, {
        headers: {
          'Accept': 'application/json',
          'token': instanceToken
        }
      });
      
      console.log('Resposta da API (etiquetar chat):', response.data);
      return response.data.success || false;
    } catch (error) {
      console.error('Erro ao etiquetar chat:', error);
      return false;
    }
  },

  // Fixar/desfixar chat
  async pinChat(instanceToken: string, number: string, pin: boolean): Promise<boolean> {
    try {
      const api = createApiClient(); const response = await api.post('/chat/pin', {
        number: number,
        pin: pin
      }, {
        headers: {
          'Accept': 'application/json',
          'token': instanceToken
        }
      });
      
      console.log('Resposta da API (fixar chat):', response.data);
      return response.data.success || false;
    } catch (error) {
      console.error('Erro ao fixar chat:', error);
      return false;
    }
  },

  // Silenciar/dessilenciar chat
  async muteChat(instanceToken: string, number: string, muteEndTime: number): Promise<boolean> {
    try {
      const api = createApiClient(); const response = await api.post('/chat/mute', {
        number: number,
        muteEndTime: muteEndTime
      }, {
        headers: {
          'Accept': 'application/json',
          'token': instanceToken
        }
      });
      
      console.log('Resposta da API (silenciar chat):', response.data);
      return response.data.success || false;
    } catch (error) {
      console.error('Erro ao silenciar chat:', error);
      return false;
    }
  },

  // Arquivar/desarquivar chat
  async archiveChat(instanceToken: string, number: string, archive: boolean): Promise<boolean> {
    try {
      const api = createApiClient(); const response = await api.post('/chat/archive', {
        number: number,
        archive: archive
      }, {
        headers: {
          'Accept': 'application/json',
          'token': instanceToken
        }
      });
      
      console.log('Resposta da API (arquivar chat):', response.data);
      return response.data.success || false;
    } catch (error) {
      console.error('Erro ao arquivar chat:', error);
      return false;
    }
  },

  // Marcar chat como lido/não lido - CONFORME DOCUMENTAÇÃO UAZAPI
  async markChatAsRead(instanceToken: string, number: string, read: boolean): Promise<boolean> {
    try {
      console.log('📖 INICIANDO markChatAsRead:', { 
        number: number,
        read: read, 
        hasToken: !!instanceToken,
        tokenLength: instanceToken?.length 
      });
      
      if (!instanceToken) {
        console.error('❌ Token da instância não fornecido');
        return false;
      }
      
      if (!number) {
        console.error('❌ Número do chat não fornecido');
        return false;
      }
      
      // Testar diferentes formatos do número para encontrar o correto
      const formatVariations = [
        number,                                    // Formato original
        number.includes('@') ? number.split('@')[0] : number,  // Sem sufixo
        number.includes('@') ? number : `${number}@s.whatsapp.net`,  // Com sufixo individual
        number.includes('@') ? number : `${number}@g.us`,            // Com sufixo grupo
      ];
      
      console.log('🔧 Testando variações do número:', formatVariations);
      
      // Tentar com o formato original primeiro
      const numberToUse = number;
      
      const requestBody = {
        number: numberToUse,
        read: read
      };
      
      console.log('📤 ENVIANDO /chat/read:', {
        endpoint: '/chat/read',
        method: 'POST',
        body: requestBody,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'token': '***' + instanceToken.substring(instanceToken.length - 4)
        }
      });
      
      const api = createApiClient();
      const response = await api.post('/chat/read', requestBody, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'token': instanceToken
        },
        timeout: 15000 // 15 segundos de timeout
      });
      
      console.log('📨 RESPOSTA /chat/read:', {
        status: response.status,
        statusText: response.statusText,
        dataType: typeof response.data,
        data: response.data,
        headers: response.headers
      });
      
      // Verificar sucesso conforme padrões da API UAZAPI
      const isSuccess = response.status === 200 || 
                       response.data === true || 
                       response.data?.success === true ||
                       response.data?.result === true;
      
      if (isSuccess) {
        console.log('✅ Chat marcado como lido com SUCESSO');
        return true;
      } else {
        console.warn('⚠️ Resposta da API não indica sucesso claro:', {
          status: response.status,
          data: response.data
        });
        // Mesmo assim considerar sucesso se status 200
        return response.status === 200;
      }
      
    } catch (error: any) {
      console.error('❌ ERRO CRÍTICO ao marcar chat como lido:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        requestURL: error.config?.url,
        requestMethod: error.config?.method,
        requestData: error.config?.data,
        originalNumber: number
      });
      
      // Diagnosticar erros específicos
      if (error.response?.status === 500) {
        console.error('🔥 ERRO 500 (Internal Server Error):');
        console.error('  • Instância WhatsApp pode estar desconectada');
        console.error('  • Chat ID pode estar em formato inválido');
        console.error('  • Token pode estar expirado');
        console.error('  • Problema interno no servidor UAZAPI');
        
        // Log da resposta do servidor para debug
        if (error.response?.data) {
          console.error('🔍 Detalhes do erro do servidor:', error.response.data);
        }
        
        // Não marcar como falha crítica - permitir que o fluxo continue
        console.warn('⚠️ Continuando sem marcar como lido devido ao erro 500');
        
      } else if (error.response?.status === 401) {
        console.error('🔐 ERRO 401: Token inválido ou sem permissão');
      } else if (error.response?.status === 400) {
        console.error('⚠️ ERRO 400: Parâmetros da requisição inválidos');
      } else if (error.response?.status === 404) {
        console.error('🔍 ERRO 404: Endpoint não encontrado ou chat não existe');
      } else if (error.code === 'ECONNABORTED') {
        console.error('⏱️ ERRO: Timeout na requisição');
      } else if (error.code === 'ECONNREFUSED') {
        console.error('🌐 ERRO: Conexão recusada pelo servidor');
      }
      
      return false;
    }
  },

  // Bloquear/desbloquear usuário
  async blockUser(instanceToken: string, number: string, block: boolean): Promise<boolean> {
    try {
      const api = createApiClient(); const response = await api.post('/chat/block', {
        number: number,
        block: block
      }, {
        headers: {
          'Accept': 'application/json',
          'token': instanceToken
        }
      });
      
      console.log('Resposta da API (bloquear usuário):', response.data);
      return response.data.success || false;
    } catch (error) {
      console.error('Erro ao bloquear usuário:', error);
      return false;
    }
  },

  // Buscar lista de bloqueados
  async getBlockedContacts(instanceToken: string): Promise<BlockedContact[]> {
    try {
      const api = createApiClient(); const response = await api.get('/chat/blocklist', {
        headers: {
          'Accept': 'application/json',
          'token': instanceToken
        }
      });
      
      console.log('Resposta da API (lista de bloqueados):', response.data);
      
      if (!response.data || !Array.isArray(response.data)) {
        return [];
      }
      
      return response.data.map((contact: any) => ({
        id: contact.jid || contact.id || '',
        number: contact.jid?.split('@')[0] || contact.number || '',
        name: contact.name || contact.pushName || 'Sem nome',
        jid: contact.jid || ''
      }));
    } catch (error) {
      console.error('Erro ao buscar lista de bloqueados:', error);
      return [];
    }
  },

  // Deletar chat
  async deleteChat(instanceToken: string, number: string, options: {
    deleteChatWhatsApp?: boolean;
    deleteChatDB?: boolean;
    deleteMessagesDB?: boolean;
  } = {}): Promise<boolean> {
    try {
      const api = createApiClient(); const response = await api.post('/chat/delete', {
        number: number,
        deleteChatWhatsApp: options.deleteChatWhatsApp || true,
        deleteChatDB: options.deleteChatDB || true,
        deleteMessagesDB: options.deleteMessagesDB || true
      }, {
        headers: {
          'Accept': 'application/json',
          'token': instanceToken
        }
      });
      
      console.log('Resposta da API (deletar chat):', response.data);
      return response.data.success || false;
    } catch (error) {
      console.error('Erro ao deletar chat:', error);
      return false;
    }
  },

  // Buscar todas as etiquetas
  async getLabels(instanceToken: string): Promise<Label[]> {
    try {
      const api = createApiClient(); const response = await api.get('/labels', {
        headers: {
          'Accept': 'application/json',
          'token': instanceToken
        }
      });
      
      console.log('Resposta da API (etiquetas):', response.data);
      
      if (!response.data || !Array.isArray(response.data)) {
        return [];
      }
      
      return response.data.map((label: any) => ({
        id: label.id || label.labelid || '',
        name: label.name || 'Sem nome',
        color: label.color || 0
      }));
    } catch (error) {
      console.error('Erro ao buscar etiquetas:', error);
      return [];
    }
  },

  // Editar etiqueta
  async editLabel(instanceToken: string, labelId: string, name: string, color: number, deleteLabel: boolean = false): Promise<boolean> {
    try {
      const api = createApiClient(); const response = await api.post('/label/edit', {
        labelid: labelId,
        name: name,
        color: color,
        delete: deleteLabel
      }, {
        headers: {
          'Accept': 'application/json',
          'token': instanceToken
        }
      });
      
      console.log('Resposta da API (editar etiqueta):', response.data);
      return response.data.success || false;
    } catch (error) {
      console.error('Erro ao editar etiqueta:', error);
      return false;
    }
  },

  // Pegar imagem e dados de um perfil
  async getProfileInfo(instanceToken: string, number: string): Promise<any> {
    try {
      const api = createApiClient(); const response = await api.post('/chat/GetNameAndImageURL', {
        number: number
      }, {
        headers: {
          'Accept': 'application/json',
          'token': instanceToken
        }
      });
      
      console.log('Resposta da API (info do perfil):', response.data);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar info do perfil:', error);
      return null;
    }
  },

  // Método para buscar detalhes das mensagens de uma campanha
  async getCampaignMessages(instanceToken: string, folderId: string): Promise<any[]> {
    try {
      console.log(`🔍 Buscando mensagens detalhadas para campanha ${folderId}`);
      
      const api = createApiClient(); const response = await api.post('/sender/listmessages', {
        folder_id: folderId
      }, {
        headers: {
          'Accept': 'application/json',
          'token': instanceToken,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 segundos de timeout
      });
      
      console.log(`📊 Resposta da API para campanha ${folderId}:`, {
        status: response.status,
        dataType: typeof response.data,
        isArray: Array.isArray(response.data),
        length: Array.isArray(response.data) ? response.data.length : 'N/A',
        firstItem: Array.isArray(response.data) && response.data.length > 0 ? response.data[0] : null
      });
      
      // Verificar se a resposta é um array
      if (!Array.isArray(response.data)) {
        console.warn(`⚠️ Resposta não é um array para campanha ${folderId}:`, response.data);
        return [];
      }
      
      // Log detalhado das mensagens para debug
      if (response.data.length > 0) {
        console.log(`📋 Estrutura das mensagens da campanha ${folderId}:`);
        response.data.slice(0, 3).forEach((msg: any, index: number) => {
          console.log(`Mensagem ${index + 1}:`, {
            id: msg.id || 'sem id',
            number: msg.number ? msg.number.substring(0, 5) + '***' : 'sem número',
            status: msg.status || 'sem status',
            messageStatus: msg.messageStatus || 'sem messageStatus',
            deliveryStatus: msg.deliveryStatus || 'sem deliveryStatus',
            state: msg.state || 'sem state',
            sent: msg.sent || 'sem sent',
            delivered: msg.delivered || 'sem delivered',
            read: msg.read || 'sem read',
            failed: msg.failed || 'sem failed',
            error: msg.error || 'sem error',
            timestamp: msg.timestamp || msg.created_at || msg.date || 'sem timestamp',
            allKeys: Object.keys(msg)
          });
        });
      }
      
      return response.data || [];
    } catch (error: any) {
      console.error(`❌ Erro ao buscar mensagens da campanha ${folderId}:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      return [];
    }
  },

  // Método para enviar mensagem simples
  async sendSimpleMessage(instanceToken: string, data: { number: string; message: string; type?: string }): Promise<any> {
    try {
      console.log('Enviando mensagem simples:', data);
      
      const api = createApiClient(); 
      const response = await api.post('/send/text', {
        number: data.number,
        text: data.message
      }, {
        headers: {
          'Accept': 'application/json',
          'token': instanceToken
        }
      });
      
      console.log('Mensagem enviada com sucesso:', response.data);
      return response.data;
    } catch (error) {
      console.error('Erro ao enviar mensagem simples:', error);
      throw error;
    }
  },

  // Função para forçar atualização de status de campanhas travadas
  async forceCampaignStatusUpdate(instanceToken: string): Promise<void> {
    try {
      console.log('🔄 Forçando atualização de status das campanhas...');
      
      // Buscar campanhas atuais
      const campaigns = await this.getCampaignsFromAPI(instanceToken);
      
      console.log(`📊 Encontradas ${campaigns.length} campanhas para verificação`);
      
      let updatedCount = 0;
      
      for (const campaign of campaigns) {
        const total = campaign.log_total || 0;
        const processed = (campaign.log_sucess || 0) + (campaign.log_failed || 0);
        const progress = this.calculateProgress(campaign);
        const campaignDate = campaign.created ? new Date(campaign.created) : new Date();
        const hoursAgo = (new Date().getTime() - campaignDate.getTime()) / (1000 * 60 * 60);
        
        let shouldUpdate = false;
        let newStatus = campaign.status;
        let reason = '';
        
        // Verificar se campanha deveria estar concluída
        if (this.isCampaignCompleted(campaign) && campaign.status !== 'completed') {
          newStatus = 'completed';
          shouldUpdate = true;
          reason = `Campanha concluída: ${processed}/${total} mensagens processadas, progresso ${progress}%`;
        }
        // Verificar se campanha está travada há muito tempo (mais conservador: 72h e <5% progresso)
        else if (campaign.status === 'ativo' && hoursAgo > 72 && progress < 5) {
          newStatus = 'failed';
          shouldUpdate = true;
          reason = `Campanha travada há ${hoursAgo.toFixed(1)} horas com progresso muito baixo (${progress}%)`;
        }
        // Verificar se campanha muito antiga sem nenhum progresso (mais conservador: 96h)
        else if (campaign.status === 'ativo' && hoursAgo > 96 && processed === 0) {
          newStatus = 'failed';
          shouldUpdate = true;
          reason = `Campanha muito antiga (${hoursAgo.toFixed(1)}h) sem nenhum progresso`;
        }
        
        if (shouldUpdate) {
          console.log(`🔧 ATUALIZANDO CAMPANHA: ${campaign.id}`);
          console.log(`   Status atual: ${campaign.status} -> Novo status: ${newStatus}`);
          console.log(`   Motivo: ${reason}`);
          console.log(`   Detalhes: Total=${total}, Processado=${processed}, Progresso=${progress}%, Idade=${hoursAgo.toFixed(1)}h`);
          
          try {
            // Tentar atualizar o status na API se houver endpoint disponível
            // Nota: A UAZAPI pode não ter endpoint direto para atualizar status
            // Neste caso, apenas logamos a detecção para monitoramento
            
            // Se a campanha deveria estar concluída, tentar pausá-la para evitar processamento desnecessário
            if (newStatus === 'completed' && campaign.status === 'ativo') {
              await this.pauseCampaign(instanceToken, campaign.id);
              console.log(`   ✅ Campanha pausada para evitar processamento desnecessário`);
            }
            
            updatedCount++;
          } catch (updateError) {
            console.error(`   ❌ Erro ao atualizar campanha ${campaign.id}:`, updateError);
          }
        }
        // Log de campanhas que precisam de atenção mas não foram atualizadas
        else if (campaign.status === 'ativo') {
          if (total > 0 && processed >= total && progress >= 100) {
            console.log(`⚠️ ATENÇÃO - Campanha ${campaign.id}: Status=${campaign.status}, mas todas as mensagens foram processadas (${processed}/${total}, ${progress}%)`);
          } else if (hoursAgo > 48) {
            console.log(`⏰ MONITORAMENTO - Campanha ${campaign.id}: Ativa há ${hoursAgo.toFixed(1)}h, progresso=${progress}% (${processed}/${total})`);
          }
        }
      }
      
      console.log(`✅ Verificação concluída. ${updatedCount} campanhas atualizadas.`);
    } catch (error) {
      console.error('❌ Erro ao forçar atualização de status:', error);
    }
  },

  // MÉTODO DE DIAGNÓSTICO COMPLETO
  async testInstanceConnection(instanceToken: string): Promise<{
    isConnected: boolean;
    status: string;
    hasContacts: boolean;
    hasGroups: boolean;
    hasChats: boolean;
    details: {
      status?: any;
      statusError?: any;
      contacts?: { count: number; sample: any };
      contactsError?: any;
      groups?: { count: number; sample: any };
      groupsError?: any;
      chats?: { count: number; sample: any };
      chatsError?: any;
      info?: any;
      infoError?: any;
      criticalError?: any;
    };
  }> {
    console.log('🔧 INICIANDO DIAGNÓSTICO COMPLETO DA INSTÂNCIA');
    console.log('Token:', instanceToken?.substring(0, 10) + '...');
    console.log('URL Base:', getBaseURL());
    
    const result = {
      isConnected: false,
      status: 'unknown',
      hasContacts: false,
      hasGroups: false,
      hasChats: false,
      details: {} as {
        status?: any;
        statusError?: any;
        contacts?: { count: number; sample: any };
        contactsError?: any;
        groups?: { count: number; sample: any };
        groupsError?: any;
        chats?: { count: number; sample: any };
        chatsError?: any;
        info?: any;
        infoError?: any;
        criticalError?: any;
      }
    };
    
    const api = createApiClient();
    
    try {
      // 1. Verificar status da instância
      console.log('🔍 1/5 - Verificando status da instância...');
      try {
        const statusResponse = await api.get('/instance/status', {
          headers: { 'token': instanceToken }
        });
        
        result.status = statusResponse.data?.status || 'unknown';
        result.isConnected = ['open', 'connected', 'qr'].includes(result.status);
        result.details.status = statusResponse.data;
        
        console.log('✅ Status da instância:', result.status);
      } catch (error) {
        console.error('❌ Erro ao verificar status:', error);
        result.details.statusError = error;
      }
      
      // 2. Tentar buscar contatos
      console.log('🔍 2/5 - Testando busca de contatos...');
      try {
        const contactsResponse = await api.get('/contacts', {
          headers: { 'token': instanceToken }
        });
        
        result.hasContacts = Array.isArray(contactsResponse.data) && contactsResponse.data.length > 0;
        result.details.contacts = {
          count: Array.isArray(contactsResponse.data) ? contactsResponse.data.length : 0,
          sample: contactsResponse.data?.[0]
        };
        
        console.log('✅ Contatos encontrados:', result.details.contacts.count);
      } catch (error) {
        console.error('❌ Erro ao buscar contatos:', error);
        result.details.contactsError = error;
      }
      
      // 3. Tentar buscar grupos
      console.log('🔍 3/5 - Testando busca de grupos...');
      try {
        const groupsResponse = await api.get('/group/list', {
          headers: { 'token': instanceToken }
        });
        
        let groupsData = [];
        if (groupsResponse.data?.groups) {
          groupsData = groupsResponse.data.groups;
        } else if (Array.isArray(groupsResponse.data)) {
          groupsData = groupsResponse.data;
        }
        
        result.hasGroups = groupsData.length > 0;
        result.details.groups = {
          count: groupsData.length,
          sample: groupsData[0]
        };
        
        console.log('✅ Grupos encontrados:', result.details.groups.count);
      } catch (error) {
        console.error('❌ Erro ao buscar grupos:', error);
        result.details.groupsError = error;
      }
      
      // 4. Tentar buscar chats
      console.log('🔍 4/5 - Testando busca de chats...');
      try {
        const chatsResponse = await api.post('/chat/find', {}, {
          headers: { 'token': instanceToken }
        });
        
        result.hasChats = Array.isArray(chatsResponse.data) && chatsResponse.data.length > 0;
        result.details.chats = {
          count: Array.isArray(chatsResponse.data) ? chatsResponse.data.length : 0,
          sample: chatsResponse.data?.[0]
        };
        
        console.log('✅ Chats encontrados:', result.details.chats.count);
      } catch (error) {
        console.error('❌ Erro ao buscar chats:', error);
        result.details.chatsError = error;
      }
      
      // 5. Testar informações da instância
      console.log('🔍 5/5 - Verificando informações da instância...');
      try {
        const infoResponse = await api.get('/instance/info', {
          headers: { 'token': instanceToken }
        });
        
        result.details.info = infoResponse.data;
        console.log('✅ Informações da instância obtidas');
      } catch (error) {
        console.error('❌ Erro ao obter informações:', error);
        result.details.infoError = error;
      }
      
      console.log('🎯 DIAGNÓSTICO COMPLETO FINALIZADO:');
      console.log('📊 Resultado:', {
        conectado: result.isConnected,
        status: result.status,
        temContatos: result.hasContacts,
        temGrupos: result.hasGroups,
        temChats: result.hasChats
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ ERRO CRÍTICO no diagnóstico:', error);
      result.details.criticalError = error;
      return result;
    }
  },

  // COMANDO PARA EXECUTAR NO CONSOLE - DIAGNÓSTICO COMPLETO DE CONVERSAS
  async debugConversas(instanceToken: string): Promise<void> {
    console.log('');
    console.log('🔍==== DIAGNÓSTICO COMPLETO DE CONVERSAS ====');
    console.log('Token:', instanceToken?.substring(0, 10) + '...');
    console.log('Servidor:', getBaseURL());
    console.log('');
    
    const api = createApiClient();
    
    // 1. Status da instância
    console.log('1️⃣ VERIFICANDO STATUS DA INSTÂNCIA...');
    try {
      const statusResponse = await api.get('/instance/status', {
        headers: { 'token': instanceToken }
      });
      
      console.log('✅ Status:', statusResponse.data?.status);
      console.log('📊 Dados completos:', statusResponse.data);
      
      if (statusResponse.data?.status !== 'open' && statusResponse.data?.status !== 'connected') {
        console.log('❌ PROBLEMA: Instância não conectada!');
        console.log('💡 Solução: Conecte a instância no WhatsApp primeiro');
        return;
      }
    } catch (error: any) {
      console.log('❌ Erro ao verificar status:', error.response?.data || error.message);
      return;
    }
    
    console.log('');
    
    // 2. Testando endpoints de conversas
    console.log('2️⃣ TESTANDO ENDPOINT /chat/find...');
    try {
      const chatFindResponse = await api.post('/chat/find', {}, {
        headers: { 'token': instanceToken }
      });
      
      console.log('✅ Status HTTP:', chatFindResponse.status);
      console.log('📊 Tipo de dados:', typeof chatFindResponse.data);
      console.log('📊 É array:', Array.isArray(chatFindResponse.data));
      console.log('📊 Quantidade:', Array.isArray(chatFindResponse.data) ? chatFindResponse.data.length : 'N/A');
      console.log('📊 Dados:', chatFindResponse.data);
      
      if (Array.isArray(chatFindResponse.data) && chatFindResponse.data.length > 0) {
        console.log('🎯 PRIMEIRA CONVERSA ENCONTRADA:');
        console.log(chatFindResponse.data[0]);
      }
    } catch (error: any) {
      console.log('❌ Erro em /chat/find:', error.response?.data || error.message);
    }
    
    console.log('');
    
    // 3. Testando endpoint alternativo
    console.log('3️⃣ TESTANDO ENDPOINT /chat/list...');
    try {
      const chatListResponse = await api.get('/chat/list', {
        headers: { 'token': instanceToken }
      });
      
      console.log('✅ Status HTTP:', chatListResponse.status);
      console.log('📊 Tipo de dados:', typeof chatListResponse.data);
      console.log('📊 É array:', Array.isArray(chatListResponse.data));
      console.log('📊 Quantidade:', Array.isArray(chatListResponse.data) ? chatListResponse.data.length : 'N/A');
      console.log('📊 Dados:', chatListResponse.data);
    } catch (error: any) {
      console.log('❌ Erro em /chat/list:', error.response?.data || error.message);
    }
    
    console.log('');
    
    // 4. Verificando contatos (só para comparar)
    console.log('4️⃣ VERIFICANDO CONTATOS (para comparação)...');
    try {
      const contactsResponse = await api.get('/contacts', {
        headers: { 'token': instanceToken }
      });
      
      console.log('✅ Status HTTP:', contactsResponse.status);
      console.log('📊 Quantidade de contatos:', Array.isArray(contactsResponse.data) ? contactsResponse.data.length : 'N/A');
      
      if (Array.isArray(contactsResponse.data) && contactsResponse.data.length > 0) {
        console.log('🎯 PRIMEIRO CONTATO:');
        console.log(contactsResponse.data[0]);
      }
    } catch (error: any) {
      console.log('❌ Erro em /contacts:', error.response?.data || error.message);
    }
    
    console.log('');
    console.log('🎯 CONCLUSÃO:');
    console.log('- Se você vê CONTATOS mas não CONVERSAS, significa:');
    console.log('  1. A instância não tem conversas ativas no WhatsApp');
    console.log('  2. Você precisa enviar/receber mensagens primeiro');
    console.log('  3. Os endpoints de conversas podem ter mudado');
    console.log('');
    console.log('💡 PRÓXIMOS PASSOS:');
    console.log('- Envie algumas mensagens no WhatsApp da instância');
    console.log('- Execute este comando novamente');
    console.log('- Se ainda não funcionar, os endpoints mudaram');
    console.log('==================================================');
  },

  // Converter arquivo para base64
  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remover prefixo data:tipo;base64, para ficar só o base64
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  // Enviar mídia - CONFORME DOCUMENTAÇÃO OFICIAL UAZAPI
  async sendMedia(instanceToken: string, data: {
    number: string;
    file: File;
    type: 'image' | 'video' | 'audio' | 'ptt' | 'document' | 'sticker';
    text?: string;
    docName?: string;
    delay?: number;
  }): Promise<any> {
    try {
      console.log('📎 ENVIANDO MÍDIA - Token:', instanceToken?.substring(0, 10) + '...');
      console.log('📎 ENVIANDO MÍDIA - Número:', data.number);
      console.log('📎 ENVIANDO MÍDIA - Tipo:', data.type);
      console.log('📎 ENVIANDO MÍDIA - Arquivo:', data.file.name, '(', (data.file.size / 1024 / 1024).toFixed(2), 'MB )');
      
      const api = createApiClient();
      
      // Converter arquivo para base64
      const fileBase64 = await this.fileToBase64(data.file);
      
      // Estrutura conforme documentação oficial POST /send/media
      const requestBody = {
        number: data.number,
        type: data.type,
        file: fileBase64, // Base64 do arquivo
        text: data.text || '', // Legenda/texto
        docName: data.docName || data.file.name, // Nome do documento (para type: document)
        replyid: '', // Para responder mensagem específica
        mentions: '', // Para mencionar usuários
        readchat: true, // Marcar chat como lido
        delay: data.delay || 0 // Delay em milissegundos
      };

      console.log('📎 ENVIANDO MÍDIA - Request Body preparado');
      
      const response = await api.post('/send/media', requestBody, {
        headers: {
          'token': instanceToken,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ MÍDIA ENVIADA COM SUCESSO:', response.data);
      return response.data;
      
    } catch (error: any) {
      console.error('❌ ERRO AO ENVIAR MÍDIA:', error);
      
      if (error.response) {
        console.error('❌ ERRO RESPONSE:', error.response.status, error.response.data);
        throw new Error(`Erro ${error.response.status}: ${error.response.data?.message || 'Erro ao enviar mídia'}`);
      } else if (error.request) {
        console.error('❌ ERRO REQUEST:', error.request);
        throw new Error('Erro de conectividade - verifique sua internet');
      } else {
        console.error('❌ ERRO GERAL:', error.message);
        throw new Error(error.message || 'Erro inesperado ao enviar mídia');
      }
    }
  },

  // Enviar múltiplas mídias sequencialmente
  async sendMultipleMedia(instanceToken: string, chatId: string, mediaFiles: Array<{
    id: string;
    file: File;
    type: 'image' | 'video' | 'audio' | 'document';
    caption?: string;
  }>, onProgress?: (current: number, total: number, currentFile: string) => void): Promise<void> {
    console.log('📎 ENVIANDO MÚLTIPLAS MÍDIAS:', mediaFiles.length, 'arquivos');
    
    for (let i = 0; i < mediaFiles.length; i++) {
      const mediaFile = mediaFiles[i];
      
      try {
        // Notificar progresso
        if (onProgress) {
          onProgress(i + 1, mediaFiles.length, mediaFile.file.name);
        }
        
        console.log(`📎 ENVIANDO ${i + 1}/${mediaFiles.length}:`, mediaFile.file.name);
        
        // Mapear type para o formato da API
        let apiType: 'image' | 'video' | 'audio' | 'ptt' | 'document' | 'sticker' = 'document';
        if (mediaFile.type === 'image') apiType = 'image';
        else if (mediaFile.type === 'video') apiType = 'video';
        else if (mediaFile.type === 'audio') {
          // Para áudio, verificar se é PTT ou áudio normal
          apiType = mediaFile.file.type.includes('ogg') || mediaFile.file.type.includes('opus') ? 'ptt' : 'audio';
        }
        else apiType = 'document';
        
        await this.sendMedia(instanceToken, {
          number: chatId,
          file: mediaFile.file,
          type: apiType,
          text: mediaFile.caption || '',
          docName: apiType === 'document' ? mediaFile.file.name : undefined,
          delay: 1000 // 1 segundo entre envios
        });
        
        console.log(`✅ MÍDIA ${i + 1}/${mediaFiles.length} ENVIADA:`, mediaFile.file.name);
        
        // Delay entre envios para evitar rate limiting
        if (i < mediaFiles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 segundos entre envios
        }
        
      } catch (error) {
        console.error(`❌ ERRO AO ENVIAR MÍDIA ${i + 1}/${mediaFiles.length}:`, mediaFile.file.name, error);
        
        // Continuar com próximo arquivo mesmo se um falhar
        if (onProgress) {
          onProgress(i + 1, mediaFiles.length, `ERRO: ${mediaFile.file.name}`);
        }
        
        // Opcional: para por aqui ou continuar?
        // throw error; // Descomente para parar no primeiro erro
      }
    }
    
    console.log('✅ ENVIO DE MÚLTIPLAS MÍDIAS CONCLUÍDO');
  },

  // ===== ENDPOINTS PARA AÇÕES NA MENSAGEM E BUSCAR =====

  // Buscar mensagens - CONFORME DOCUMENTAÇÃO OFICIAL UAZAPI
  async searchMessages(instanceToken: string, filters: {
    chatid?: string;
    id?: string;
    limit?: number;
  }): Promise<Message[]> {
    try {
      console.log('💬 BUSCANDO MENSAGENS - Token:', instanceToken?.substring(0, 10) + '...');
      console.log('💬 BUSCANDO MENSAGENS - Filtros:', filters);
      console.log('💬 BUSCANDO MENSAGENS - Chat ID:', filters.chatid);
      
      if (!filters.chatid && !filters.id) {
        console.warn('⚠️ ChatID ou ID não fornecido para buscar mensagens');
        return [];
      }
      
      const api = createApiClient(); 
      
      // USAR APENAS O ENDPOINT OFICIAL: POST /message/find
      console.log('💬 Usando endpoint oficial: POST /message/find');
      
      // Preparar body conforme documentação oficial
      const requestBody: any = {};
      
      if (filters.chatid) {
        // Garantir que o chatid termine com @s.whatsapp.net para conversas individuais
        // ou @g.us para grupos
        let chatid = filters.chatid;
        if (!chatid.includes('@')) {
          // Se não tem @, adicionar @s.whatsapp.net (padrão para conversas individuais)
          chatid = `${chatid}@s.whatsapp.net`;
        }
        requestBody.chatid = chatid;
      }
      
      if (filters.id) {
        requestBody.id = filters.id;
      }
      
      if (filters.limit) {
        requestBody.limit = filters.limit;
      }
      
      console.log('📤 REQUISIÇÃO /message/find:', requestBody);
      
      const response = await api.post('/message/find', requestBody, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'token': instanceToken
        }
      });
      
      console.log('📨 RESPOSTA /message/find:');
      console.log('- Status:', response.status);
      console.log('- Data Type:', typeof response.data);
      console.log('- Data Length:', Array.isArray(response.data) ? response.data.length : 'Not array');
      console.log('- Data:', response.data);
      
      if (!response.data) {
        console.log('⚠️ Resposta vazia da API');
        return [];
      }
      
      // A API pode retornar array direto ou objeto com array
      let messagesArray: any[] = [];
      
      if (Array.isArray(response.data)) {
        messagesArray = response.data;
      } else if (response.data.messages && Array.isArray(response.data.messages)) {
        messagesArray = response.data.messages;
      } else {
        console.error('❌ Formato de resposta não esperado:', response.data);
        return [];
      }
      
      if (messagesArray.length === 0) {
        console.log('⚠️ Nenhuma mensagem encontrada para os filtros especificados');
        return [];
      }
      
      console.log(`📋 PROCESSANDO ${messagesArray.length} MENSAGENS`);
      if (messagesArray.length > 0) {
        console.log('📨 Primeira mensagem (exemplo):', messagesArray[0]);
        console.log('📨 Campos disponíveis:', Object.keys(messagesArray[0] || {}));
      }
      
      const mappedMessages = messagesArray.map((message: any) => {
        // Processar body de forma inteligente para preservar estrutura de mídia
        let processedBody;
        
        // Se message.body é um objeto (mídia com metadados), preservar
        if (message.body && typeof message.body === 'object') {
          processedBody = message.body;
          console.log('📎 Preservando objeto de mídia no body:', {
            messageId: message.id,
            bodyKeys: Object.keys(message.body),
            fullBody: message.body,
            hasCaption: !!message.body.caption,
            hasUrl: !!message.body.url,
            hasMimetype: !!message.body.mimetype,
            messageType: message.type,
            hasMediaUrl: !!message.mediaUrl
          });
        } else {
          // Para mensagens de texto, usar fallback normal
          processedBody = message.body || message.text || message.content || message.conversation || '';
        }
        
        // Mapear mediaUrl de múltiplas fontes possíveis
        const mediaUrl = message.fileURL || message.mediaUrl || message.media || message.url || '';
        
        console.log('🔍 MAPEAMENTO DE MÍDIA:', {
          messageId: message.id,
          messageType: message.messageType || message.type,
          hasFileURL: !!message.fileURL,
          hasMediaUrl: !!message.mediaUrl,
          hasMedia: !!message.media,
          hasUrl: !!message.url,
          finalMediaUrl: mediaUrl,
          content: message.content,
          text: message.text
        });
        
        return {
          id: message.id || message._id || Date.now().toString(),
          chatId: message.chatId || message.from || message.remoteJid || filters.chatid || '',
          fromMe: message.fromMe || false,
          timestamp: message.timestamp || message.messageTimestamp || message.t || Date.now(),
          body: processedBody,
          type: message.messageType || message.type || 'text',
          mediaUrl: mediaUrl,
          quotedMsg: message.quotedMsg || message.contextInfo?.quotedMessage || message.quoted || message.quotedMessage || null,
          isForwarded: message.isForwarded || false,
          author: message.author || message.pushName || message.participant || '',
          pushName: message.pushName || '',
          status: message.status || 'sent'
        };
      });
      
      // Filtrar mensagens válidas
      const validMessages = mappedMessages.filter(msg => 
        msg.id && msg.id.length > 0 && (msg.body || msg.type !== 'text')
      );
      
      console.log(`✅ SUCESSO: ${validMessages.length} de ${mappedMessages.length} mensagens válidas processadas`);
      return validMessages;
      
    } catch (error: any) {
      console.error('❌ ERRO CRÍTICO ao buscar mensagens:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        method: error.config?.method,
        chatid: filters.chatid
      });
      
      // Verificar erros específicos
      if (error.response?.status === 404) {
        console.warn('⚠️ Endpoint /message/find não encontrado - verifique a URL base do servidor');
      } else if (error.response?.status === 401) {
        console.warn('⚠️ Token inválido ou sem permissão');
      } else if (error.response?.status === 400) {
        console.warn('⚠️ Parâmetros inválidos na requisição');
      }
      
      return [];
    }
  },

  // Enviar reação
  async reactToMessage(instanceToken: string, number: string, messageId: string, emoji: string): Promise<boolean> {
    try {
      const api = createApiClient(); const response = await api.post('/message/react', {
        number: number,
        text: emoji,
        id: messageId
      }, {
        headers: {
          'Accept': 'application/json',
          'token': instanceToken
        }
      });
      
      console.log('Resposta da API (reagir mensagem):', response.data);
      return response.data.success || false;
    } catch (error) {
      console.error('Erro ao reagir à mensagem:', error);
      return false;
    }
  },

  // Apagar mensagem
  async deleteMessage(instanceToken: string, messageId: string): Promise<boolean> {
    try {
      const api = createApiClient(); const response = await api.post('/message/delete', {
        id: messageId
      }, {
        headers: {
          'Accept': 'application/json',
          'token': instanceToken
        }
      });
      
      console.log('Resposta da API (apagar mensagem):', response.data);
      return response.data.success || false;
    } catch (error) {
      console.error('Erro ao apagar mensagem:', error);
      return false;
    }
  },

  // Marcar mensagem como lida
  async markMessageAsRead(instanceToken: string, messageIds: string[]): Promise<boolean> {
    try {
      const api = createApiClient(); const response = await api.post('/message/markread', {
        id: messageIds
      }, {
        headers: {
          'Accept': 'application/json',
          'token': instanceToken
        }
      });
      
      console.log('Resposta da API (marcar mensagem como lida):', response.data);
      return response.data.success || false;
    } catch (error) {
      console.error('Erro ao marcar mensagem como lida:', error);
      return false;
    }
  },

  // Baixar arquivo de uma mensagem
  async downloadMessageMedia(instanceToken: string, messageId: string, transcribe: boolean = false, openaiApiKey?: string): Promise<any> {
    try {
      const requestData: any = {
        id: messageId,
        transcribe: transcribe
      };
      
      if (transcribe && openaiApiKey) {
        requestData.openai_apikey = openaiApiKey;
      }
      
      const api = createApiClient(); const response = await api.post('/message/download', requestData, {
        headers: {
          'Accept': 'application/json',
          'token': instanceToken
        }
      });
      
      console.log('Resposta da API (baixar mídia):', response.data);
      return response.data;
    } catch (error) {
      console.error('Erro ao baixar mídia da mensagem:', error);
      return null;
    }
  },

  // Enviar presença (digitando/gravando)
  async sendPresence(instanceToken: string, number: string, presence: 'composing' | 'recording', delay: number = 2000): Promise<boolean> {
    try {
      const api = createApiClient(); const response = await api.post('/message/presence', {
        number: number,
        presence: presence,
        delay: delay
      }, {
        headers: {
          'Accept': 'application/json',
          'token': instanceToken
        }
      });
      
      console.log('Resposta da API (enviar presença):', response.data);
      return response.data.success || false;
    } catch (error) {
      console.error('Erro ao enviar presença:', error);
      return false;
    }
  },

};
export default uazapiService;

