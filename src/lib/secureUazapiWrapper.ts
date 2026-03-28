/**
 * WRAPPER SEGURO PARA API UAZAPI
 * 
 * Adiciona camada de segurança validando ownership de instância
 * antes de TODAS as chamadas à API UAZAPI.
 * 
 * CRÍTICO: Use SEMPRE este wrapper em vez de uazapiService direto!
 */

import { uazapiService } from '../services/uazapiService';
import { validateInstanceOwnership } from './instanceSync';
import { toast } from 'react-hot-toast';

/**
 * Valida ownership e executa função da API UAZAPI.
 * 
 * @param instanceToken - Token da instância
 * @param userId - ID do usuário atual
 * @param apiFunction - Função da API a ser executada
 * @returns Resultado da função ou erro
 */
async function secureApiCall<T>(
  instanceToken: string,
  userId: string,
  apiFunction: () => Promise<T>
): Promise<T> {
  // Validar ownership da instância
  console.log('🔐 Validando ownership da instância...');
  
  const instance = await validateInstanceOwnership(instanceToken, userId);
  
  if (!instance) {
    const error = new Error('🚫 ACESSO NEGADO: Você não tem permissão para acessar esta instância');
    console.error(error.message);
    toast.error('Acesso negado: instância não autorizada');
    throw error;
  }

  console.log('✅ Ownership validada - executando chamada à API');
  
  try {
    return await apiFunction();
  } catch (error) {
    console.error('❌ Erro na chamada à API:', error);
    throw error;
  }
}

/**
 * Service SEGURO para chamadas à API UAZAPI.
 * Todas as funções validam ownership antes de executar.
 */
export const secureUazapiService = {
  /**
   * Busca chats de forma segura
   */
  async searchChatsSecure(
    instanceToken: string,
    userId: string,
    params: Record<string, unknown>
  ) {
    return secureApiCall(
      instanceToken,
      userId,
      () => uazapiService.searchChats(instanceToken, params)
    );
  },

  /**
   * Busca mensagens de forma segura
   */
  async searchMessagesSecure(
    instanceToken: string,
    userId: string,
    params: Record<string, unknown>
  ) {
    return secureApiCall(
      instanceToken,
      userId,
      () => uazapiService.searchMessages(instanceToken, params)
    );
  },

  /**
   * Envia mensagem simples de forma segura
   */
  async sendSimpleMessageSecure(
    instanceToken: string,
    userId: string,
    data: Record<string, unknown>
  ) {
    return secureApiCall(
      instanceToken,
      userId,
      () => uazapiService.sendSimpleMessage(instanceToken, data)
    );
  },

  /**
   * Reage a mensagem de forma segura
   */
  async reactToMessageSecure(
    instanceToken: string,
    userId: string,
    chatId: string,
    messageId: string,
    emoji: string
  ) {
    return secureApiCall(
      instanceToken,
      userId,
      () => uazapiService.reactToMessage(instanceToken, chatId, messageId, emoji)
    );
  },

  /**
   * Envia múltiplas mídias de forma segura
   */
  async sendMultipleMediaSecure(
    instanceToken: string,
    userId: string,
    chatId: string,
    mediaFiles: Array<{
      id: string;
      file: File;
      type: 'image' | 'video' | 'audio' | 'document';
      caption?: string;
    }>,
    onProgress?: (current: number, total: number, currentFile: string) => void
  ) {
    return secureApiCall(
      instanceToken,
      userId,
      () => uazapiService.sendMultipleMedia(instanceToken, chatId, mediaFiles, onProgress)
    );
  },

  /**
   * Envia mensagem em massa de forma segura
   */
  async sendMassMessageSecure(
    instanceToken: string,
    userId: string,
    data: Record<string, unknown>
  ) {
    return secureApiCall(
      instanceToken,
      userId,
      () => uazapiService.sendMassMessage(instanceToken, data)
    );
  },

  /**
   * Testa conexão da instância de forma segura
   */
  async testInstanceConnectionSecure(
    instanceToken: string,
    userId: string
  ) {
    return secureApiCall(
      instanceToken,
      userId,
      () => uazapiService.testInstanceConnection(instanceToken)
    );
  }
};

/**
 * Hook para usar o service seguro
 */
export function useSecureUazapiService(userId: string | undefined) {
  if (!userId) {
    throw new Error('userId é obrigatório para usar o serviço seguro');
  }

  return {
    searchChats: (token: string, params: Record<string, unknown>) =>
      secureUazapiService.searchChatsSecure(token, userId, params),

    searchMessages: (token: string, params: Record<string, unknown>) =>
      secureUazapiService.searchMessagesSecure(token, userId, params),

    sendSimpleMessage: (token: string, data: Record<string, unknown>) =>
      secureUazapiService.sendSimpleMessageSecure(token, userId, data),
    
    reactToMessage: (token: string, chatId: string, messageId: string, emoji: string) =>
      secureUazapiService.reactToMessageSecure(token, userId, chatId, messageId, emoji),
    
    sendMultipleMedia: (token: string, chatId: string, mediaFiles: Array<{ id: string; file: File; type: 'image' | 'video' | 'audio' | 'document'; caption?: string }>, onProgress?: (current: number, total: number, currentFile: string) => void) =>
      secureUazapiService.sendMultipleMediaSecure(token, userId, chatId, mediaFiles, onProgress),

    sendMassMessage: (token: string, data: Record<string, unknown>) =>
      secureUazapiService.sendMassMessageSecure(token, userId, data),
    
    testInstanceConnection: (token: string) =>
      secureUazapiService.testInstanceConnectionSecure(token, userId)
  };
}
