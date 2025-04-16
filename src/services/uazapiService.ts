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
  status: 'scheduled' | 'running' | 'completed' | 'paused' | 'failed' | 'cancelled' | 'ativo';
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
  status: 'running' | 'paused' | 'completed' | 'cancelled' | 'scheduled';
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
  
  // Método para enviar mensagem em massa
  async sendMassMessage(instanceToken: string, data: any): Promise<any> {
    try {
      console.log('Enviando mensagem em massa:', data);
      
      // Verificar se é uma mensagem agendada
      const isScheduled = data.scheduledFor && typeof data.scheduledFor === 'number';
      
      if (isScheduled) {
        console.log(`Agendando mensagem para timestamp: ${data.scheduledFor}`); 
        // Para mensagens agendadas, usamos o endpoint /message/queue/folder
        return this.sendScheduledMessage(instanceToken, data);
      }
      
      // Determinar qual endpoint usar com base no tipo de mensagem para envio imediato
      let endpoint = '/send/text';
      if (data.media) {
        endpoint = '/send/media';
      }
      
      // Preparar para envio sequencial
      const results = [];
      const numbers = data.numbers || [];
      const minDelay = data.minDelay || 3000; // 3 segundos padrão
      const maxDelay = data.maxDelay || 7000; // 7 segundos padrão
      
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
      
      // Para cada número, fazer uma requisição separada
      for (const number of numbers) {
        // Verificar se a campanha foi pausada ou cancelada
        if (activeCampaigns[campaignId].status === 'paused') {
          console.log(`Campanha ${campaignId} pausada após ${activeCampaigns[campaignId].sent} envios`);
          break;
        }
        if (activeCampaigns[campaignId].status === 'cancelled') {
          console.log(`Campanha ${campaignId} cancelada após ${activeCampaigns[campaignId].sent} envios`);
          break;
        }
        
        // Criar objeto de dados para este destinatário
        const messageData: any = {
          number: number,
          text: data.message
        };
        
        // Se for mídia, adicionar os campos necessários
        if (data.media) {
          // Detectar o tipo de mídia baseado no mimetype
          messageData.type = data.media.mimetype.startsWith('image') ? 'image' : 
                           data.media.mimetype.startsWith('video') ? 'video' : 
                           data.media.mimetype.startsWith('audio') ? 'audio' : 'document';
          
          // Para mídia, a API espera uma URL ou um arquivo base64 prefixado
          // Verificar se já tem o prefixo data:mimetype;base64,
          if (data.media.data.startsWith('data:')) {
            // Já está no formato correto com prefixo
            messageData.file = data.media.data;
          } else {
            // Adicionar o prefixo correto
            messageData.file = `data:${data.media.mimetype};base64,${data.media.data}`;
          }
          
          // Para documentos, adicionar nome do arquivo
          if (messageData.type === 'document' && data.media.filename) {
            messageData.docName = data.media.filename;
          }
          
          // Incluir caption/texto se houver
          if (data.message && data.message.trim()) {
            messageData.caption = data.message;
            // No caso de mídia, o API usa caption em vez de text
            delete messageData.text;
          }
        }
        
        try {
          // Fazer a requisição para este número
          console.log(`Enviando para ${number} usando endpoint ${endpoint}`);
          const response = await api.post(endpoint, messageData, {
            headers: {
              'token': instanceToken
            }
          });
          
          results.push(response.data);
          activeCampaigns[campaignId].results.push({
            number,
            success: true,
            data: response.data
          });
          activeCampaigns[campaignId].sent++;
        } catch (error) {
          console.error(`Erro ao enviar para ${number}:`, error);
          activeCampaigns[campaignId].errors++;
          activeCampaigns[campaignId].results.push({
            number,
            success: false,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        }
        
        // Atualizar progresso
        activeCampaigns[campaignId].progress = Math.floor((activeCampaigns[campaignId].sent + activeCampaigns[campaignId].errors) / activeCampaigns[campaignId].totalRecipients * 100);
        
        // Calcular um atraso aleatório entre minDelay e maxDelay
        if (numbers.indexOf(number) < numbers.length - 1) {
          const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
          console.log(`Aguardando ${delay}ms antes de enviar a próxima mensagem`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      // Marcar campanha como concluída se não foi pausada ou cancelada
      if (activeCampaigns[campaignId].status === 'running') {
        activeCampaigns[campaignId].status = 'completed';
      }
      
      return { 
        success: true, 
        campaignId,
        results
      };
    } catch (error) {
      console.error('Erro ao enviar mensagem em massa:', error);
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
          
          // Para mídia, a API espera uma URL ou um arquivo base64 prefixado
          if (data.media.data.startsWith('data:')) {
            messageData.file = data.media.data;
          } else {
            messageData.file = `data:${data.media.mimetype};base64,${data.media.data}`;
          }
          
          // Para documentos, adicionar nome do arquivo
          if (messageData.type === 'document' && data.media.filename) {
            messageData.docName = data.media.filename;
          }
          
          // Incluir caption/texto se houver
          if (data.message && data.message.trim()) {
            messageData.caption = data.message;
            delete messageData.text;
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
  async getCampaigns(instanceToken?: string): Promise<Campaign[]> {
    // Se um token for fornecido, buscar campanhas na API da UAZAPI
    if (instanceToken) {
      console.log(`Buscando campanhas com token: ${instanceToken}`);
      return this.getCampaignsFromAPI(instanceToken);
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
  async getCampaignsFromAPI(instanceToken: string): Promise<Campaign[]> {
    try {
      console.log(`Buscando logs de campanhas com token: ${instanceToken}`);
      
      // Implementação real com a API UAZAPI
      const response = await api.get('/message/queue/folder', {
        headers: {
          'Accept': 'application/json',
          'token': instanceToken
        }
      });
      
      console.log('Resposta da API:', response.data);
      
      // Transformar os dados da API para o formato da nossa interface
      return response.data.map((campaign: any) => ({
        id: campaign.id,
        name: campaign.info || `Campanha ${campaign.id.substring(0, 8)}`,
        info: campaign.info,
        status: this.mapApiStatus(campaign.status),
        createdAt: campaign.created,
        scheduledAt: campaign.scheduled_for ? new Date(campaign.scheduled_for * 1000).toISOString() : undefined,
        scheduledFor: campaign.scheduled_for,
        totalRecipients: campaign.log_total || 0,
        successCount: campaign.log_sucess || 0,
        errorCount: campaign.log_failed || 0,
        pendingCount: (campaign.log_total || 0) - (campaign.log_sucess || 0) - (campaign.log_failed || 0),
        progress: this.calculateProgress(campaign),
        messageType: 'text',
        delayMax: campaign.delayMax,
        delayMin: campaign.delayMin,
        log_delivered: campaign.log_delivered,
        log_failed: campaign.log_failed,
        log_played: campaign.log_played,
        log_read: campaign.log_read,
        log_sucess: campaign.log_sucess,
        log_total: campaign.log_total,
        owner: campaign.owner,
        created: campaign.created,
        updated: campaign.updated
      }));
    } catch (error) {
      console.error('Erro ao buscar campanhas da API:', error);
      return [];
    }
  },
  
  // Helper para mapear status da API para o formato da interface
  mapApiStatus(apiStatus: string): Campaign['status'] {
    const statusMap: Record<string, Campaign['status']> = {
      'ativo': 'running',
      'paused': 'paused',
      'completed': 'completed',
      'cancelled': 'cancelled',
      'failed': 'failed',
      'scheduled': 'scheduled'
    };
    
    return statusMap[apiStatus] || 'running';
  },
  
  // Helper para calcular o progresso da campanha
  calculateProgress(campaign: any): number {
    const total = campaign.log_total || 0;
    if (total === 0) return 0;
    
    const processed = (campaign.log_sucess || 0) + (campaign.log_failed || 0);
    return Math.floor((processed / total) * 100);
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
  }
};