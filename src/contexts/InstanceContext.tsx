import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { getInstances } from '../lib/wapi/api';

export interface Instance {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'connecting';
  isDefault: boolean;
  token?: string;
  phoneConnected?: string;
  profileName?: string;
  systemName?: string;
}

interface InstanceContextType {
  instances: Instance[];
  selectedInstance: Instance | null;
  setSelectedInstance: (instance: Instance | null) => void;
  showInstanceModal: boolean;
  setShowInstanceModal: (show: boolean) => void;
  defaultInstance: Instance | null;
  loading: boolean;
  createInstance: (data: { name: string }) => Promise<void>;
  deleteInstance: (id: string) => Promise<void>;
  connectInstance: (id: string) => Promise<void>;
  disconnectInstance: (id: string) => Promise<void>;
}

const InstanceContext = createContext<InstanceContextType | undefined>(undefined);

// Função para converter dados da API para o formato do contexto
const formatApiInstance = (apiInstance: any, isDefault: boolean = false): Instance => ({
  id: apiInstance.id,
  name: apiInstance.name || apiInstance.profileName || apiInstance.id,
  status: apiInstance.status,
  isDefault,
  token: apiInstance.token,
  phoneConnected: apiInstance.phoneConnected,
  profileName: apiInstance.profileName,
  systemName: apiInstance.systemName
});

export function InstanceProvider({ children }: { children: React.ReactNode }) {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  const [showInstanceModal, setShowInstanceModal] = useState(false);
  const [defaultInstance, setDefaultInstance] = useState<Instance | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    loadInstances();
  }, []);

  useEffect(() => {
    // Reset selected instance and show modal when navigating to specific pages
    if (location.pathname !== '/messages/multi') {
      const shouldShowModal = [
        '/messages/chatzap',
        '/messages/mass',
        '/messages/campaigns',
        '/messages/instances'
      ].includes(location.pathname);

      if (shouldShowModal && instances.length > 1) {
        setSelectedInstance(null);
        setShowInstanceModal(true);
      } else if (instances.length === 1) {
        // If there's only one instance, use it automatically
        setSelectedInstance(instances[0]);
        setShowInstanceModal(false);
      }
    } else {
      // For multi-chat page, always use default instance
      setSelectedInstance(defaultInstance);
      setShowInstanceModal(false);
    }
  }, [location.pathname, instances.length, defaultInstance]);

  const loadInstances = async () => {
    try {
      setLoading(true);
      
      // Carregar instâncias da API real
      const apiInstances = await getInstances();
      
      // Converter para o formato do contexto
      const formattedInstances = apiInstances.map((instance, index) => 
        formatApiInstance(instance, index === 0) // Primeira instância como padrão
      );
      
      setInstances(formattedInstances);
      const defaultInst = formattedInstances.find(i => i.isDefault) || formattedInstances[0];
      setDefaultInstance(defaultInst);

      // Para multi-chat page, automaticamente selecionar a instância padrão
      if (location.pathname === '/messages/multi' && defaultInst) {
        setSelectedInstance(defaultInst);
      }
      
    } catch (error) {
      console.error('Erro ao carregar instâncias:', error);
      toast.error('Erro ao carregar instâncias da API');
      
      // Em caso de erro, usar dados vazios
      setInstances([]);
      setDefaultInstance(null);
    } finally {
      setLoading(false);
    }
  };

  const createInstance = async (data: { name: string }) => {
    try {
      setLoading(true);
      // Simulando a criação de uma nova instância
      const newInstance: Instance = {
        id: String(Date.now()),
        name: data.name,
        status: 'disconnected',
        isDefault: instances.length === 0 // Se for a primeira, será a padrão
      };
      
      const updatedInstances = [...instances, newInstance];
      setInstances(updatedInstances);
      
      if (newInstance.isDefault) {
        setDefaultInstance(newInstance);
      }
      
      toast.success('Instância criada com sucesso!');
    } catch (error) {
      console.error('Erro ao criar instância:', error);
      toast.error('Erro ao criar instância. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const deleteInstance = async (id: string) => {
    try {
      setLoading(true);
      // Simulando a exclusão de uma instância
      const updatedInstances = instances.filter(instance => instance.id !== id);
      setInstances(updatedInstances);
      
      // Se a instância padrão foi removida, definir outra como padrão
      if (defaultInstance?.id === id && updatedInstances.length > 0) {
        const newDefault = updatedInstances[0];
        setDefaultInstance(newDefault);
        
        // Atualizar a instância como padrão
        setInstances(updatedInstances.map(inst => 
          inst.id === newDefault.id 
            ? { ...inst, isDefault: true } 
            : inst
        ));
      }
      
      // Se a instância selecionada foi removida, resetar a seleção
      if (selectedInstance?.id === id) {
        setSelectedInstance(null);
      }
      
      toast.success('Instância excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir instância:', error);
      toast.error('Erro ao excluir instância. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const connectInstance = async (id: string) => {
    try {
      setLoading(true);
      // Simulando a conexão de uma instância
      setInstances(instances.map(instance => 
        instance.id === id 
          ? { ...instance, status: 'connected' } 
          : instance
      ));
      
      toast.success('Instância conectada com sucesso!');
    } catch (error) {
      console.error('Erro ao conectar instância:', error);
      toast.error('Erro ao conectar instância. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const disconnectInstance = async (id: string) => {
    try {
      setLoading(true);
      // Simulando a desconexão de uma instância
      setInstances(instances.map(instance => 
        instance.id === id 
          ? { ...instance, status: 'disconnected' } 
          : instance
      ));
      
      toast.success('Instância desconectada com sucesso!');
    } catch (error) {
      console.error('Erro ao desconectar instância:', error);
      toast.error('Erro ao desconectar instância. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <InstanceContext.Provider
      value={{
        instances,
        selectedInstance,
        setSelectedInstance,
        showInstanceModal,
        setShowInstanceModal,
        defaultInstance,
        loading,
        createInstance,
        deleteInstance,
        connectInstance,
        disconnectInstance
      }}
    >
      {children}
    </InstanceContext.Provider>
  );
}

export function useInstance() {
  const context = useContext(InstanceContext);
  if (context === undefined) {
    throw new Error('useInstance must be used within an InstanceProvider');
  }
  return context;
}