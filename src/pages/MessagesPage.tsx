import { useState } from 'react';
import { Search, Filter, Plus, MessageSquare, Clock, CheckCircle, AlertTriangle, Phone } from 'lucide-react';
import { cn } from '../lib/utils';

interface Lead {
  id: string;
  name: string;
  message: string;
  time: string;
  agent: string;
  type: string;
  hasAudio?: boolean;
  hasImage?: boolean;
  status: 'unread' | 'open' | 'expired' | 'closed';
}

interface KanbanColumn {
  id: string;
  title: string;
  icon: React.ElementType;
  count: number;
  color: string;
}

export function MessagesPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const columns: KanbanColumn[] = [
    { 
      id: 'unread', 
      title: 'Não lidas', 
      icon: MessageSquare, 
      count: 5,
      color: 'primary'
    },
    { 
      id: 'open', 
      title: 'Abertas', 
      icon: Clock, 
      count: 40,
      color: 'primary'
    },
    { 
      id: 'expired', 
      title: 'Expiradas', 
      icon: AlertTriangle, 
      count: 9,
      color: 'primary'
    },
    { 
      id: 'closed', 
      title: 'Finalizadas', 
      icon: CheckCircle, 
      count: 0,
      color: 'primary'
    }
  ];

  const leads: Lead[] = [
    {
      id: '1',
      name: 'Mateus',
      message: 'Áudio',
      time: '1h',
      agent: 'Leonardo de Bona',
      type: 'Potenciais Clientes',
      hasAudio: true,
      status: 'open'
    },
    {
      id: '2',
      name: 'Ana Costa',
      message: 'Oi, Leonardo! Aqui é a Ana, como va',
      time: '22h',
      agent: 'Leonardo de Bona',
      type: 'Oportunidade',
      status: 'unread'
    },
    {
      id: '3',
      name: 'Luiza',
      message: 'Imagem',
      time: '22h',
      agent: 'Leonardo de Bona',
      hasImage: true,
      status: 'expired'
    },
    {
      id: '4',
      name: 'Larissa',
      message: 'Imagem',
      time: '23h',
      agent: 'Leonardo de Bona',
      hasImage: true,
      status: 'closed'
    }
  ];

  const getColumnLeads = (status: string) => {
    return leads.filter(lead => lead.status === status);
  };

  const getColumnColor = (color: string) => {
    const colors = {
      primary: 'bg-primary-50 text-primary-700 border-primary-200'
    };
    return colors[color as keyof typeof colors] || colors.primary;
  };

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <button className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors">
            <Plus className="h-5 w-5" />
            Nova conversa
          </button>

          <div className="flex gap-4">
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Pesquise por uma palavra-chave"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <button className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100">
              <Filter className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-4 h-full">
          {columns.map((column) => (
            <div
              key={column.id}
              className="flex-1 min-w-[320px] flex flex-col bg-gray-50 rounded-lg"
            >
              {/* Column Header */}
              <div className={cn(
                "p-3 rounded-t-lg border-b flex items-center justify-between",
                getColumnColor(column.color)
              )}>
                <div className="flex items-center gap-2">
                  <column.icon className="h-5 w-5" />
                  <h3 className="font-medium">{column.title}</h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/50">
                  {column.count}
                </span>
              </div>

              {/* Column Content */}
              <div className="flex-1 p-2 overflow-y-auto">
                <div className="space-y-2">
                  {getColumnLeads(column.id).map((lead) => (
                    <div
                      key={lead.id}
                      className="bg-white rounded-lg border border-gray-200 p-3 hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-primary-600 font-medium">
                              {lead.name[0].toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{lead.name}</h4>
                            <span className="text-xs text-gray-500">{lead.time}</span>
                          </div>
                        </div>
                        <Phone className="h-4 w-4 text-primary-600" />
                      </div>

                      <div className="text-sm text-gray-600 mb-2">
                        {lead.hasAudio && (
                          <div className="flex items-center gap-1">
                            <span>🎵</span>
                            <span>Áudio</span>
                          </div>
                        )}
                        {lead.hasImage && (
                          <div className="flex items-center gap-1">
                            <span>🖼️</span>
                            <span>Imagem</span>
                          </div>
                        )}
                        {!lead.hasAudio && !lead.hasImage && (
                          <p className="line-clamp-2">{lead.message}</p>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-primary-600 text-xs">
                              {lead.agent[0].toUpperCase()}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">{lead.agent}</span>
                        </div>
                        {lead.type && (
                          <span className="text-xs text-primary-600 bg-primary-50 px-2 py-1 rounded-full">
                            {lead.type}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}