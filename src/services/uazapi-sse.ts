/**
 * Serviço de SSE (Server-Sent Events) para UAZAPI
 * Captura eventos em tempo real do WhatsApp para auto-criar leads
 */

import { syncLeadFromWhatsApp } from './supabase-leads';

interface SSEConfig {
  apiUrl: string;
  token: string;
  instanceId: string;
  userId: string;
  events?: string[];
}

interface WhatsAppMessage {
  // Campos padrão UAZAPI
  from?: string;      // chat_id (ex: "5511999999999@s.whatsapp.net")
  chatId?: string;    // Alternativa para from
  id?: string;        // ID da mensagem
  text?: string;      // Texto da mensagem
  body?: string;      // Alternativa para text
  timestamp?: number; // Unix timestamp
  type?: string;      // Tipo: text, image, audio, etc
  pushName?: string;  // Nome do contato no WhatsApp
  isGroup?: boolean;  // Se é grupo
  author?: string;    // Autor em grupos
  
  // Campos adicionais possíveis
  key?: {
    remoteJid?: string; // Outro formato de chat_id
    fromMe?: boolean;
    id?: string;
  };
  message?: Record<string, unknown>;
  messageTimestamp?: number;
}

export class UazapiSSEService {
  private eventSource: EventSource | null = null;
  private config: SSEConfig;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 3000; // 3 segundos
  private isManualClose = false;

  constructor(config: SSEConfig) {
    this.config = {
      ...config,
      events: config.events || ['messages', 'chats', 'contacts']
    };
  }

  /**
   * Inicia conexão SSE com UAZAPI
   */
  start(): void {
    if (this.eventSource) {
      console.warn('⚠️ SSE já está conectado');
      return;
    }

    this.isManualClose = false;
    this.connect();
  }

  /**
   * Para conexão SSE
   */
  stop(): void {
    this.isManualClose = true;
    if (this.eventSource) {
      console.log('🛑 Fechando conexão SSE...');
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  /**
   * Conecta ao endpoint SSE
   */
  private connect(): void {
    const { apiUrl, token, instanceId, events } = this.config;
    const eventsParam = events?.join(',') || 'messages,chats,contacts';
    
    // UAZAPI SSE: apenas token e events (instance_id pode não ser suportado)
    const url = `${apiUrl}/sse?token=${token}&events=${eventsParam}`;

    console.log('🔌 Conectando SSE:', { 
      url: `${apiUrl}/sse`,
      instanceId, 
      events: eventsParam,
      token: token.substring(0, 10) + '...'
    });

    try {
      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        console.log('✅ SSE conectado com sucesso');
        this.reconnectAttempts = 0;
      };

      this.eventSource.onmessage = (event) => {
        this.handleMessage(event);
      };

      this.eventSource.onerror = (error) => {
        console.error('❌ Erro SSE:', error);
        this.handleError();
      };

      // Nota: onmessage já processa TODOS os eventos SSE
      // Os listeners abaixo são apenas se a API enviar eventos nomeados (event.type !== 'message')
      // Para UAZAPI, todos vêm como 'message' com {type: '...', data: {...}} no body

    } catch (error) {
      console.error('❌ Erro ao criar EventSource:', error);
      this.handleError();
    }
  }

  /**
   * Handler genérico de mensagens
   */
  private handleMessage(event: MessageEvent): void {
    try {
      console.log('📨 RAW SSE Data:', event.data);
      
      const parsed = JSON.parse(event.data);
      
      // Verificar se é formato estruturado {type, data} ou formato direto
      if (parsed.type && parsed.data) {
        // Formato estruturado: {type: "message", data: {...}}
        console.log('📨 Evento SSE estruturado:', parsed.type);
        
        switch (parsed.type) {
          case 'message':
          case 'messages':
            this.processWhatsAppMessage(parsed.data);
            break;
          
          case 'chat':
          case 'chats':
            this.processChatUpdate(parsed.data);
            break;
          
          case 'contact':
          case 'contacts':
            this.processContactUpdate(parsed.data);
            break;
          
          case 'connection':
            console.log('🔌 Evento de conexão:', parsed.message || parsed.data);
            break;
          
          default:
            console.log('ℹ️ Evento não tratado:', parsed.type);
        }
      } else if (parsed.type === 'connection') {
        // Evento de conexão simples
        console.log('🔌 Conexão SSE:', parsed.message || 'estabelecida');
      } else if (parsed.from || parsed.chatId || parsed.key?.remoteJid) {
        // Formato direto de MENSAGEM: deve ter from/chatId/remoteJid
        console.log('📨 Evento SSE direto (assumindo message)');
        this.processWhatsAppMessage(parsed);
      } else {
        // Outros eventos (status, bateria, etc) - ignorar silenciosamente
        console.log('ℹ️ Evento SSE ignorado (não é mensagem):', parsed.type || Object.keys(parsed).join(', '));
      }
    } catch (error) {
      console.error('❌ Erro ao processar evento SSE:', error, 'Data:', event.data);
    }
  }

  /**
   * Processa mensagem do WhatsApp e cria/atualiza lead
   */
  private async processWhatsAppMessage(message: WhatsAppMessage): Promise<void> {
    try {
      console.log('💬 Evento SSE recebido:', JSON.stringify(message, null, 2));

      // Extrair chat_id de múltiplas fontes possíveis
      const chatId = message.from 
        || message.chatId 
        || message.key?.remoteJid 
        || null;

      // Validar se temos o chat_id (obrigatório)
      if (!chatId || typeof chatId !== 'string') {
        console.error('❌ Mensagem sem chat_id válido. Campos disponíveis:', Object.keys(message));
        console.error('📋 Conteúdo completo:', message);
        return;
      }

      // Extrair texto da mensagem
      const messageText = message.text || message.body || '';
      
      // Extrair timestamp e normalizar
      const rawTimestamp = message.timestamp || message.messageTimestamp || Date.now() / 1000;
      
      // Detectar se timestamp está em segundos ou milissegundos
      // Timestamps em segundos: < 10000000000 (antes de 20/11/2286)
      // Timestamps em milissegundos: > 10000000000
      const timestampInMs = rawTimestamp > 10000000000 ? rawTimestamp : rawTimestamp * 1000;
      
      // Validar se a data é razoável (entre 2000 e 2100)
      const messageDate = new Date(timestampInMs);
      const year = messageDate.getFullYear();
      
      let validTimestamp: string;
      if (year >= 2000 && year <= 2100) {
        validTimestamp = messageDate.toISOString();
      } else {
        console.warn('⚠️ Timestamp SSE inválido, usando data atual:', { rawTimestamp, date: messageDate.toISOString() });
        validTimestamp = new Date().toISOString();
      }

      console.log('💬 Processando mensagem para lead:', {
        chatId,
        hasText: !!messageText,
        pushName: message.pushName,
        timestamp: validTimestamp
      });

      const { userId, instanceId } = this.config;

      // Extrair número de telefone do chat_id
      const phone = chatId.split('@')[0];

      // Criar/atualizar lead no Supabase
      const leadData = {
        chat_id: chatId,
        phone: phone,
        wa_name: message.pushName || phone,
        is_group: message.isGroup || false,
        last_message_at: validTimestamp,
        last_message_text: messageText,
        last_message_type: message.type || 'text',
        // Não sobrescrever dados de negócio se já existirem
        lead_status: undefined, // syncLeadFromWhatsApp vai manter status existente
        lead_name: undefined,
        unread_count: 1 // Incrementar após
      };

      // Usar syncLeadFromWhatsApp para não sobrescrever dados de negócio
      await syncLeadFromWhatsApp(userId, instanceId, leadData);

      console.log('✅ Lead criado/atualizado com sucesso:', phone);

      // Emitir evento customizado para atualizar UI
      window.dispatchEvent(new CustomEvent('lead-updated', {
        detail: { chatId, phone }
      }));

    } catch (error) {
      console.error('❌ Erro ao processar mensagem como lead:', error);
    }
  }

  /**
   * Processa atualização de chat (chamado via handleMessage)
   */
  private async processChatUpdate(chat: Record<string, unknown>): Promise<void> {
    console.log('💬 Chat atualizado:', chat);
    // Implementar se necessário (ex: atualizar unread_count)
  }

  /**
   * Processa atualização de contato (chamado via handleMessage)
   */
  private async processContactUpdate(contact: Record<string, unknown>): Promise<void> {
    console.log('👤 Contato atualizado:', contact);
    // Implementar se necessário (ex: atualizar wa_contact_name, profile_picture_url)
  }

  /**
   * Handler de erros com auto-reconexão
   */
  private handleError(): void {
    if (this.isManualClose) {
      console.log('ℹ️ Conexão fechada manualmente, não reconectar');
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Máximo de tentativas de reconexão atingido');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Tentando reconectar em ${this.reconnectDelay}ms (tentativa ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);
  }

  /**
   * Verifica se está conectado
   */
  isConnected(): boolean {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN;
  }

  /**
   * Obtém estado da conexão
   */
  getReadyState(): number | null {
    return this.eventSource?.readyState ?? null;
  }
}

// Singleton global (opcional)
let globalSSEService: UazapiSSEService | null = null;

/**
 * Inicializa serviço SSE global
 */
export function initializeSSE(config: SSEConfig): UazapiSSEService {
  if (globalSSEService) {
    globalSSEService.stop();
  }
  
  globalSSEService = new UazapiSSEService(config);
  globalSSEService.start();
  
  return globalSSEService;
}

/**
 * Obtém instância global do serviço SSE
 */
export function getSSEService(): UazapiSSEService | null {
  return globalSSEService;
}

/**
 * Para serviço SSE global
 */
export function stopSSE(): void {
  if (globalSSEService) {
    globalSSEService.stop();
    globalSSEService = null;
  }
}
