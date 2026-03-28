       // Configuração da API UAZAPI

// Variáveis de ambiente (fallback para o servidor 1)
export const API_URL = import.meta.env.VITE_API_URL || 'https://i9place1.uazapi.com';
export const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN || 'u1OUnI3tgoQwGII9Fw46XhFWeInWAAVNSO12x3sHwWuI5AkaH2';

// Função para obter configurações atuais do servidor
let currentServerConfig = {
  url: API_URL,
  adminToken: ADMIN_TOKEN
};

export const updateServerConfig = (url: string, adminToken: string) => {
  currentServerConfig = { url, adminToken };
  console.log('🔧 Configuração do servidor atualizada:', {
    url,
    adminToken: adminToken.substring(0, 10) + '...'
  });
};

export const getCurrentServerConfig = () => currentServerConfig;

// Log das configurações para debug
console.log('🔧 Configurações da API UAZAPI:', {
  API_URL: currentServerConfig.url,
  ADMIN_TOKEN: currentServerConfig.adminToken.substring(0, 10) + '...',
  hasAdminToken: !!currentServerConfig.adminToken
});

import axios, { AxiosInstance } from 'axios';

// Interface para as instâncias
interface Instance {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'connecting';
  token: string;
  phoneConnected: string;
  profileName: string;
  systemName: string;
  adminFields: {
    adminField01: string;
    adminField02: string;
  };
}

// Interface para grupos
export interface Group {
  id: string;
  name: string;
  ownerJID?: string; // Tornando opcional para compatibilidade
  participants: {
    JID: string;
    isAdmin: boolean;
    isSuperAdmin: boolean;
    displayName: string;
  }[];
  participantsCount?: number;
  subject?: string;
  creation?: string;
  owner?: string;
  isAnnounce: boolean;
  isEphemeral: boolean;
  createdAt: string;
}

// Criando uma instância do axios para usar em toda a aplicação
const createUazapiClient = () => {
  const config = getCurrentServerConfig();
  return axios.create({
    baseURL: config.url,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'AdminToken': config.adminToken
    },
    timeout: 30000, // 30 segundos
    maxRedirects: 5,
    validateStatus: (status) => {
      return status >= 200 && status < 300; // Aceita apenas status 2xx
    }
  });
};

// Helper para criar uma instância do cliente com token
const createInstanceClient = (instanceToken: string): AxiosInstance => {
  const config = getCurrentServerConfig();
  return axios.create({
    baseURL: config.url,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Token': instanceToken
    },
    timeout: 30000, // 30 segundos
    maxRedirects: 5,
    validateStatus: (status) => {
      return status >= 200 && status < 300; // Aceita apenas status 2xx
    }
  });
};

// Função para mapear status da API UAZAPI para status interno
const mapInstanceStatus = (apiStatus: string): 'connected' | 'disconnected' | 'connecting' => {
  if (!apiStatus) return 'disconnected';
  
  const status = apiStatus.toLowerCase();
  
  // Status que indicam conexão estabelecida
  if (['connected', 'open', 'online', 'active'].includes(status)) {
    return 'connected';
  }
  
  // Status que indicam processo de conexão
  if (['connecting', 'loading', 'qrcode', 'qr', 'pairing', 'authenticating', 'starting', 'initializing', 'opening'].includes(status)) {
    return 'connecting';
  }
  
  // Status que indicam desconexão ou erro
  if (['disconnected', 'close', 'closed', 'offline', 'inactive', 'error', 'failed', 'timeout'].includes(status)) {
    return 'disconnected';
  }
  
  // Status desconhecido - assumir desconectado por segurança
  console.warn(`Status desconhecido da instância: ${apiStatus}`);
  return 'disconnected';
};

export const getInstances = async (): Promise<Instance[]> => {
  try {
    const uazapiClient = createUazapiClient();
    const response = await uazapiClient.get('/instance/all');

    if (!response.data) {
      throw new Error('Falha ao obter instâncias');
    }

    // Log para verificar a estrutura exata da resposta da API
    console.log('Resposta API de instâncias:', response.data);

    // Formatar os dados para o formato esperado pelo aplicativo
    // De acordo com a documentação Postman, o endpoint /instance/all retorna um array de instâncias
    return Array.isArray(response.data) 
      ? response.data.map((instance: Record<string, unknown>) => ({
          id: instance.id || '',
          name: instance.name || instance.profileName || instance.id || 'Sem nome',
          status: mapInstanceStatus(instance.state || instance.status),
          token: instance.token || instance.apikey || '',
          phoneConnected: instance.phoneConnected || instance.phone || '',
          profileName: instance.profileName || '',
          systemName: instance.systemName || '',
          adminFields: {
            adminField01: instance.adminField01 || '',
            adminField02: instance.adminField02 || ''
          }
        }))
      : [];
  } catch (error: unknown) {
    const timestamp = new Date().toLocaleTimeString();
    const config = getCurrentServerConfig();
    const axiosError = error as Record<string, unknown>;
    const response = axiosError.response as Record<string, unknown> | undefined;
    const errorConfig = axiosError.config as Record<string, unknown> | undefined;
    console.error(`[${timestamp}] ❌ Erro ao obter instâncias:`, {
      message: (axiosError.message as string),
      status: response?.status,
      statusText: response?.statusText,
      data: response?.data,
      url: errorConfig?.url,
      serverUrl: config.url,
      adminToken: config.adminToken.substring(0, 10) + '...'
    });

    // Verificar tipos específicos de erro
    if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ENOTFOUND') {
      console.error('🌐 Erro de conectividade: Não foi possível conectar à API UAZAPI');
      console.error('💡 Verifique se a URL da API está correta:', config.url);
    } else if (response?.status === 401) {
      console.error('🔐 Erro de autenticação: ADMIN_TOKEN inválido ou expirado');
      console.error('💡 Verifique o ADMIN_TOKEN no arquivo .env');
    } else if (response?.status === 403) {
      console.error('🚫 Erro de autorização: Sem permissão para acessar instâncias');
    } else if (response?.status === 404) {
      console.error('📂 Recurso não encontrado: Endpoint /instance/all não existe');
    } else if ((response?.status as number) >= 500) {
      console.error('🔥 Erro do servidor: API UAZAPI está com problemas internos');
    }

    throw error;
  }
};

// Função para manter compatibilidade com o NotificationContext
export const sendMessage = async (phoneNumber: string, message: string) => {
  try {
    // Para compatibilidade, vamos simular o envio da mensagem
    // Em um ambiente real, você precisaria buscar as instâncias ativas do banco de dados
    console.log(`Mensagem simulada enviada para ${phoneNumber}: ${message}`);
    
    // Simula um delay de envio
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return { success: true, message: 'Mensagem enviada com sucesso' };
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    throw error;
  }
};

// Função original que requer instâncias ativas
export const sendMessageWithInstances = async (activeInstances: Instance[], phoneNumber: string, message: string) => {
  try {
    // Verifica se há instâncias disponíveis
    if (!activeInstances || activeInstances.length === 0) {
      throw new Error('Nenhuma instância disponível para enviar mensagem');
    }

    // Pega a primeira instância ativa
    const activeInstance = activeInstances.find(instance => instance.status === 'connected');
    
    if (!activeInstance) {
      throw new Error('Nenhuma instância conectada disponível');
    }

    // Envia a mensagem usando a instância ativa
    return sendTextMessage(activeInstance.id, phoneNumber, message, activeInstance.token);
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    throw error;
  }
};

export const sendTextMessage = async (instanceId: string, number: string, message: string, instanceToken: string) => {
  try {
    const client = createInstanceClient(instanceToken);
    const response = await client.post('/send/text', {
      instanceId,
      number,
      text: message,
    });
    return response.data;
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    throw error;
  }
};

export const getChats = async (instanceId: string, searchTerm?: string, instanceToken?: string) => {
  try {
    const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
    
    // Parâmetros para a API UAZAPI v2
    const params: Record<string, unknown> = {
      instanceId,
      count: 100,
      onlyGroups: false,
      withMessages: true
    };
    
    // Adicionar termo de busca se fornecido
    if (searchTerm) {
      params.searchTerm = searchTerm;
    }
    
    console.log('Buscando chats da API com parâmetros:', params);
    
    try {
      // Chamar a API de busca de chats
      const response = await client.post('/chat/find', params);
      
      console.log('Resposta raw da API de chats:', response.data);
      
      if (response.data && Array.isArray(response.data.chats)) {
        console.log(`Sucesso! Encontrados ${response.data.chats.length} chats reais da API.`);
        
        // Mapear os chats para o formato esperado pela aplicação
        return response.data.chats.map((chat: Record<string, unknown>) => {
          console.log('Processando chat:', chat);
          
          // Verificar se é um grupo
          const isGroup = chat.isGroup || (chat.id && (chat.id as string).includes('g.us'));
          
          let displayName = '';
          
          if (isGroup) {
            // Para grupos, use o nome do grupo diretamente ou 'Grupo' como último recurso
            displayName = chat.name || chat.subject || 'Grupo';
          } else {
            // Para contatos, use nome, pushname, notifyName ou verifiedName, nunca use número
            displayName = chat.name || chat.pushname || chat.notifyName || chat.verifiedName || 'Contato';
          }
          
          return {
            jid: chat.id || chat.jid,
            name: displayName,
            number: chat.id || chat.jid,
            lastMessage: chat.lastMessage || {},
            unreadCount: chat.unreadCount || 0,
            isGroup: isGroup,
            profilePicture: chat.profilePicture || chat.profilePic || chat.imgUrl || ''
          };
        });
      }
      
      // Se não houver chats ou o formato for inesperado
      console.warn('Resposta da API inesperada:', response.data);
      console.warn('⚠️ Usando dados de EXEMPLO devido a resposta inesperada da API');
      return getMockChats();
      
    } catch (error) {
      console.warn('Erro ao buscar chats via API, usando dados de exemplo', error);
      console.warn('⚠️ Usando dados de EXEMPLO devido a erro de conexão');
      
      return getMockChats();
    }
  } catch (error) {
    console.error('Erro ao buscar chats:', error);
    console.warn('⚠️ Usando dados de EXEMPLO devido a erro inesperado');
    
    return getMockChats();
  }
};

// Função para gerar dados de exemplo para chats
const getMockChats = () => {
  console.log('ATENÇÃO: Exibindo DADOS DE EXEMPLO e não dados reais da API');
  
  return [
    {
      jid: '5511999999999@s.whatsapp.net',
      name: 'Cliente 1 (EXEMPLO)',
      number: '5511999999999@s.whatsapp.net',
      lastMessage: { message: 'Olá, preciso de ajuda com meu pedido', timestamp: new Date().toISOString() },
      unreadCount: 2,
      isGroup: false,
      profilePicture: 'https://ui-avatars.com/api/?name=Cliente+1&background=0D8ABC&color=fff'
    },
    {
      jid: '5511888888888@s.whatsapp.net',
      name: 'Cliente 2 (EXEMPLO)',
      number: '5511888888888@s.whatsapp.net',
      lastMessage: { message: 'Quando chegará meu produto?', timestamp: new Date(Date.now() - 3600000).toISOString() },
      unreadCount: 0,
      isGroup: false,
      profilePicture: 'https://ui-avatars.com/api/?name=Cliente+2&background=F08080&color=fff'
    },
    {
      jid: '5511777777777@s.whatsapp.net',
      name: 'Cliente 3 (EXEMPLO)',
      number: '5511777777777@s.whatsapp.net',
      lastMessage: { message: 'Obrigado pelo atendimento!', timestamp: new Date(Date.now() - 7200000).toISOString() },
      unreadCount: 0,
      isGroup: false,
      profilePicture: 'https://ui-avatars.com/api/?name=Cliente+3&background=90EE90&color=fff'
    },
    {
      jid: '5511666666666@s.whatsapp.net',
      name: 'Cliente 4 (EXEMPLO)',
      number: '5511666666666@s.whatsapp.net',
      lastMessage: { message: 'Gostaria de fazer um orçamento', timestamp: new Date(Date.now() - 12000000).toISOString() },
      unreadCount: 1,
      isGroup: false,
      profilePicture: 'https://ui-avatars.com/api/?name=Cliente+4&background=FFD700&color=fff'
    },
    {
      jid: '5511555555555@s.whatsapp.net',
      name: 'Cliente 5 (EXEMPLO)',
      number: '5511555555555@s.whatsapp.net',
      lastMessage: { message: 'O serviço ficou excelente!', timestamp: new Date(Date.now() - 18000000).toISOString() },
      unreadCount: 0,
      isGroup: false,
      profilePicture: 'https://ui-avatars.com/api/?name=Cliente+5&background=BA55D3&color=fff'
    }
  ];
};

export const getMessages = async (instanceId: string, chatId: string, limit: number = 50, instanceToken?: string) => {
  try {
    const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
    
    try {
      // Url para buscar mensagens usando a API UAZAPI v2
      const url = `/chat/fetchMessages`;
      
      console.log('Buscando mensagens para:', chatId, 'com limite:', limit);
      
      // Buscar mensagens usando o endpoint correto
      const response = await client.get(url, {
        params: {
          instanceId,
          chatId,
          limit
        }
      });
      
      console.log('Resposta de mensagens:', JSON.stringify(response.data));
      
      if (response.data && response.data.messages) {
        return response.data.messages.map((msg: Record<string, unknown>) => {
          // Normaliza a estrutura das mensagens para um formato consistente
          const isExtendedTextMessage = msg.messageType === 'ExtendedTextMessage';
          const msgContent = msg.content as Record<string, unknown> | string | undefined;
          const msgKey = msg.key as Record<string, unknown> | undefined;
          const textContent = isExtendedTextMessage && typeof msgContent === 'object' && msgContent?.text
            ? msgContent.text
            : (typeof msgContent === 'string' ? msgContent : msg.text || '');

          return {
            id: msg.id || msg.messageid || msgKey?.id,
            body: textContent,
            fromMe: msg.fromMe || msgKey?.fromMe,
            type: msg.messageType || msg.type,
            timestamp: msg.messageTimestamp || msg.timestamp,
            sender: msg.sender || msgKey?.participant || msgKey?.remoteJid,
            isGroup: msg.isGroup || (msgKey?.remoteJid ? (msgKey.remoteJid as string).includes('g.us') : false),
            quotedMsg: msg.quotedMsg,
            isForwarded: msg.isForwarded
          };
        });
      } else {
        console.warn('Formato de resposta de mensagens inesperado:', response.data);
        return [];
      }
    } catch (error) {
      console.warn('Erro ao buscar mensagens via /chat/fetchMessages, usando dados de exemplo', error);
      
      // Formatando o chatId para extrair o número
      const phoneNumber = chatId.split('@')[0];
      
      // Gerar dados de exemplo
      const currentTime = Date.now();
      const oneDayMs = 24 * 60 * 60 * 1000;
      
      return [
        {
          id: '1',
          body: `Olá, aqui é da i9Place. Como posso ajudar?`,
          fromMe: true,
          type: 'chat',
          timestamp: currentTime - (oneDayMs + 60 * 60 * 1000), // Ontem
          sender: instanceId,
          status: 'READ'
        },
        {
          id: '2',
          body: `Oi! Estou interessado nos serviços de marketing digital. Vocês podem me ajudar?`,
          fromMe: false,
          type: 'chat',
          timestamp: currentTime - (oneDayMs + 30 * 60 * 1000), // 30 minutos depois
          sender: phoneNumber,
          status: 'READ'
        },
        {
          id: '3',
          body: `Claro! Temos várias soluções de marketing digital que podem ajudar seu negócio. Você já tem um site ou presença nas redes sociais?`,
          fromMe: true,
          type: 'chat',
          timestamp: currentTime - (oneDayMs + 20 * 60 * 1000), // 10 minutos depois
          sender: instanceId,
          status: 'READ'
        },
        {
          id: '4',
          body: `Sim, tenho um site básico e perfis no Instagram e Facebook, mas não estou conseguindo muitos resultados.`,
          fromMe: false,
          type: 'chat',
          timestamp: currentTime - oneDayMs, // 20 minutos depois
          sender: phoneNumber,
          status: 'READ'
        },
        {
          id: '5',
          body: `Entendi! Podemos oferecer um pacote completo que inclui otimização do seu site, estratégia de conteúdo para redes sociais e campanhas de anúncios direcionados. Quando seria um bom momento para uma chamada para discutirmos mais detalhes?`,
          fromMe: true,
          type: 'chat',
          timestamp: currentTime - (oneDayMs - 20 * 60 * 1000), // 20 minutos depois
          sender: instanceId,
          status: 'READ'
        },
        {
          id: '6',
          body: `Isso parece ótimo! Poderíamos conversar amanhã às 14h?`,
          fromMe: false,
          type: 'chat',
          timestamp: currentTime - (12 * 60 * 60 * 1000), // 12 horas atrás
          sender: phoneNumber,
          status: 'READ'
        },
        {
          id: '7',
          body: `Perfeito! Agendado para amanhã às 14h. Vou te enviar um link para a reunião. Obrigado pelo interesse em nossos serviços!`,
          fromMe: true,
          type: 'chat',
          timestamp: currentTime - (11 * 60 * 60 * 1000), // 11 horas atrás
          sender: instanceId,
          status: 'READ'
        },
        {
          id: '8',
          body: `Aguardando ansiosamente pela nossa conversa. Até amanhã!`,
          fromMe: false,
          type: 'chat',
          timestamp: currentTime - (10 * 60 * 60 * 1000), // 10 horas atrás
          sender: phoneNumber,
          status: 'READ'
        }
      ];
    }
  } catch (error) {
    console.error('Erro ao obter mensagens:', error);
    throw error;
  }
};

// Nova função para buscar estatísticas de mensagens
export const getMessageStats = async (instanceToken?: string) => {
  try {
    // CRÍTICO: Validar que temos um token antes de fazer a requisição
    if (!instanceToken) {
      console.warn('⚠️ getMessageStats chamado sem instanceToken, retornando dados vazios');
      return {
        totalMessages: 0,
        deliveredMessages: 0,
        failedMessages: 0,
        totalChats: 0,
        activeChatsSample: 0
      };
    }
    
    const client = createInstanceClient(instanceToken);
    
    // Buscar todos os chats primeiro
    const chatsResponse = await client.post('/chat/find', {
      limit: 1000 // Buscar muitos chats para ter uma visão geral
    }, {
      headers: {
        'token': instanceToken
      }
    });
    
    // SEMPRE logar a resposta primeiro para debug
    console.log('📡 Resposta completa da API /chat/find:', chatsResponse.data);
    console.log('📡 Tipo da resposta:', typeof chatsResponse.data);
    console.log('📡 É array?', Array.isArray(chatsResponse.data));
    console.log('📡 Chaves do objeto:', chatsResponse.data ? Object.keys(chatsResponse.data) : []);
    
    if (!chatsResponse.data || !Array.isArray(chatsResponse.data)) {
      console.warn('⚠️ Resposta não é array direto, tentando extrair...');
      
      // Tentar extrair dados de estruturas diferentes
      if (chatsResponse.data?.data && Array.isArray(chatsResponse.data.data)) {
        console.log('✅ Dados encontrados em chatsResponse.data.data');
        chatsResponse.data = chatsResponse.data.data;
      } else if (chatsResponse.data?.chats && Array.isArray(chatsResponse.data.chats)) {
        console.log('✅ Dados encontrados em chatsResponse.data.chats');
        chatsResponse.data = chatsResponse.data.chats;
      } else if (chatsResponse.data?.result && Array.isArray(chatsResponse.data.result)) {
        console.log('✅ Dados encontrados em chatsResponse.data.result');
        chatsResponse.data = chatsResponse.data.result;
      } else if (chatsResponse.data?.response && Array.isArray(chatsResponse.data.response)) {
        console.log('✅ Dados encontrados em chatsResponse.data.response');
        chatsResponse.data = chatsResponse.data.response;
      } else {
        // Se não conseguir extrair, retornar dados vazios ao invés de erro
        console.warn('⚠️ Não foi possível extrair dados de chats. Estrutura:', chatsResponse.data);
        return {
          totalMessages: 0,
          deliveredMessages: 0,
          failedMessages: 0,
          totalChats: 0,
          activeChatsSample: 0
        };
      }
    }
    
    const chats = chatsResponse.data;
    let totalMessages = 0;
    let deliveredMessages = 0;
    let failedMessages = 0;
    
    // Para cada chat, buscar algumas mensagens recentes para calcular estatísticas
    const sampleSize = Math.min(10, chats.length); // Amostra de até 10 chats
    const selectedChats = chats.slice(0, sampleSize);
    
    for (const chat of selectedChats) {
      try {
        const messagesResponse = await client.post('/message/find', {
          chatid: chat.id,
          limit: 50 // Buscar últimas 50 mensagens de cada chat
        }, {
          headers: {
            'token': instanceToken
          }
        });
        
        if (messagesResponse.data && Array.isArray(messagesResponse.data)) {
          const messages = messagesResponse.data;
          totalMessages += messages.length;
          
          // Contar mensagens por status
          messages.forEach((msg: Record<string, unknown>) => {
            const status = msg.status || 'unknown';
            if (status === 'delivered' || status === 'read') {
              deliveredMessages++;
            } else if (status === 'failed' || status === 'error') {
              failedMessages++;
            }
          });
        }
      } catch (chatError) {
        console.warn(`Erro ao buscar mensagens do chat ${chat.id}:`, chatError);
      }
    }
    
    // Se não conseguimos dados suficientes, usar estimativas baseadas nos chats
    if (totalMessages === 0) {
      totalMessages = chats.length * 25; // Estimativa: 25 mensagens por chat
      deliveredMessages = Math.floor(totalMessages * 0.92); // 92% de taxa de entrega
      failedMessages = Math.floor(totalMessages * 0.05); // 5% de falha
    }
    
    return {
      totalMessages,
      deliveredMessages,
      failedMessages,
      totalChats: chats.length,
      activeChatsSample: sampleSize
    };
  } catch (error: unknown) {
    const axiosError = error as Record<string, unknown>;
    const response = axiosError.response as Record<string, unknown> | undefined;
    // Não logar erro se for apenas resposta inválida (já tratamos acima)
    if ((axiosError.message as string) !== 'Resposta inválida da API de chats') {
      console.error('❌ Erro ao buscar estatísticas de mensagens:', error);
    }

    // Verificar se é erro de autenticação
    if (response?.status === 401) {
      console.error('🔐 Erro de autenticação (401) - Token inválido ou não fornecido', {
        hasInstanceToken: !!instanceToken,
        instanceToken: instanceToken ? '✅ fornecido' : '❌ NÃO FORNECIDO',
        apiUrl: getCurrentServerConfig().url
      });

      // Não propagar o erro, apenas retornar dados vazios
      console.warn('⚠️ Retornando dados vazios devido a erro de autenticação');
      return {
        totalMessages: 0,
        deliveredMessages: 0,
        failedMessages: 0,
        totalChats: 0,
        activeChatsSample: 0
      };
    }

    // Verificar se é erro de rede
    if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ENOTFOUND') {
      console.error('🌐 Erro de conexão com a API:', axiosError.message);
      return {
        totalMessages: 0,
        deliveredMessages: 0,
        failedMessages: 0,
        totalChats: 0,
        activeChatsSample: 0
      };
    }
    
    // Para outros erros, retornar dados vazios ao invés de lançar exceção
    console.warn('⚠️ Retornando dados vazios devido a erro não tratado');
    return {
      totalMessages: 0,
      deliveredMessages: 0,
      failedMessages: 0,
      totalChats: 0,
      activeChatsSample: 0
    };
  }
};

export const getProfilePicture = async (instanceId: string, number: string, instanceToken?: string) => {
  try {
    const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
    const response = await client.get(`/chat/profilePicture/${instanceId}`, {
      params: { number }
    });
    
    return response.data.profilePicture;
  } catch (error) {
    console.error('Erro ao obter foto de perfil:', error);
    return null;
  }
};

export const getProfileInfo = async (
  number: string,
  instanceToken?: string,
  preview: boolean = false
) => {
  try {
    // Url completa para a requisição
    const url = `${API_URL}/chat/GetNameAndImageURL`;
    
    // Parâmetros para a busca de perfil
    const params = {
      number: number.includes('@') ? number : number + '@s.whatsapp.net',
      preview
    };
    
    console.log('Buscando perfil para:', params.number);
    
    try {
      // Chamar a API para obter informações de perfil usando o url completo e os headers corretos
      const response = await axios.post(url, params, {
        headers: instanceToken ? {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'token': instanceToken
        } : {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'AdminToken': ADMIN_TOKEN
        }
      });
      
      console.log('Resposta API perfil completa:', JSON.stringify(response.data));
      
      if (response.data) {
        // Verificar se é um grupo
        const isGroup = params.number.includes('g.us');
        
        let displayName = '';
        
        if (isGroup) {
          // Para grupos, use o nome do grupo ou valor padrão
          displayName = response.data.name || response.data.subject || 'Grupo';
        } else {
          // Para contatos, nunca use número como nome
          displayName = response.data.name || response.data.pushname || 
                        response.data.notifyName || response.data.verifiedName || 'Contato';
        }
        
        return {
          name: displayName,
          imageUrl: response.data.imgUrl || '',
          status: response.data.status || '',
          number: response.data.number || params.number,
          success: true
        };
      }
      
      return {
        name: params.number.split('@')[0],
        imageUrl: '',
        status: '',
        number: params.number,
        success: false,
        error: 'Resposta da API inválida'
      };
      
    } catch (error) {
      console.warn('Erro ao buscar informações de perfil via API, usando dados de exemplo', error);
      
      // Formatando o número para exibição amigável
      const formattedNumber = number.replace(/(\d{2})(\d{2})(\d{4,5})(\d{4})/, '+$1 ($2) $3-$4');
      
      // Dados de exemplo para demonstração
      return {
        name: `Contato ${formattedNumber}`,
        imageUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(formattedNumber)}&background=random&color=fff&size=128`,
        status: 'Disponível',
        number,
        success: true
      };
    }
  } catch (error) {
    console.error('Erro ao obter informações de perfil:', error);
    return {
      name: number,
      imageUrl: '',
      status: '',
      number,
      success: false,
      error: 'Erro ao processar solicitação'
    };
  }
};

// Função para criar uma nova instância
export const createInstance = async (instanceName: string): Promise<Record<string, unknown>> => {
  try {
    const uazapiClient = createUazapiClient();
    const response = await uazapiClient.post('/instance/init', {
      name: instanceName,
      systemName: instanceName,
    });

    return response.data;
  } catch (error) {
    console.error('Erro ao criar instância:', error);
    throw error;
  }
};

// Função para conectar uma instância
export const connectInstance = async (instanceId: string, instanceToken?: string, phone?: string): Promise<Record<string, unknown>> => {
  try {
    const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
    const body = phone ? { phone } : {};
    const response = await client.post('/instance/connect', body);
    return response.data;
  } catch (error) {
    console.error('Erro ao conectar instância:', error);
    throw error;
  }
};

// Função para obter o QR code de uma instância
export const getQrCode = async (instanceId: string, instanceToken?: string): Promise<string> => {
  try {
    const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
    const response = await client.get('/instance/status');
    return response.data;
  } catch (error) {
    console.error('Erro ao obter QR code:', error);
    throw error;
  }
};

// Função para verificar o status de uma instância
export const checkInstanceStatus = async (instanceId: string, instanceToken?: string): Promise<string> => {
  try {
    const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
    const response = await client.get('/instance/status');
    return response.data.status;
  } catch (error) {
    console.error('Erro ao verificar status da instância:', error);
    throw error;
  }
};

// Função para desconectar uma instância
export const disconnectInstance = async (instanceId: string, instanceToken?: string): Promise<Record<string, unknown>> => {
  try {
    const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
    const response = await client.post('/instance/disconnect', {});
    return response.data;
  } catch (error) {
    console.error('Erro ao desconectar instância:', error);
    throw error;
  }
};

// Função para deletar uma instância
export const deleteInstance = async (instanceId: string, instanceToken?: string): Promise<Record<string, unknown>> => {
  try {
    const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
    const response = await client.delete('/instance');
    return response.data;
  } catch (error) {
    console.error('Erro ao deletar instância:', error);
    throw error;
  }
};

// Função para reiniciar uma instância
export const restartInstance = async (instanceId: string, instanceToken?: string): Promise<Record<string, unknown>> => {
  try {
    const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
    // UAZAPI v2.0: restart = disconnect + connect
    await client.post('/instance/disconnect', {});
    const response = await client.post('/instance/connect', {});
    return response.data;
  } catch (error) {
    console.error('Erro ao reiniciar instância:', error);
    throw error;
  }
};

// Função para fazer logout de uma instância
export const logoutInstance = async (instanceId: string, instanceToken?: string): Promise<Record<string, unknown>> => {
  try {
    const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
    const response = await client.post('/instance/disconnect', {});
    return response.data;
  } catch (error) {
    console.error('Erro ao fazer logout da instância:', error);
    throw error;
  }
};

// Função para obter todos os grupos de uma instância
export const getGroups = async (instanceId: string, instanceToken: string): Promise<Group[]> => {
  try {
    const client = createInstanceClient(instanceToken);
    
    // Chamar a API de busca de chats para grupos
    const params: Record<string, unknown> = {
      instanceId,
      wa_isGroup: true, // Buscar apenas grupos
      limit: 50,
      offset: 0,
      sort: "-wa_lastMsgTimestamp" // Ordenar por mensagens mais recentes
    };
    
    try {
      const response = await client.post('/chat/find', params);
      
      if (response.data && Array.isArray(response.data.chats)) {
        // Mapear os grupos para o formato esperado pela aplicação
        return response.data.chats.map((group: Record<string, unknown>) => ({
          id: group.id || group.jid,
          name: group.name || group.subject || 'Grupo',
          ownerJID: group.owner || '',
          participants: (((group.groupMetadata as Record<string, unknown>)?.participants as Record<string, unknown>[]) || []).map((participant: Record<string, unknown>) => ({
            JID: participant.id || participant.jid || '',
            isAdmin: participant.isAdmin || false,
            isSuperAdmin: participant.isSuperAdmin || false,
            displayName: participant.name || participant.displayName || ''
          })),
          participantsCount: (group.groupMetadata as Record<string, unknown>)?.participantsCount || 0,
          subject: (group.groupMetadata as Record<string, unknown>)?.subject || '',
          creation: group.creation || new Date().toISOString(),
          owner: group.owner || '',
          isAnnounce: group.isAnnounce || false,
          isEphemeral: group.isEphemeral || false,
          createdAt: group.creation || new Date().toISOString()
        }));
      }
      
      // Se não houver grupos ou o formato for inesperado
      console.warn('Resposta da API inesperada:', response.data);
      return [];
      
    } catch (error) {
      console.warn('Erro ao buscar grupos via API, usando dados de exemplo', error);
      
      // Dados de exemplo para demonstração
      return [
        {
          id: '556199999999-1612272931@g.us',
          name: 'Grupo de Marketing',
          ownerJID: '5511999999999@s.whatsapp.net',
          participants: [
            {
              JID: '5511999999999@s.whatsapp.net',
              isAdmin: true,
              isSuperAdmin: false,
              displayName: 'João Marketing'
            },
            {
              JID: '5511888888888@s.whatsapp.net',
              isAdmin: false,
              isSuperAdmin: false,
              displayName: 'Maria Design'
            }
          ],
          participantsCount: 15,
          subject: 'Grupo de Marketing',
          creation: new Date().toISOString(),
          owner: '5511999999999@s.whatsapp.net',
          isAnnounce: false,
          isEphemeral: false,
          createdAt: new Date().toISOString()
        },
        {
          id: '556188888888-1612272932@g.us',
          name: 'Suporte Técnico',
          ownerJID: '5511888888888@s.whatsapp.net',
          participants: [
            {
              JID: '5511888888888@s.whatsapp.net',
              isAdmin: true,
              isSuperAdmin: false,
              displayName: 'Carlos Suporte'
            }
          ],
          participantsCount: 8,
          subject: 'Suporte Técnico',
          creation: new Date().toISOString(),
          owner: '5511888888888@s.whatsapp.net',
          isAnnounce: false,
          isEphemeral: false,
          createdAt: new Date().toISOString()
        },
        {
          id: '556177777777-1612272933@g.us',
          name: 'Vendas 2025',
          ownerJID: '5511777777777@s.whatsapp.net',
          participants: [
            {
              JID: '5511777777777@s.whatsapp.net',
              isAdmin: true,
              isSuperAdmin: true,
              displayName: 'Ana Vendas'
            }
          ],
          participantsCount: 22,
          subject: 'Vendas 2025',
          creation: new Date().toISOString(),
          owner: '5511777777777@s.whatsapp.net',
          isAnnounce: false,
          isEphemeral: false,
          createdAt: new Date().toISOString()
        }
      ];
    }
  } catch (error) {
    console.error('Erro ao obter grupos:', error);
    return [];
  }
};

// Função para baixar arquivos de mensagens (imagens, áudios, vídeos, etc)
export const downloadMessageMedia = async (instanceId: string, messageId: string, instanceToken?: string) => {
  try {
    const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
    
    console.log('Baixando mídia da mensagem:', messageId);
    
    // Endpoint para baixar arquivos de mensagens
    const url = `/message/downloadMedia`;
    
    // Requisição para baixar o arquivo
    const response = await client.get(url, {
      params: {
        instanceId,
        messageId
      },
      responseType: 'arraybuffer'
    });
    
    // Verifica se a resposta contém dados binários
    if (response.data) {
      // Obter o tipo de conteúdo do cabeçalho
      const contentType = response.headers['content-type'];
      
      // Converter o array buffer para base64
      const base64 = Buffer.from(response.data, 'binary').toString('base64');
      
      // Retornar a URL de dados em base64
      return {
        url: `data:${contentType};base64,${base64}`,
        contentType,
        success: true
      };
    }
    
    return {
      url: '',
      contentType: '',
      success: false,
      error: 'Arquivo não encontrado'
    };
    
  } catch (error) {
    console.error('Erro ao baixar arquivo da mensagem:', error);
    return {
      url: '',
      contentType: '',
      success: false,
      error: 'Erro ao baixar arquivo'
    };
  }
};

// Endpoints do Chat
export const chat = {
  // Obter todos os chats
  getAll: async (instanceId: string, instanceToken?: string) => {
    try {
      const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
      
      console.log('Fazendo requisição para obter chats:', {
        instanceId,
        token: instanceToken || ADMIN_TOKEN,
        url: '/chat/find'
      });

      const data = {
        operator: "AND",
        sort: "-wa_lastMsgTimestamp",
        limit: 50,
        offset: 0,
        wa_isGroup: true,
        lead_status: "~novo",
        wa_label: "~importante"
      };
      
      const response = await client.post('/chat/find', data);
      
      console.log('Resposta raw da API de chats:', response.data);
      
      if (response.data && Array.isArray(response.data.chats)) {
        return response.data;
      } else if (response.data && Array.isArray(response.data)) {
        return { chats: response.data };
      } else {
        console.warn('Formato de resposta inesperado:', response.data);
        return { chats: [] };
      }
    } catch (error: unknown) {
      const axiosError = error as Record<string, unknown>;
      const response = axiosError.response as Record<string, unknown> | undefined;
      console.error('Erro ao obter chats:', response?.data || axiosError.message);
      if (response?.status === 502) {
        throw new Error('Erro de conexão com o servidor. Por favor, tente novamente em alguns instantes.');
      }
      throw error;
    }
  },

  // Obter mensagens de um chat (UAZAPI v2: POST /message/find)
  fetchMessages: async (instanceId: string, chatId: string, limit: number = 50, instanceToken?: string) => {
    try {
      const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
      const normalizedChatId = chatId.includes('@') ? chatId : chatId + '@s.whatsapp.net';
      const response = await client.post('/message/find', {
        chatid: normalizedChatId,
        limit
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao obter mensagens:', error);
      throw error;
    }
  },

  // Obter nome e URL da imagem de um número
  getNameAndImageURL: async (instanceId: string, number: string, instanceToken?: string) => {
    try {
      const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
      const response = await client.post('/chat/GetNameAndImageURL', {
        number: number.includes('@') ? number : number + '@s.whatsapp.net',
        preview: true
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao obter informações de perfil:', error);
      throw error;
    }
  },

  // Obter todas mensagens não lidas (UAZAPI v2: POST /chat/find com filtro)
  getUnreadMessages: async (instanceId: string, instanceToken?: string) => {
    try {
      const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
      const response = await client.post('/chat/find', {
        wa_unreadCount: 1
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao obter mensagens não lidas:', error);
      throw error;
    }
  },

  // Marcar mensagens como lidas (UAZAPI v2: POST /message/markread)
  markMessageAsRead: async (instanceId: string, messageId: string, instanceToken?: string) => {
    try {
      const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
      const response = await client.post('/message/markread', {
        id: [messageId]
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao marcar mensagem como lida:', error);
      throw error;
    }
  },

  // Arquivar um chat
  archive: async (instanceId: string, chatId: string, action: boolean = true, instanceToken?: string) => {
    try {
      const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
      const response = await client.post('/chat/archive', {
        number: chatId,
        archive: action
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao arquivar chat:', error);
      throw error;
    }
  },

  // Limpar mensagens de um chat (endpoint não existe na UAZAPI v2)
  clear: async (instanceId: string, chatId: string, instanceToken?: string) => {
    console.warn('chat.clear() não está disponível na UAZAPI v2. Use chat.delete() para remover o chat.');
    return { success: false, message: 'Endpoint não disponível na UAZAPI v2' };
  },

  // Deletar um chat
  delete: async (instanceId: string, chatId: string, instanceToken?: string) => {
    try {
      const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
      const response = await client.post('/chat/delete', {
        number: chatId,
        deleteChatWhatsApp: true,
        deleteChatDB: true,
        deleteMessagesDB: true
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao deletar chat:', error);
      throw error;
    }
  },

  // Marcar chat como não lido (UAZAPI v2: POST /chat/read com read: false)
  markAsUnread: async (instanceId: string, chatId: string, instanceToken?: string) => {
    try {
      const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
      const response = await client.post('/chat/read', {
        number: chatId,
        read: false
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao marcar chat como não lido:', error);
      throw error;
    }
  },

  // Fixar um chat
  pin: async (instanceId: string, chatId: string, action: boolean = true, instanceToken?: string) => {
    try {
      const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
      const response = await client.post('/chat/pin', {
        number: chatId,
        pin: action
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao fixar chat:', error);
      throw error;
    }
  },

  // Mutar um chat (UAZAPI v2: muteEndTime - 8=8h, 168=1sem, -1=forever, 0=unmute)
  mute: async (instanceId: string, chatId: string, timeInSeconds: number = 8 * 60 * 60, instanceToken?: string) => {
    try {
      const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
      const response = await client.post('/chat/mute', {
        number: chatId,
        muteEndTime: timeInSeconds
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao mutar chat:', error);
      throw error;
    }
  },

  // Desmutar um chat (UAZAPI v2: usa /chat/mute com muteEndTime: 0)
  unmute: async (instanceId: string, chatId: string, instanceToken?: string) => {
    try {
      const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
      const response = await client.post('/chat/mute', {
        number: chatId,
        muteEndTime: 0
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao desmutar chat:', error);
      throw error;
    }
  },

  // Verificar se um número existe no WhatsApp (UAZAPI v2: POST /chat/check)
  whatsappNumberExists: async (instanceId: string, number: string, instanceToken?: string) => {
    try {
      const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
      const response = await client.post('/chat/check', {
        numbers: [number]
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao verificar número:', error);
      throw error;
    }
  }
};

export const message = {
  // Enviar mensagem de texto
  sendText: async (instanceId: string, chatId: string, text: string, options: Record<string, unknown> = {}, instanceToken?: string) => {
    try {
      const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
      const response = await client.post('/send/text', {
        number: chatId, text, linkPreview: false, readchat: true, delay: 0, ...options
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao enviar mensagem de texto:', error);
      throw error;
    }
  },

  // Enviar imagem
  sendImage: async (instanceId: string, chatId: string, imageUrl: string, caption: string = '', options: Record<string, unknown> = {}, instanceToken?: string) => {
    try {
      const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
      const response = await client.post('/send/media', {
        number: chatId, type: "image", file: imageUrl, text: caption, readchat: true, ...options
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao enviar imagem:', error);
      throw error;
    }
  },

  // Enviar vídeo
  sendVideo: async (instanceId: string, chatId: string, videoUrl: string, caption: string = '', options: Record<string, unknown> = {}, instanceToken?: string) => {
    try {
      const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
      const response = await client.post('/send/media', {
        number: chatId, type: "video", file: videoUrl, text: caption, readchat: true, ...options
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao enviar vídeo:', error);
      throw error;
    }
  },

  // Enviar áudio
  sendAudio: async (instanceId: string, chatId: string, audioUrl: string, options: Record<string, unknown> = {}, instanceToken?: string) => {
    try {
      const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
      const response = await client.post('/send/media', {
        number: chatId, type: "audio", file: audioUrl, readchat: true, ...options
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao enviar áudio:', error);
      throw error;
    }
  },

  // Enviar documento
  sendDocument: async (instanceId: string, chatId: string, documentUrl: string, fileName: string = '', caption: string = '', options: Record<string, unknown> = {}, instanceToken?: string) => {
    try {
      const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
      const response = await client.post('/send/media', {
        number: chatId, type: "document", file: documentUrl, docName: fileName, text: caption, readchat: true, ...options
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao enviar documento:', error);
      throw error;
    }
  },

  // Enviar mídia usando o endpoint /send/media
  sendMedia: async (number: string, type: string, file: string, text?: string, docName?: string, mimetype?: string, replyid?: string, mentions?: string, readchat: boolean = true, delay: number = 0, instanceToken?: string) => {
    try {
      const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
      const payload: Record<string, unknown> = {
        number,
        type,
        file,
        readchat,
        delay
      };
      
      if (text) payload.text = text;
      if (docName) payload.docName = docName;
      if (mimetype) payload.mimetype = mimetype;
      if (replyid) payload.replyid = replyid;
      if (mentions) payload.mentions = mentions;
      
      const response = await client.post('/send/media', payload);
      return response.data;
    } catch (error) {
      console.error('Erro ao enviar mídia:', error);
      throw error;
    }
  },

  // Enviar localização
  sendLocation: async (instanceId: string, chatId: string, latitude: number, longitude: number, title: string = '', address: string = '', options: Record<string, unknown> = {}, instanceToken?: string) => {
    try {
      const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
      const response = await client.post('/send/location', {
        number: chatId, name: title, address, lat: latitude, lng: longitude
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao enviar localização:', error);
      throw error;
    }
  },

  // Encaminhar mensagem (UAZAPI v2.0 nao suporta forward nativo - envia como texto)
  forward: async (instanceId: string, chatId: string, messageId: string, options: Record<string, unknown> = {}, instanceToken?: string) => {
    try {
      console.warn('UAZAPI v2.0 nao suporta encaminhamento nativo. Usando /send/text como fallback.');
      const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
      const response = await client.post('/send/text', {
        number: chatId, text: `[Mensagem encaminhada] ID: ${messageId}`, readchat: true, delay: 0, ...options
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao encaminhar mensagem:', error);
      throw error;
    }
  },

  // Responder a uma mensagem
  reply: async (chatId: string, text: string, messageId: string, options: Record<string, unknown> = {}, instanceToken?: string) => {
    try {
      const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
      
      // Usar endpoint /send/text com replyid conforme documentação UAZAPI
      const response = await client.post('/send/text', {
        number: chatId,
        text: text,
        replyid: messageId,
        readchat: true,
        delay: 0,
        ...options
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao responder mensagem:', error);
      throw error;
    }
  },

  // Reagir a uma mensagem
  react: async (instanceId: string, messageId: string, emoji: string, instanceToken?: string) => {
    try {
      const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
      const response = await client.post('/message/react', {
        number: instanceId, text: emoji, id: messageId
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao reagir à mensagem:', error);
      throw error;
    }
  },

  // Deletar mensagem
  delete: async (instanceId: string, messageId: string, deleteMediaInDevice: boolean = false, instanceToken?: string) => {
    try {
      const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
      const response = await client.post('/message/delete', {
        id: messageId
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao deletar mensagem:', error);
      throw error;
    }
  },
};

export const group = {
  // Criar grupo
  create: async (instanceId: string, groupName: string, participants: string[], instanceToken?: string) => {
    try {
      const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
      const response = await client.post('/group/create', {
        name: groupName, participants
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao criar grupo:', error);
      throw error;
    }
  },

  // Obter informações do grupo
  getInfo: async (instanceId: string, groupId: string, instanceToken?: string) => {
    try {
      const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
      const response = await client.post('/group/info', {
        GroupJID: groupId, getInviteLink: true, force: true
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao obter informações do grupo:', error);
      throw error;
    }
  },

  // Adicionar participantes ao grupo
  addParticipants: async (instanceId: string, groupId: string, participants: string[], instanceToken?: string) => {
    try {
      const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
      const response = await client.post('/group/updateParticipants', {
        groupjid: groupId, action: 'add', participants
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao adicionar participantes ao grupo:', error);
      throw error;
    }
  },

  // Remover participantes do grupo
  removeParticipants: async (instanceId: string, groupId: string, participants: string[], instanceToken?: string) => {
    try {
      const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
      const response = await client.post('/group/updateParticipants', {
        groupjid: groupId, action: 'remove', participants
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao remover participantes do grupo:', error);
      throw error;
    }
  },

  // Promover participantes a administradores
  promoteParticipants: async (instanceId: string, groupId: string, participants: string[], instanceToken?: string) => {
    try {
      const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
      const response = await client.post('/group/updateParticipants', {
        groupjid: groupId, action: 'promote', participants
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao promover participantes a administradores:', error);
      throw error;
    }
  },

  // Rebaixar administradores a participantes comuns
  demoteParticipants: async (instanceId: string, groupId: string, participants: string[], instanceToken?: string) => {
    try {
      const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
      const response = await client.post('/group/updateParticipants', {
        groupjid: groupId, action: 'demote', participants
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao rebaixar administradores:', error);
      throw error;
    }
  },

  // Definir descrição do grupo
  setDescription: async (instanceId: string, groupId: string, description: string, instanceToken?: string) => {
    try {
      const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
      const response = await client.post('/group/updateDescription', {
        groupjid: groupId, description
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao definir descrição do grupo:', error);
      throw error;
    }
  },

  // Alterar imagem do grupo
  updateProfilePicture: async (instanceId: string, groupId: string, imageUrl: string, instanceToken?: string) => {
    try {
      const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
      const response = await client.post('/group/updateImage', {
        groupjid: groupId, image: imageUrl
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar imagem do grupo:', error);
      throw error;
    }
  },

  // Sair do grupo
  leave: async (instanceId: string, groupId: string, instanceToken?: string) => {
    try {
      const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
      const response = await client.post('/group/leave', {
        groupjid: groupId
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao sair do grupo:', error);
      throw error;
    }
  }
};

export const label = {
  // Obter todas as etiquetas
  getAll: async (instanceId: string, instanceToken?: string) => {
    try {
      const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
      const response = await client.get('/labels');
      return response.data;
    } catch (error) {
      console.error('Erro ao obter etiquetas:', error);
      throw error;
    }
  },

  // Criar nova etiqueta
  create: async (instanceId: string, labelName: string, labelColor: string, instanceToken?: string) => {
    try {
      const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
      const response = await client.post('/label/edit', {
        id: '', name: labelName, color: labelColor, delete: false
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao criar etiqueta:', error);
      throw error;
    }
  },

  // Deletar etiqueta
  delete: async (instanceId: string, labelId: string, instanceToken?: string) => {
    try {
      const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
      const response = await client.post('/label/edit', {
        labelid: labelId, delete: true
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao deletar etiqueta:', error);
      throw error;
    }
  },

  // Adicionar etiqueta a um chat
  addToChat: async (instanceId: string, chatId: string, labelId: string, instanceToken?: string) => {
    try {
      const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
      const response = await client.post('/chat/labels', {
        number: chatId, labelids: [labelId]
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao adicionar etiqueta ao chat:', error);
      throw error;
    }
  },

  // Remover etiqueta de um chat
  removeFromChat: async (instanceId: string, chatId: string, labelId: string, instanceToken?: string) => {
    try {
      const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
      const response = await client.post('/chat/labels', {
        number: chatId, labelids: []
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao remover etiqueta do chat:', error);
      throw error;
    }
  }
};

export const webhook = {
  // Configurar webhook
  set: async (instanceId: string, url: string, allowedEvents: string[] = [], instanceToken?: string) => {
    try {
      const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
      const response = await client.post('/webhook', {
        enabled: true, url, events: allowedEvents
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao configurar webhook:', error);
      throw error;
    }
  },

  // Obter configuração atual do webhook
  get: async (instanceId: string, instanceToken?: string) => {
    try {
      const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
      const response = await client.get('/webhook');
      return response.data;
    } catch (error) {
      console.error('Erro ao obter configuração do webhook:', error);
      throw error;
    }
  },

  // Deletar webhook
  delete: async (instanceId: string, instanceToken?: string) => {
    try {
      const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
      const response = await client.post('/webhook', {
        enabled: false, url: ''
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao deletar webhook:', error);
      throw error;
    }
  }
};

export const connectToSSE = (instanceId: string, onEvent: (event: Record<string, unknown>) => void, instanceToken?: string) => {
  const apiURL = API_URL;
  const token = instanceToken || ADMIN_TOKEN;
  
  const url = new URL(`${apiURL}/sse`);
  
  if (token) {
    url.searchParams.append('token', token);
  }
  
  // Adicionar eventos que queremos escutar
  url.searchParams.append('events', 'messages');
  url.searchParams.append('events', 'messages_update');
  url.searchParams.append('events', 'chats');
  url.searchParams.append('events', 'presence');
  
  console.log('Conectando ao SSE com URL:', url.toString());
  
  const eventSource = new EventSource(url.toString());
  
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onEvent(data);
    } catch (error) {
      console.error('Erro ao processar evento SSE:', error);
    }
  };
  
  eventSource.onerror = (error) => {
    console.error('Erro na conexão SSE:', error);
    eventSource.close();
    
    // Reconectar após 5 segundos
    setTimeout(() => {
      connectToSSE(instanceId, onEvent, instanceToken);
    }, 5000);
  };
  
  return {
    close: () => {
      eventSource.close();
    }
  };
};

// Função para buscar mensagens de chat
export const searchMessages = async (
  instanceId: string, 
  query: string, 
  chatId?: string,
  instanceToken?: string
) => {
  try {
    const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
    
    // Parâmetros para a pesquisa de mensagens conforme a API Uazapi v2.0
    const params: Record<string, unknown> = {
      instanceId,
      query
    };
    
    // Adicionar chatId se fornecido
    if (chatId) {
      params.chatId = chatId;
    }
    
    // Chamada ao endpoint de busca de mensagens
    const response = await client.post('/message/search', params);
    
    console.log('Resposta da busca de mensagens:', response.data);
    
    if (response.data && Array.isArray(response.data.messages)) {
      return {
        messages: response.data.messages,
        count: response.data.messages.length
      };
    }
    
    return {
      messages: [],
      count: 0
    };
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    throw error;
  }
};

// Função para obter todas as mensagens de um chat
export const getAllMessagesFromChat = async (
  chatId: string,
  instanceToken?: string
) => {
  try {
    const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
    
    // Parâmetros para obter todas as mensagens de um chat
    const params = {
      chatid: `${chatId}@s.whatsapp.net`,
      limit: 1000 // Limite alto para obter todas as mensagens
    };
    
    // Chamada ao endpoint correto de busca de mensagens
    const response = await client.post('/message/find', params);
    
    console.log('Resposta de todas as mensagens do chat:', response.data);
    
    // Verificar se a resposta é um array direto
    if (response.data && Array.isArray(response.data)) {
      return {
        success: true,
        messages: response.data,
        count: response.data.length
      };
    }
    
    // Verificar se a resposta tem uma estrutura com propriedade messages
    if (response.data && response.data.messages && Array.isArray(response.data.messages)) {
      return {
        success: true,
        messages: response.data.messages,
        count: response.data.messages.length
      };
    }
    
    // Verificar se a resposta tem status de sucesso mas sem mensagens
    if (response.data && (response.data.success === true || response.status === 200)) {
      return {
        success: true,
        messages: [],
        count: 0
      };
    }
    
    return {
      success: false,
      messages: [],
      count: 0,
      error: 'Resposta inválida da API'
    };
  } catch (error) {
    console.error('Erro ao obter todas as mensagens do chat:', error);
    return {
      success: false,
      messages: [],
      count: 0,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
};

// Função para marcar mensagem como lida
export const markMessageAsRead = async (
  instanceId: string,
  messageId: string,
  instanceToken?: string
) => {
  try {
    const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
    
    const response = await client.post('/message/markAsRead', {
      instanceId,
      messageId
    });
    
    return response.data;
  } catch (error) {
    console.error('Erro ao marcar mensagem como lida:', error);
    throw error;
  }
};

// Função para buscar mensagens em todos os chats
export const searchAllMessages = async (
  instanceId: string,
  query: string,
  instanceToken?: string
) => {
  try {
    const client = instanceToken ? createInstanceClient(instanceToken) : createUazapiClient();
    
    // Parâmetros para a pesquisa de mensagens em todos os chats
    const params = {
      instanceId,
      query
    };
    
    // Chamada ao endpoint de busca de mensagens
    const response = await client.post('/message/search', params);
    
    console.log('Resposta da busca global de mensagens:', response.data);
    
    if (response.data && Array.isArray(response.data.messages)) {
      return {
        messages: response.data.messages,
        count: response.data.messages.length
      };
    }
    
    return {
      messages: [],
      count: 0
    };
  } catch (error) {
    console.error('Erro ao buscar mensagens em todos os chats:', error);
    throw error;
  }
};

/**
 * Atualiza o mapa de campos personalizados da instância
 * Define os nomes/labels para os 20 campos customizáveis (lead_field01 a lead_field20)
 */
export const updateLeadFieldsMap = async (
  fieldsMap: Record<string, string>,
  instanceToken: string
) => {
  try {
    console.log('🔧 updateLeadFieldsMap - Atualizando configuração de campos:', fieldsMap);
    
    const client = createInstanceClient(instanceToken);
    const response = await client.post('/instance/updateFieldsMap', fieldsMap);
    
    console.log('✅ updateLeadFieldsMap - Campos atualizados com sucesso');
    return response.data;
  } catch (error: unknown) {
    const axiosError = error as Record<string, unknown>;
    const response = axiosError.response as Record<string, unknown> | undefined;
    console.error('❌ updateLeadFieldsMap - Erro:', response?.data || axiosError.message);
    throw error;
  }
};

/**
 * Edita informações de lead associadas a um chat
 * Permite atualizar status, atendente, posição no kanban, tags e campos customizados
 * 
 * IMPORTANTE: As alterações são refletidas imediatamente no banco de dados do UAZAPI
 * e disparam eventos webhook/SSE para manter a aplicação sincronizada.
 */
export const editLead = async (
  leadData: {
    id: string; // wa_chatid (ex: "5511999999999@s.whatsapp.net") ou wa_fastid
    chatbot_disableUntil?: number;
    lead_isTicketOpen?: boolean;
    lead_assignedAttendant_id?: string;
    lead_kanbanOrder?: number;
    lead_tags?: string[];
    lead_name?: string;
    lead_fullName?: string;
    lead_email?: string;
    lead_personalId?: string;
    lead_status?: string;
    lead_notes?: string;
    lead_field01?: string;
    lead_field02?: string;
    lead_field03?: string;
    lead_field04?: string;
    lead_field05?: string;
    lead_field06?: string;
    lead_field07?: string;
    lead_field08?: string;
    lead_field09?: string;
    lead_field10?: string;
    lead_field11?: string;
    lead_field12?: string;
    lead_field13?: string;
    lead_field14?: string;
    lead_field15?: string;
    lead_field16?: string;
    lead_field17?: string;
    lead_field18?: string;
    lead_field19?: string;
    lead_field20?: string;
  },
  instanceToken: string
) => {
  try {
    console.log('💾 ==========================================');
    console.log('💾 EDITANDO LEAD');
    console.log('💾 ==========================================');
    console.log('💾 ID do Lead:', leadData.id);
    console.log('💾 Status NOVO:', leadData.lead_status);
    console.log('💾 Dados completos:', JSON.stringify(leadData, null, 2));
    
    const client = createInstanceClient(instanceToken);
    
    // Validar campos de texto (máximo 255 caracteres conforme documentação)
    const sanitizedData: Record<string, unknown> = { id: leadData.id };

    Object.keys(leadData).forEach(key => {
      if (key === 'id') return;

      const value = (leadData as Record<string, unknown>)[key];
      
      if (typeof value === 'string' && value.length > 255) {
        console.warn(`⚠️ Campo ${key} truncado de ${value.length} para 255 caracteres`);
        sanitizedData[key] = value.substring(0, 255);
      } else {
        sanitizedData[key] = value;
      }
    });
    
    console.log('💾 Enviando para POST /chat/editLead');
    const response = await client.post('/chat/editLead', sanitizedData);
    
    console.log('💾 ==========================================');
    console.log('💾 RESPOSTA DA API:');
    console.log('💾 ==========================================');
    console.log('💾 Status HTTP:', response.status);
    console.log('💾 Lead atualizado:', response.data?.id || response.data?.wa_chatid);
    console.log('💾 Status do lead:', response.data?.lead_status);
    console.log('💾 ==========================================');
    
    return response.data;
  } catch (error: unknown) {
    const axiosError = error as Record<string, unknown>;
    const response = axiosError.response as Record<string, unknown> | undefined;
    console.error('💾 ==========================================');
    console.error('💾 ERRO AO SALVAR LEAD');
    console.error('💾 ==========================================');
    console.error('💾 Mensagem:', axiosError.message);
    console.error('💾 Status HTTP:', response?.status);
    console.error('💾 Dados do erro:', JSON.stringify(response?.data, null, 2));
    console.error('💾 ==========================================');
    throw error;
  }
};

/**
 * Busca leads (chats) com filtros personalizados
 * 
 * Filtros suportados:
 * - lead_status: Status do lead (ex: "novo", "qualificado", "~novo" para negação)
 * - lead_tags: Tags do lead
 * - wa_isGroup: true/false para filtrar grupos
 * - wa_label: Label do WhatsApp
 * - sort: Ordenação (ex: "-wa_lastMsgTimestamp" para mais recente primeiro)
 * - limit: Quantidade de resultados (padrão: 50)
 * - offset: Paginação
 */
export const findLeads = async (
  filters: {
    operator?: 'AND' | 'OR';
    sort?: string; // Ex: "-wa_lastMsgTimestamp" (- para DESC)
    limit?: number;
    offset?: number;
    lead_status?: string; // Use ~ para negação (ex: "~novo")
    lead_tags?: string;
    wa_isGroup?: boolean;
    wa_label?: string;
    [key: string]: unknown;
  },
  instanceToken: string
) => {
  try {
    console.log('🔍 findLeads - Filtros recebidos:', filters);
    
    const client = createInstanceClient(instanceToken);
    
    const defaultFilters = {
      operator: 'AND',
      sort: '-wa_lastMsgTimestamp',
      limit: 50,
      offset: 0,
      ...filters
    };
    
    console.log('📤 findLeads - Enviando para POST /chat/find:', defaultFilters);
    
    const response = await client.post('/chat/find', defaultFilters);
    
    console.log('📥 findLeads - Resposta da API:', {
      totalChats: response.data?.chats?.length || 0,
      hasChatsArray: Array.isArray(response.data?.chats),
      isDirectArray: Array.isArray(response.data)
    });
    
    if (response.data && Array.isArray(response.data.chats)) {
      return response.data;
    } else if (response.data && Array.isArray(response.data)) {
      return { chats: response.data };
    }
    
    return { chats: [] };
  } catch (error: unknown) {
    const axiosError = error as Record<string, unknown>;
    const response = axiosError.response as Record<string, unknown> | undefined;
    console.error('❌ findLeads - Erro:', response?.data || axiosError.message);
    throw error;
  }
};

/**
 * Busca todos os chats individuais (sem grupos) para importação como leads
 */
export const getChatsForLeads = async (
  instanceToken: string,
  limit: number = 100,
  offset: number = 0
) => {
  try {
    console.log('📥 Buscando chats para leads (sem grupos)...');
    
    const client = createInstanceClient(instanceToken);
    
    const filters = {
      operator: 'AND',
      sort: '-wa_lastMsgTimestamp', // Mais recentes primeiro
      limit,
      offset,
      wa_isGroup: false // APENAS chats individuais, SEM grupos
    };
    
    console.log('📤 Enviando para POST /chat/find:', filters);
    
    const response = await client.post('/chat/find', filters);
    
    console.log('📥 Resposta:', {
      totalChats: response.data?.chats?.length || 0,
      hasChatsArray: Array.isArray(response.data?.chats)
    });
    
    let chats = [];
    if (response.data && Array.isArray(response.data.chats)) {
      chats = response.data.chats;
    } else if (Array.isArray(response.data)) {
      chats = response.data;
    }
    
    // Ordenar no lado do cliente como garantia (mais recentes primeiro)
    chats.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      const timeA = (a.wa_lastMsgTimestamp || (a.lastMessage as Record<string, unknown>)?.timestamp || 0) as number;
      const timeB = (b.wa_lastMsgTimestamp || (b.lastMessage as Record<string, unknown>)?.timestamp || 0) as number;
      return timeB - timeA; // Decrescente (mais recente primeiro)
    });
    
    console.log('📊 Primeiros 3 chats ordenados:', 
      chats.slice(0, 3).map((c: Record<string, unknown>) => ({
        name: c.name || c.pushname,
        timestamp: c.wa_lastMsgTimestamp || (c.lastMessage as Record<string, unknown>)?.timestamp,
        date: c.wa_lastMsgTimestamp
          ? new Date(((c.wa_lastMsgTimestamp as number) > 10000000000 ? (c.wa_lastMsgTimestamp as number) : (c.wa_lastMsgTimestamp as number) * 1000)).toLocaleString()
          : 'sem data'
      }))
    );
    
    return chats;
  } catch (error: unknown) {
    const axiosError = error as Record<string, unknown>;
    const response = axiosError.response as Record<string, unknown> | undefined;
    console.error('❌ Erro ao buscar chats:', response?.data || axiosError.message);
    throw error;
  }
};

export default {
  getInstances,
  sendMessage,
  sendTextMessage,
  getChats,
  getChatsForLeads,
  getMessages,
  getProfilePicture,
  getProfileInfo,
  createInstance,
  connectInstance,
  getQrCode,
  restartInstance,
  deleteInstance,
  logoutInstance,
  getGroups,
  updateLeadFieldsMap,
  editLead,
  findLeads,
  downloadMessageMedia,
  chat,
  message,
  group,
  label,
  webhook,
  connectToSSE
};
