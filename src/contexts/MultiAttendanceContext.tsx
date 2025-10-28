import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

// Tipos para o sistema de multiatendimento
export type UserRole = 'administrator' | 'agent' | 'viewer';
export type ChatStatus = 'unassigned' | 'assigned' | 'closed';
export type AgentStatus = 'online' | 'away' | 'busy' | 'offline';

export interface Agent {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: AgentStatus;
  role: UserRole;
  activeChats: number;
  lastActivity: number;
  skills: string[];
  isAvailable: boolean;
  maxConcurrentChats: number;
}

export interface ChatAssignment {
  id: string;
  chatId: string;
  agentId: string;
  assignedAt: number;
  assignedBy: string;
  status: ChatStatus;
  closedAt?: number;
  closedBy?: string;
  notes?: string;
}

export interface AttendanceMetrics {
  totalChats: number;
  assignedChats: number;
  closedChats: number;
  averageResponseTime: number;
  averageResolutionTime: number;
  agentPerformance: {
    [agentId: string]: {
      chatsHandled: number;
      averageResponseTime: number;
      customerSatisfaction: number;
    };
  };
}

interface MultiAttendanceContextType {
  // Estado do usuário atual
  currentUserRole: UserRole;
  currentUserId: string | null; // ✅ ID do usuário atual
  isAdministrator: boolean;
  isAgent: boolean;
  
  // Agentes
  agents: Agent[];
  loadAgents: () => Promise<void>;
  updateAgentStatus: (agentId: string, status: AgentStatus) => Promise<void>;
  
  // Atribuições de chat
  assignments: ChatAssignment[];
  assignChat: (chatId: string, agentId: string, notes?: string) => Promise<void>;
  unassignChat: (chatId: string, notes?: string) => Promise<void>;
  closeChat: (chatId: string, notes?: string) => Promise<void>;
  reopenChat: (chatId: string) => Promise<void>;
  
  // Métricas
  metrics: AttendanceMetrics | null;
  loadMetrics: () => Promise<void>;
  
  // Filtros e busca
  filterByAgent: string | null;
  filterByStatus: ChatStatus | null;
  setFilterByAgent: (agentId: string | null) => void;
  setFilterByStatus: (status: ChatStatus | null) => void;
  
  // Loading states
  loading: boolean;
  agentsLoading: boolean;
  metricsLoading: boolean;
}

const MultiAttendanceContext = createContext<MultiAttendanceContextType | undefined>(undefined);

export function MultiAttendanceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('agent');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [assignments, setAssignments] = useState<ChatAssignment[]>([]);
  const [metrics, setMetrics] = useState<AttendanceMetrics | null>(null);
  const [filterByAgent, setFilterByAgent] = useState<string | null>(null);
  const [filterByStatus, setFilterByStatus] = useState<ChatStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [metricsLoading, setMetricsLoading] = useState(false);

  // Evitar múltiplas requisições concorrentes de agentes
  const agentsFetchInFlight = useRef(false);

  // Carregar role do usuário atual
  useEffect(() => {
    if (user) {
      loadUserRole();
    }
  }, [user]);

  const loadUserRole = async () => {
    try {
      // 👑 SUPER ADMIN: rafael@i9place.com.br tem privilégios de administrador
      const ADMIN_EMAIL = 'rafael@i9place.com.br';
      
      if (user?.email === ADMIN_EMAIL) {
        console.log('👑 SUPER ADMIN DETECTADO - Role: administrator');
        setCurrentUserRole('administrator');
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', user?.id)
        .single();

      if (!profile) {
        console.warn('Perfil não encontrado, usando role padrão');
        setCurrentUserRole('agent');
        return;
      }
      
      // Usuários normais são agentes
      console.log('👤 Usuário normal - Role: agent');
      setCurrentUserRole('agent');
    } catch (error) {
      console.error('Erro ao carregar perfil do usuário:', error);
      setCurrentUserRole('agent'); // Default para agent
    } finally {
      setLoading(false);
    }
  };

  const loadAgents = useCallback(async () => {
    if (agentsFetchInFlight.current) return;
    agentsFetchInFlight.current = true;
    setAgentsLoading(true);

    try {
      console.log('👥 Carregando agentes do Supabase...');
      const MAX_RETRIES = 3;
      let attempt = 0;
      while (attempt < MAX_RETRIES) {
        try {
          const { data: profiles, error } = await supabase
            .from('profiles')
            .select('id, email, full_name, is_active')
            .eq('is_active', true)
            .limit(100);

          if (error) throw error;

          const agentsData: Agent[] = (profiles || []).map((profile: any) => ({
            id: profile.id,
            name: profile.full_name || profile.email,
            email: profile.email,
            status: 'online' as AgentStatus,
            role: 'agent' as UserRole,
            activeChats: Math.floor(Math.random() * 5),
            lastActivity: Date.now() - Math.floor(Math.random() * 3600000),
            skills: ['Atendimento', 'Vendas'],
            isAvailable: true,
            maxConcurrentChats: 10
          }));

          console.log(`✅ ${agentsData.length} agentes carregados:`, agentsData.map(a => ({ id: a.id, name: a.name, email: a.email })));
          setAgents(agentsData);
          break; // sucesso
        } catch (err: any) {
          attempt++;
          const isNetworkError = typeof err?.message === 'string' && /Failed to fetch|NetworkError|TypeError/i.test(err.message);
          if (attempt >= MAX_RETRIES || !isNetworkError) {
            throw err;
          }
          await new Promise((res) => setTimeout(res, attempt * 400));
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar agentes:', error);
      toast.error('Erro ao carregar agentes');
    } finally {
      setAgentsLoading(false);
      agentsFetchInFlight.current = false;
    }
  }, []);

  const updateAgentStatus = async (agentId: string, status: AgentStatus) => {
    try {
      // Atualizar no estado local
      setAgents(prev => prev.map(agent => 
        agent.id === agentId 
          ? { ...agent, status, lastActivity: Date.now() }
          : agent
      ));

      // Em produção, aqui seria feita a atualização no banco
    } catch (error) {
      console.error('Erro ao atualizar status do agente:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const assignChat = async (chatId: string, agentId: string, notes?: string) => {
    try {
      // 🔄 Verificar se já existe uma atribuição ativa para este chat
      const existingAssignment = assignments.find(a => a.chatId === chatId && a.status === 'assigned');
      
      if (existingAssignment) {
        // 🔄 TRANSFERÊNCIA: Fechar atribuição antiga e criar nova
        console.log('🔄 Transferindo chat:', {
          from: existingAssignment.agentId,
          to: agentId,
          chatId
        });
        
        setAssignments(prev => prev.map(a => 
          a.chatId === chatId && a.status === 'assigned'
            ? { ...a, status: 'closed' as ChatStatus, closedAt: Date.now(), closedBy: user?.id, notes: 'Transferido' }
            : a
        ));
        
        // Decrementar contador do agente anterior
        setAgents(prev => prev.map(agent => 
          agent.id === existingAssignment.agentId 
            ? { ...agent, activeChats: Math.max(0, agent.activeChats - 1) }
            : agent
        ));
      }

      // Criar nova atribuição
      const assignment: ChatAssignment = {
        id: `assignment_${Date.now()}`,
        chatId,
        agentId,
        assignedAt: Date.now(),
        assignedBy: user?.id || '',
        status: 'assigned',
        notes
      };

      setAssignments(prev => [...prev, assignment]);
      
      // Atualizar contador de chats ativos do novo agente
      setAgents(prev => prev.map(agent => 
        agent.id === agentId 
          ? { ...agent, activeChats: agent.activeChats + 1 }
          : agent
      ));

      const agentName = agents.find(a => a.id === agentId)?.name || 'Agente';
      toast.success(existingAssignment ? `Chat transferido para ${agentName}` : `Chat atribuído para ${agentName}`);
    } catch (error) {
      console.error('Erro ao atribuir chat:', error);
      toast.error('Erro ao atribuir chat');
    }
  };

  const unassignChat = async (chatId: string, notes?: string) => {
    try {
      const assignment = assignments.find(a => a.chatId === chatId && a.status === 'assigned');
      if (!assignment) return;

      // Atualizar assignment
      setAssignments(prev => prev.map(a => 
        a.chatId === chatId && a.status === 'assigned'
          ? { ...a, status: 'unassigned' as ChatStatus, notes }
          : a
      ));

      // Atualizar contador de chats ativos do agente
      setAgents(prev => prev.map(agent => 
        agent.id === assignment.agentId 
          ? { ...agent, activeChats: Math.max(0, agent.activeChats - 1) }
          : agent
      ));

      toast.success('Chat desatribuído com sucesso');
    } catch (error) {
      console.error('Erro ao desatribuir chat:', error);
      toast.error('Erro ao desatribuir chat');
    }
  };

  const closeChat = async (chatId: string, notes?: string) => {
    try {
      const assignment = assignments.find(a => a.chatId === chatId && a.status === 'assigned');
      
      setAssignments(prev => prev.map(a => 
        a.chatId === chatId && a.status === 'assigned'
          ? { 
              ...a, 
              status: 'closed' as ChatStatus, 
              closedAt: Date.now(),
              closedBy: user?.id,
              notes 
            }
          : a
      ));

      // Atualizar contador de chats ativos do agente
      if (assignment) {
        setAgents(prev => prev.map(agent => 
          agent.id === assignment.agentId 
            ? { ...agent, activeChats: Math.max(0, agent.activeChats - 1) }
            : agent
        ));
      }

      toast.success('Atendimento finalizado com sucesso');
    } catch (error) {
      console.error('Erro ao fechar chat:', error);
      toast.error('Erro ao fechar atendimento');
    }
  };

  const reopenChat = async (chatId: string) => {
    try {
      setAssignments(prev => prev.map(a => 
        a.chatId === chatId && a.status === 'closed'
          ? { ...a, status: 'unassigned' as ChatStatus, closedAt: undefined, closedBy: undefined }
          : a
      ));

      toast.success('Atendimento reaberto com sucesso');
    } catch (error) {
      console.error('Erro ao reabrir chat:', error);
      toast.error('Erro ao reabrir atendimento');
    }
  };

  const loadMetrics = async () => {
    setMetricsLoading(true);
    try {
      // Mock data para demonstração
      const mockMetrics: AttendanceMetrics = {
        totalChats: assignments.length,
        assignedChats: assignments.filter(a => a.status === 'assigned').length,
        closedChats: assignments.filter(a => a.status === 'closed').length,
        averageResponseTime: 120, // segundos
        averageResolutionTime: 1800, // segundos
        agentPerformance: {}
      };

      // Calcular performance por agente
      agents.forEach(agent => {
        const agentAssignments = assignments.filter(a => a.agentId === agent.id);
        mockMetrics.agentPerformance[agent.id] = {
          chatsHandled: agentAssignments.length,
          averageResponseTime: 90 + Math.random() * 60,
          customerSatisfaction: 4.2 + Math.random() * 0.8
        };
      });

      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
      toast.error('Erro ao carregar métricas');
    } finally {
      setMetricsLoading(false);
    }
  };

  const contextValue: MultiAttendanceContextType = {
    currentUserRole,
    currentUserId: user?.id || null, // ✅ ID do usuário logado
    isAdministrator: currentUserRole === 'administrator',
    isAgent: currentUserRole === 'agent' || currentUserRole === 'administrator',
    
    agents,
    loadAgents,
    updateAgentStatus,
    
    assignments,
    assignChat,
    unassignChat,
    closeChat,
    reopenChat,
    
    metrics,
    loadMetrics,
    
    filterByAgent,
    filterByStatus,
    setFilterByAgent,
    setFilterByStatus,
    
    loading,
    agentsLoading,
    metricsLoading
  };

  return (
    <MultiAttendanceContext.Provider value={contextValue}>
      {children}
    </MultiAttendanceContext.Provider>
  );
}

export function useMultiAttendance() {
  const context = useContext(MultiAttendanceContext);
  if (context === undefined) {
    throw new Error('useMultiAttendance must be used within a MultiAttendanceProvider');
  }
  return context;
}