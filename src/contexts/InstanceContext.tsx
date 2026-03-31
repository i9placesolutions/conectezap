import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { syncInstancesStatus, syncAllInstancesForAdmin } from '../lib/instanceSync';

const ADMIN_EMAIL = 'rafael@i9place.com.br';

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

export function InstanceProvider({ children }: { children: React.ReactNode }) {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [selectedInstance, setSelectedInstanceState] = useState<Instance | null>(null);
  const [showInstanceModal, setShowInstanceModal] = useState(false);
  const [defaultInstance, setDefaultInstance] = useState<Instance | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const { user } = useAuth();

  // Wrapper para persistir instância selecionada no localStorage
  const setSelectedInstance = (instance: Instance | null) => {
    setSelectedInstanceState(instance);
    if (instance) {
      localStorage.setItem('conectezap_selected_instance', JSON.stringify(instance));
    } else {
      localStorage.removeItem('conectezap_selected_instance');
    }
  };

  // Restaurar instância salva do localStorage na montagem
  useEffect(() => {
    try {
      const saved = localStorage.getItem('conectezap_selected_instance');
      if (saved) {
        const parsed = JSON.parse(saved) as Instance;
        setSelectedInstanceState(parsed);
      }
    } catch {
      localStorage.removeItem('conectezap_selected_instance');
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadInstances();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    // ✅ CORREÇÃO: Não forçar mudança de instância ao trocar de aba/voltar para a página
    // Apenas resetar instância quando mudar de rota (pathname muda)
    
    // Se não há instância selecionada E temos instâncias disponíveis
    if (!selectedInstance && instances.length > 0) {
      // Para páginas que precisam de instância, mostrar modal se houver múltiplas
      const needsInstancePages = [
        '/messages/multi',
        '/messages/mass',
        '/messages/campaigns',
        '/messages/instances'
      ];
      
      const needsInstance = needsInstancePages.includes(location.pathname);
      
      if (needsInstance) {
        if (instances.length === 1) {
          // Se há apenas uma instância, selecionar automaticamente
          setSelectedInstance(instances[0]);
          setShowInstanceModal(false);
        } else {
          // Se há múltiplas instâncias, SEMPRE mostrar modal para escolher
          // (removida verificação de defaultInstance que pulava o modal)
          console.log('📋 Múltiplas instâncias disponíveis, mostrando modal de seleção');
          setShowInstanceModal(true);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, instances.length, selectedInstance]);

  const loadInstances = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      console.log('🔐 Carregando instâncias...');
      console.log('👤 Email do usuário:', user.email);
      console.log('👤 ID do usuário:', user.id);
      console.log('🔑 Admin email:', ADMIN_EMAIL);
      console.log('✅ É admin?', user.email === ADMIN_EMAIL);
      
      let supabaseInstances: Record<string, unknown>[] = [];
      
      // REGRA ESPECIAL: rafael@i9place.com.br vê TODAS as instâncias
      if (user.email === ADMIN_EMAIL) {
        console.log('👑 Usuário admin - Carregando TODAS as instâncias via sync completo');
        
        // Sincronizar com a API UAZAPI e Supabase
        supabaseInstances = await syncAllInstancesForAdmin();
        
        console.log(`📊 Total de instâncias sincronizadas: ${supabaseInstances?.length || 0}`);
      } else {
        // Usuários normais: apenas suas instâncias (RLS automático)
        console.log('👤 Usuário normal - Carregando apenas instâncias próprias');
        console.log('🔍 Buscando instâncias para user_id:', user.id);
        supabaseInstances = await syncInstancesStatus(user.id);
        console.log(`📋 Instâncias encontradas: ${supabaseInstances?.length || 0}`);
      }
      
      // Converter para o formato do contexto
      const formattedInstances: Instance[] = supabaseInstances.map((instance: Record<string, unknown>, index: number) => ({
        id: instance.id as string,
        name: instance.name as string,
        status: instance.status as 'connected' | 'disconnected' | 'connecting',
        isDefault: index === 0, // Primeira instância como padrão
        token: instance.token as string | undefined,
        phoneConnected: (instance.phone_connected as string) || undefined,
        profileName: instance.name as string,
        systemName: instance.name as string
      }));
      
      console.log(`✅ ${formattedInstances.length} instâncias carregadas`);
      
      setInstances(formattedInstances);
      const defaultInst = formattedInstances.find((i: Instance) => i.isDefault) || formattedInstances[0];
      setDefaultInstance(defaultInst);

      // Restaurar instância salva com dados atualizados
      const saved = localStorage.getItem('conectezap_selected_instance');
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Instance;
          const updated = formattedInstances.find(i => i.id === parsed.id);
          if (updated) {
            setSelectedInstanceState(updated);
            localStorage.setItem('conectezap_selected_instance', JSON.stringify(updated));
          }
        } catch {
          // Se falhar, não faz nada - o useEffect de rota vai cuidar
        }
      } else if (location.pathname === '/messages/multi' && defaultInst) {
        // Se não há instância salva, selecionar padrão na página multi
        setSelectedInstance(defaultInst);
      }
      
    } catch (error) {
      console.error('❌ Erro ao carregar instâncias:', error);
      toast.error('Erro ao carregar instâncias');
      
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