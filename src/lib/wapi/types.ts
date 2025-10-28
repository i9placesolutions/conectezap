// Este é um arquivo de exemplo para tipos relacionados à API do WhatsApp

export interface SendMessageRequest {
  phoneNumber: string;
  text: string;
  quoted?: {
    messageId: string;
    participant: string;
  };
}

export interface WhatsAppNumberInfo {
  id: string;
  number: string;
  isActive: boolean;
}

export interface WhatsAppInstance {
  id: string;
  name: string;
  isActive: boolean;
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage: string;
  lastMessageTime: string;
}

export interface Message {
  id: string;
  chatId: string;
  sender: string;
  content: string;
  timestamp: string;
}

export interface MassMessageRequest {
  delayMin: number;
  delayMax: number;
  info: string;
  scheduled_for?: number;
  contacts: string[]; // Array de contatos para enviar todos de uma vez
  messages: {
    type: string;
    text?: string;
    file?: string;
    choices?: string[];
  }[];
}

/**
 * Interface completa para detalhes de um chat/contato
 * Retornado pelo endpoint POST /chat/details
 * Inclui mais de 60 campos com informações do WhatsApp, Lead/CRM e Chatbot
 */
export interface ChatDetails {
  // Informações Básicas
  id: string;
  wa_fastid: string;
  wa_chatid: string;
  owner: string;
  name: string;
  phone?: string;
  
  // Dados do WhatsApp
  wa_name?: string;
  wa_contactName?: string;
  wa_archived?: boolean;
  wa_isBlocked?: boolean;
  wa_isGroup?: boolean;
  wa_isGroup_admin?: boolean;
  wa_isGroup_announce?: boolean;
  wa_isPinned?: boolean;
  wa_muteEndTime?: number;
  wa_unreadCount?: number;
  wa_lastMsgTimestamp?: number;
  wa_profilePicUrl?: string;
  wa_verifiedName?: string;
  wa_isBusiness?: boolean;
  wa_isEnterprise?: boolean;
  wa_commonGroups?: string[];
  
  // Dados de Lead/CRM (20 campos customizáveis)
  lead_name?: string;
  lead_email?: string;
  lead_status?: string;
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
  
  // Chatbot
  chatbot_summary?: string;
  chatbot_lastTrigger_id?: string;
  chatbot_disableUntil?: number;
  
  // Informações de Grupo (se aplicável)
  wa_group_participants?: any[];
  wa_group_description?: string;
  wa_group_creation?: number;
  
  // Outros campos
  image?: string; // URL da imagem de perfil (preview ou full)
  imagePreview?: string;
  createdAt?: string;
  updatedAt?: string;
  
  // Campos extras que podem existir
  [key: string]: any;
}

/**
 * Request para obter detalhes completos do chat
 */
export interface GetChatDetailsRequest {
  number: string; // Número do telefone ou ID do grupo
  preview?: boolean; // true = imagem preview (menor), false = full (original)
}