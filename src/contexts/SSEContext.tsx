/**
 * Context para gerenciar conexão SSE (Server-Sent Events) com UAZAPI
 * Inicializa automaticamente quando usuário e instância estão prontos
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useInstance } from './InstanceContext';
import { UazapiSSEService, initializeSSE, stopSSE } from '../services/uazapi-sse';

interface SSEContextValue {
  isConnected: boolean;
  service: UazapiSSEService | null;
  error: string | null;
  reconnect: () => void;
}

const SSEContext = createContext<SSEContextValue | undefined>(undefined);

interface SSEProviderProps {
  children: ReactNode;
  autoStart?: boolean; // Se true, inicia SSE automaticamente
}

export function SSEProvider({ children, autoStart = true }: SSEProviderProps) {
  const { user } = useAuth();
  const { selectedInstance } = useInstance();
  const [isConnected, setIsConnected] = useState(false);
  const [service, setService] = useState<UazapiSSEService | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Inicializar SSE quando usuário e instância estiverem prontos
  useEffect(() => {
    if (!autoStart || !user || !selectedInstance?.id || !selectedInstance?.token) {
      console.log('⏸️ SSE não iniciado:', {
        autoStart,
        hasUser: !!user,
        hasInstance: !!selectedInstance?.id,
        hasToken: !!selectedInstance?.token
      });
      return;
    }

    console.log('🚀 Iniciando SSE para captura de mensagens WhatsApp...');

    try {
      // Obter API URL do servidor selecionado
      const apiUrl = localStorage.getItem('api_url') || 'https://i9place1.uazapi.com';

      // Inicializar serviço SSE
      const sseService = initializeSSE({
        apiUrl,
        token: selectedInstance.token,
        instanceId: selectedInstance.id,
        userId: user.id,
        events: ['messages', 'chats', 'contacts'] // Eventos que queremos ouvir
      });

      setService(sseService);
      setIsConnected(true);
      setError(null);

      console.log('✅ SSE iniciado com sucesso:', {
        instanceId: selectedInstance.id,
        apiUrl
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao inicializar SSE';
      console.error('❌ Erro ao inicializar SSE:', err);
      setError(errorMessage);
      setIsConnected(false);
    }

    // Cleanup: parar SSE quando componente desmontar ou dependências mudarem
    return () => {
      console.log('🛑 Parando SSE...');
      stopSSE();
      setService(null);
      setIsConnected(false);
    };
  }, [user, selectedInstance?.id, selectedInstance?.token, autoStart]);

  // Monitorar estado da conexão
  useEffect(() => {
    if (!service) return;

    const checkInterval = setInterval(() => {
      const connected = service.isConnected();
      if (connected !== isConnected) {
        setIsConnected(connected);
        console.log('🔄 Estado SSE mudou:', connected ? 'Conectado' : 'Desconectado');
      }
    }, 2000); // Verificar a cada 2 segundos

    return () => clearInterval(checkInterval);
  }, [service, isConnected]);

  // Função para forçar reconexão
  const reconnect = () => {
    if (!user || !selectedInstance?.id || !selectedInstance?.token) {
      console.warn('⚠️ Não é possível reconectar sem usuário e instância');
      return;
    }

    console.log('🔄 Reconectando SSE...');
    stopSSE();

    setTimeout(() => {
      try {
        const apiUrl = localStorage.getItem('api_url') || 'https://i9place1.uazapi.com';
        const sseService = initializeSSE({
          apiUrl,
          token: selectedInstance.token!,
          instanceId: selectedInstance.id,
          userId: user.id,
          events: ['messages', 'chats', 'contacts']
        });

        setService(sseService);
        setIsConnected(true);
        setError(null);
        console.log('✅ SSE reconectado');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao reconectar SSE';
        console.error('❌ Erro ao reconectar SSE:', err);
        setError(errorMessage);
      }
    }, 1000);
  };

  const value: SSEContextValue = {
    isConnected,
    service,
    error,
    reconnect
  };

  return <SSEContext.Provider value={value}>{children}</SSEContext.Provider>;
}

/**
 * Hook para acessar o contexto SSE
 */
export function useSSE(): SSEContextValue {
  const context = useContext(SSEContext);
  if (!context) {
    throw new Error('useSSE deve ser usado dentro de SSEProvider');
  }
  return context;
}
