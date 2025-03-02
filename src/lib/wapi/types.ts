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