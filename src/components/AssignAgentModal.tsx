 import { useState, useEffect } from 'react';
import { X, User, Users, Check, Search, Clock, MessageSquare } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';

interface Agent {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  activeChats: number;
  lastActivity: number;
  skills: string[];
  isAvailable: boolean;
}

interface AssignAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  chatName: string;
  currentAgent?: string;
  currentAgentId?: string;
  agents: Agent[]; // ✅ Agentes reais do contexto
  onAssign: (agentId: string, agentName: string) => void;
}

export function AssignAgentModal({ 
  isOpen, 
  onClose, 
  chatName, 
  currentAgent,
  currentAgentId,
  agents: propsAgents, // ✅ Agentes reais do contexto
  onAssign 
}: AssignAgentModalProps) {
  const [agents, setAgents] = useState<Agent[]>(propsAgents);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(currentAgentId || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'online'>('all');

  // ✅ Atualizar agentes quando props mudarem
  useEffect(() => {
    if (isOpen) {
      console.log('📋 Agentes disponíveis para atribuição:', propsAgents);
      setAgents(propsAgents);
      setSelectedAgentId(currentAgentId || '');
    }
  }, [isOpen, propsAgents, currentAgentId]);

  const handleAssign = () => {
    if (!selectedAgentId) {
      toast.error('Selecione um agente');
      return;
    }

    const agent = agents.find(a => a.id === selectedAgentId);
    if (!agent) {
      toast.error('Agente não encontrado');
      return;
    }

    console.log('✅ Atribuindo chat para agente:', { agentId: selectedAgentId, agentName: agent.name });
    onAssign(selectedAgentId, agent.name);
    onClose();
  };

  const handleUnassign = () => {
    console.log('🔄 Desatribuindo chat');
    onAssign('', '');
    onClose();
  };

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFilter = 
      filterStatus === 'all' ||
      (filterStatus === 'available' && agent.isAvailable) ||
      (filterStatus === 'online' && agent.status === 'online');

    return matchesSearch && matchesFilter;
  });

  // Ordenar agentes: disponíveis primeiro, depois por menor carga de trabalho
  const sortedAgents = [...filteredAgents].sort((a, b) => {
    if (a.isAvailable && !b.isAvailable) return -1;
    if (!a.isAvailable && b.isAvailable) return 1;
    if (a.status === 'online' && b.status !== 'online') return -1;
    if (a.status !== 'online' && b.status === 'online') return 1;
    return a.activeChats - b.activeChats;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'Online';
      case 'away': return 'Ausente';
      case 'busy': return 'Ocupado';
      case 'offline': return 'Offline';
      default: return 'Desconhecido';
    }
  };

  const formatLastActivity = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes}m atrás`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h atrás`;
    
    const days = Math.floor(hours / 24);
    return `${days}d atrás`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-primary-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Atribuir Agente</h2>
              <p className="text-sm text-gray-500">{chatName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current Assignment */}
        {currentAgent && (
          <div className="p-4 bg-blue-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-900">
                  Atualmente atribuída para: <strong>{currentAgent}</strong>
                </span>
              </div>
              <button
                onClick={handleUnassign}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Desatribuir
              </button>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="p-6 border-b border-gray-200 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar agentes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={cn(
                "px-3 py-1.5 text-sm rounded-lg transition-colors",
                filterStatus === 'all' 
                  ? "bg-primary-100 text-primary-700" 
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterStatus('available')}
              className={cn(
                "px-3 py-1.5 text-sm rounded-lg transition-colors",
                filterStatus === 'available' 
                  ? "bg-primary-100 text-primary-700" 
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              Disponíveis
            </button>
            <button
              onClick={() => setFilterStatus('online')}
              className={cn(
                "px-3 py-1.5 text-sm rounded-lg transition-colors",
                filterStatus === 'online' 
                  ? "bg-primary-100 text-primary-700" 
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              Online
            </button>
          </div>
        </div>

        {/* Agents List */}
        <div className="flex-1 overflow-y-auto p-6">
          {sortedAgents.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 mb-1">Nenhum agente encontrado</p>
              <p className="text-sm text-gray-400">Tente ajustar os filtros de busca</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedAgents.map((agent) => (
                <div
                  key={agent.id}
                  onClick={() => setSelectedAgentId(agent.id)}
                  className={cn(
                    "p-4 border rounded-lg cursor-pointer transition-all",
                    selectedAgentId === agent.id
                      ? "border-primary-300 bg-primary-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  )}
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar e Status */}
                    <div className="relative">
                      <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-600 font-medium">
                          {agent.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className={cn(
                        "absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white",
                        getStatusColor(agent.status)
                      )} />
                    </div>

                    {/* Informações do Agente */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-gray-900">{agent.name}</h3>
                        {selectedAgentId === agent.id && (
                          <Check className="h-5 w-5 text-primary-600" />
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <div className={cn("h-2 w-2 rounded-full", getStatusColor(agent.status))} />
                          {getStatusText(agent.status)}
                        </span>
                        
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {agent.activeChats} chats
                        </span>
                        
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatLastActivity(agent.lastActivity)}
                        </span>
                      </div>

                      {/* Skills */}
                      {agent.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {agent.skills.map((skill, index) => (
                            <span
                              key={index}
                              className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Indicador de Disponibilidade */}
                    {agent.isAvailable && (
                      <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        Disponível
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {sortedAgents.length} agente(s) encontrado(s)
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleAssign}
              disabled={!selectedAgentId}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Atribuir Agente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 