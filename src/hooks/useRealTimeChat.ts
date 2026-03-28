import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { getCurrentServerConfig } from '../services/api';

interface RealTimeEvent {
  type: 'message' | 'chat_update' | 'presence' | 'typing';
  data: unknown;
  instanceId: string;
  chatId?: string;
}

interface UseRealTimeChatProps {
  instanceToken?: string;
  instanceId?: string;
  onNewMessage?: (message: unknown) => void;
  onChatUpdate?: (chat: unknown) => void;
  onPresenceUpdate?: (presence: unknown) => void;
  onTyping?: (typing: unknown) => void;
}

export function useRealTimeChat({
  instanceToken,
  instanceId,
  onNewMessage,
  onChatUpdate,
  onPresenceUpdate,
  onTyping
}: UseRealTimeChatProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = () => {
    if (!instanceToken || !instanceId) {
      console.warn('🔌 Token ou ID da instância não fornecidos para conexão SSE');
      return;
    }

    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      console.log('🔌 Conexão SSE já ativa');
      return;
    }

    try {
      setConnectionStatus('connecting');
      
      // Usar URL base dinâmica do servidor selecionado conforme documentação UAZAPI
      const serverConfig = getCurrentServerConfig();
      const apiUrl = serverConfig?.url || 'https://uazapi.dev';
      const url = new URL(`${apiUrl}/sse`);
      
      // Parâmetros da conexão conforme documentação oficial
      url.searchParams.append('token', instanceToken);
      url.searchParams.append('events', 'messages');
      url.searchParams.append('events', 'chats');
      url.searchParams.append('events', 'presence');
      url.searchParams.append('events', 'messages_update');

      console.log('🔌 Conectando ao SSE:', {
        instanceId,
        url: url.toString(),
        server: apiUrl
      });

      const eventSource = new EventSource(url.toString());
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('✅ Conexão SSE estabelecida:', instanceId);
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectAttempts.current = 0;
        toast.success('Conectado ao tempo real');
      };

      eventSource.onmessage = (event) => {
        try {
          const eventData: RealTimeEvent = JSON.parse(event.data);
          console.log('📡 Evento SSE recebido:', eventData.type, eventData);

          switch (eventData.type) {
            case 'message':
              onNewMessage?.(eventData.data);
              break;
            case 'chat_update':
              onChatUpdate?.(eventData.data);
              break;
            case 'presence':
              onPresenceUpdate?.(eventData.data);
              break;
            case 'typing':
              onTyping?.(eventData.data);
              break;
            default:
              console.log('📡 Evento SSE não tratado:', eventData.type);
          }
        } catch (error) {
          console.error('❌ Erro ao processar evento SSE:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('❌ Erro na conexão SSE:', error);
        console.error('❌ EventSource readyState:', eventSource.readyState);
        console.error('❌ URL tentativa:', url.toString());
        setIsConnected(false);
        setConnectionStatus('error');
        
        if (eventSource.readyState === EventSource.CLOSED) {
          handleReconnect();
        }
      };

    } catch (error) {
      console.error('❌ Erro ao criar conexão SSE:', error);
      setConnectionStatus('error');
      handleReconnect();
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      console.log('🔌 Desconectando SSE:', instanceId);
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsConnected(false);
    setConnectionStatus('disconnected');
  };

  const handleReconnect = () => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      console.error('❌ Máximo de tentativas de reconexão atingido');
      toast.error('Erro de conexão em tempo real');
      setConnectionStatus('error');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000); // Backoff exponencial
    console.log(`🔄 Tentativa de reconexão ${reconnectAttempts.current + 1} em ${delay}ms`);
    
    reconnectAttempts.current += 1;
    
    reconnectTimeoutRef.current = setTimeout(() => {
      disconnect();
      connect();
    }, delay);
  };

  // Conectar automaticamente quando props mudarem
  useEffect(() => {
    if (instanceToken && instanceId) {
      connect();
    }

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceToken, instanceId]);

  // Limpeza na desmontagem
  useEffect(() => {
    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isConnected,
    connectionStatus,
    connect,
    disconnect,
    reconnect: () => {
      disconnect();
      setTimeout(connect, 1000);
    }
  };
} 