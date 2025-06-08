import axios from 'axios';

// Definindo a URL base da API UAZAPI
const BASE_URL = 'https://i9place1.uazapi.com';

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

// Criando instância axios com configurações comuns
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

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
      
      if (!instanceToken) {
        console.error('Token de instância não fornecido');
        return [];
      }
      
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
      
      const minDelay = Math.floor((data.minDelay || 3000) / 1000); // Converter para segundos
      const maxDelay = Math.floor((data.maxDelay || 7000) / 1000); // Converter para segundos
      
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
      
      for (const number of numbers) {
        const message: any = {
          number: number, // Número individual
          type: messageType
        };
        
        // Adicionar texto se fornecido
        if (data.message) {
          message.text = data.message;
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
          }
          
          // Construir o payload com todas as mensagens
          const payload: UazapiSenderAdvancedPayload = {
            delayMin: requestData.delayMin || 1,
            delayMax: requestData.delayMax || 3,
            info: requestData.info || 'Campanha ConecteZap',
            messages: massMessages
          };
          
          // Adicionar scheduled_for se estiver definido
          if (requestData.scheduled_for) {
            payload.scheduled_for = requestData.scheduled_for;
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
            scheduled_for: payload.scheduled_for || 'não agendado'
          });
          
          // Fazer a requisição para o endpoint /sender/advanced
          const response = await api.post('/sender/advanced', payload, {
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
          console.error('URL completa:', `${api.defaults.baseURL}/sender/advanced`);
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
          
          const response = await api.post(endpoint, messageData, {
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
      const response = await api.get(url, {
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
        
        // Buscar dados detalhados das mensagens se necessário
        let detailedLogs = {
          log_delivered: campaign.log_delivered || 0,
          log_read: campaign.log_read || 0,
          log_failed: campaign.log_failed || 0,
          log_sucess: campaign.log_sucess || 0
        };
        
        // Sempre tentar buscar dados detalhados para campanhas concluídas ou com total > 0
         if (total > 0) {
           try {
             console.log(`🔍 Buscando dados detalhados para campanha ${campaign.id}...`);
             const messages = await this.getCampaignMessages(instanceToken, campaign.id);
             console.log(`📊 Encontradas ${messages.length} mensagens para campanha ${campaign.id}`);
             
             if (messages.length > 0) {
               // Log de exemplo das primeiras mensagens para debug
               console.log('Exemplo de mensagens retornadas:', messages.slice(0, 3));
               
               // Contar status das mensagens
               const statusCounts = messages.reduce((acc: any, msg: any) => {
                 // Tentar diferentes campos de status
                 const status = msg.status || msg.messageStatus || msg.deliveryStatus || msg.state;
                 if (status) {
                   acc[status] = (acc[status] || 0) + 1;
                 }
                 // Log para debug
                 if (!status) {
                   console.log('Mensagem sem status definido:', msg);
                 }
                 return acc;
               }, {});
               
               console.log(`📈 Status das mensagens da campanha ${campaign.id}:`, statusCounts);
               
               // Mapear status para nossos campos (mais abrangente)
               detailedLogs = {
                 log_delivered: (
                   statusCounts['Delivered'] || 
                   statusCounts['delivered'] || 
                   statusCounts['DELIVERED'] ||
                   statusCounts['Entregue'] ||
                   statusCounts['entregue'] || 0
                 ),
                 log_read: (
                   statusCounts['Read'] || 
                   statusCounts['read'] || 
                   statusCounts['READ'] ||
                   statusCounts['Lida'] ||
                   statusCounts['lida'] || 0
                 ),
                 log_failed: (
                   statusCounts['Failed'] || 
                   statusCounts['failed'] || 
                   statusCounts['FAILED'] ||
                   statusCounts['Error'] ||
                   statusCounts['error'] ||
                   statusCounts['Falhou'] ||
                   statusCounts['falhou'] || 0
                 ),
                 log_sucess: (
                   statusCounts['Success'] || 
                   statusCounts['success'] || 
                   statusCounts['SUCCESS'] ||
                   statusCounts['Sent'] ||
                   statusCounts['sent'] ||
                   statusCounts['Enviado'] ||
                   statusCounts['enviado'] || 0
                 )
               };
               
               console.log(`✅ Logs detalhados calculados para campanha ${campaign.id}:`, detailedLogs);
             } else {
               console.log(`⚠️ Nenhuma mensagem encontrada para campanha ${campaign.id}`);
             }
           } catch (error) {
             console.error(`❌ Erro ao buscar detalhes das mensagens para campanha ${campaign.id}:`, error);
           }
         }
        
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
        
        // Determinar o status real baseado no progresso
        let realStatus = this.mapApiStatus(campaign.status);
        console.log('Status inicial mapeado:', realStatus);
        
        // Se o progresso é 100% ou todas as mensagens foram processadas, marcar como concluída
        if (total > 0 && processed >= total && progress >= 100) {
          realStatus = 'completed';
          console.log(`✅ Campanha ${campaign.id} marcada como CONCLUÍDA: ${processed}/${total} mensagens processadas`);
        }
        // Se há mensagens processadas mas não todas, e status não é 'paused' ou 'cancelled', marcar como ativo
        else if (total > 0 && processed > 0 && processed < total && !['paused', 'cancelled', 'failed'].includes(realStatus)) {
          realStatus = 'ativo';
          console.log(`🔄 Campanha ${campaign.id} marcada como ATIVA: ${processed}/${total} mensagens processadas`);
        }
        
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
    const statusMap: Record<string, Campaign['status']> = {
      'ativo': 'ativo',
      'Active': 'ativo',
      'active': 'ativo',
      'running': 'running',
      'paused': 'paused',
      'completed': 'completed',
      'Done': 'completed',
      'done': 'completed',
      'cancelled': 'cancelled',
      'canceled': 'cancelled',
      'failed': 'failed',
      'Failed': 'failed',
      'scheduled': 'scheduled',
      'Scheduled': 'scheduled',
      'Archived': 'completed',
      'archived': 'completed'
    };
    
    console.log('Status da API:', apiStatus, '-> Mapeado para:', statusMap[apiStatus] || 'running');
    return statusMap[apiStatus] || 'running';
  },
  
  // Helper para calcular o progresso da campanha
  calculateProgress(campaign: any): number {
    const total = campaign.log_total || 0;
    if (total === 0) return 0;
    
    const processed = (campaign.log_sucess || 0) + (campaign.log_failed || 0);
    const progress = Math.floor((processed / total) * 100);
    
    // Se o progresso é 100% e o status ainda não foi atualizado, forçar status como concluído
    if (progress >= 100 && processed >= total) {
      console.log('Campanha concluída detectada:', campaign.id, 'Total:', total, 'Processado:', processed);
    }
    
    return progress;
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
      const response = await api.post('/message/queue/pause', { id: campaignId }, {
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
      const response = await api.post('/sender/edit', {
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

  // Buscar chats com filtros avançados
  async searchChats(instanceToken: string, filters: any = {}): Promise<Chat[]> {
    try {
      console.log('Buscando chats com filtros:', filters);
      
      const response = await api.post('/chat/find', filters, {
        headers: {
          'Accept': 'application/json',
          'token': instanceToken
        }
      });
      
      console.log('Resposta da API (buscar chats):', response.data);
      
      if (!response.data || !Array.isArray(response.data)) {
        return [];
      }
      
      return response.data.map((chat: any) => ({
        id: chat.wa_jid || chat.id || '',
        name: chat.lead_name || chat.wa_contactName || chat.name || 'Sem nome',
        isGroup: chat.wa_isGroup || false,
        unreadCount: chat.wa_unreadCount || 0,
        lastMessageTimestamp: chat.wa_lastMsgTimestamp || 0,
        isArchived: chat.wa_isArchived || false,
        isPinned: chat.wa_isPinned || false,
        isMuted: chat.wa_isMuted || false,
        muteEndTime: chat.wa_muteEndTime || 0,
        profilePicUrl: chat.wa_profilePicUrl || ''
      }));
    } catch (error) {
      console.error('Erro ao buscar chats:', error);
      return [];
    }
  },

  // Etiquetar chat
  async labelChat(instanceToken: string, number: string, labelIds: string[]): Promise<boolean> {
    try {
      const response = await api.post('/chat/labels', {
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
      const response = await api.post('/chat/pin', {
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
      const response = await api.post('/chat/mute', {
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
      const response = await api.post('/chat/archive', {
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

  // Marcar chat como lido/não lido
  async markChatAsRead(instanceToken: string, number: string, read: boolean): Promise<boolean> {
    try {
      const response = await api.post('/chat/read', {
        number: number,
        read: read
      }, {
        headers: {
          'Accept': 'application/json',
          'token': instanceToken
        }
      });
      
      console.log('Resposta da API (marcar chat como lido):', response.data);
      return response.data.success || false;
    } catch (error) {
      console.error('Erro ao marcar chat como lido:', error);
      return false;
    }
  },

  // Bloquear/desbloquear usuário
  async blockUser(instanceToken: string, number: string, block: boolean): Promise<boolean> {
    try {
      const response = await api.post('/chat/block', {
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
      const response = await api.get('/chat/blocklist', {
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
      const response = await api.post('/chat/delete', {
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
      const response = await api.get('/labels', {
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
      const response = await api.post('/label/edit', {
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
      const response = await api.post('/chat/GetNameAndImageURL', {
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

  // Verificar se número existe no WhatsApp
  async checkNumber(instanceToken: string, number: string): Promise<any> {
    try {
      const response = await api.post('/chat/check', {
        number: number
      }, {
        headers: {
          'Accept': 'application/json',
          'token': instanceToken
        }
      });
      
      console.log('Resposta da API (verificar número):', response.data);
      return response.data;
    } catch (error) {
      console.error('Erro ao verificar número:', error);
      return null;
    }
  },

  // ===== ENDPOINTS PARA AÇÕES NA MENSAGEM E BUSCAR =====

  // Buscar mensagens
  async searchMessages(instanceToken: string, filters: {
    chatid?: string;
    id?: string;
    limit?: number;
  }): Promise<Message[]> {
    try {
      console.log('Buscando mensagens com filtros:', filters);
      
      const response = await api.post('/message/find', filters, {
        headers: {
          'Accept': 'application/json',
          'token': instanceToken
        }
      });
      
      console.log('Resposta da API (buscar mensagens):', response.data);
      
      if (!response.data || !Array.isArray(response.data)) {
        return [];
      }
      
      return response.data.map((message: any) => ({
        id: message.id || '',
        chatId: message.chatId || message.from || '',
        fromMe: message.fromMe || false,
        timestamp: message.timestamp || message.t || 0,
        body: message.body || message.text || '',
        type: message.type || 'text',
        mediaUrl: message.mediaUrl || '',
        quotedMsg: message.quotedMsg || null,
        isForwarded: message.isForwarded || false,
        author: message.author || '',
        pushName: message.pushName || '',
        status: message.status || 'sent'
      }));
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      return [];
    }
  },

  // Enviar reação
  async reactToMessage(instanceToken: string, number: string, messageId: string, emoji: string): Promise<boolean> {
    try {
      const response = await api.post('/message/react', {
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
      const response = await api.post('/message/delete', {
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
      const response = await api.post('/message/markread', {
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
      
      const response = await api.post('/message/download', requestData, {
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
      const response = await api.post('/message/presence', {
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

  // Método para buscar detalhes das mensagens de uma campanha
  async getCampaignMessages(instanceToken: string, folderId: string): Promise<any[]> {
    try {
      const response = await api.post('/sender/listmessages', {
        folder_id: folderId
      }, {
        headers: {
          'Accept': 'application/json',
          'token': instanceToken
        }
      });
      
      console.log(`Mensagens da campanha ${folderId}:`, response.data);
      return response.data || [];
    } catch (error) {
      console.error(`Erro ao buscar mensagens da campanha ${folderId}:`, error);
      return [];
    }
  }
};