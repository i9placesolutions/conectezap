import { useState } from 'react';
import { Search, Filter, Plus, MessageSquare, Phone } from 'lucide-react';
import { cn } from '../lib/utils';

interface Chat {
  id: string;
  name: string;
  message: string;
  time: string;
  unread: boolean;
  hasAudio?: boolean;
  hasImage?: boolean;
  isGroup?: boolean;
}

export function ChatPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'mine' | 'unassigned'>('all');

  const chats: Chat[] = [
    {
      id: '1',
      name: 'Mateus',
      message: 'Áudio',
      time: '1h',
      unread: true,
      hasAudio: true
    },
    {
      id: '2',
      name: 'Ana Costa',
      message: 'Oi, Leonardo! Aqui é a Ana, como va',
      time: '22h',
      unread: true
    },
    {
      id: '3',
      name: 'Luiza',
      message: 'Imagem',
      time: '22h',
      unread: false,
      hasImage: true
    },
    {
      id: '4',
      name: 'Larissa',
      message: 'Imagem',
      time: '23h',
      unread: false,
      hasImage: true
    }
  ];

  const filteredChats = chats.filter(chat => 
    chat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chat.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-7rem)] flex">
      {/* Left Sidebar - Chat List */}
      <div className="w-96 border-r border-gray-200 bg-white flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <button className="flex items-center gap-2 w-full bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors">
            <Plus className="h-5 w-5" />
            Nova conversa
          </button>
        </div>

        {/* Unread Messages Counter */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2 text-primary-600">
            <MessageSquare className="h-5 w-5" />
            <span className="font-medium">Não lidas</span>
            <span className="bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full text-sm">
              {chats.filter(chat => chat.unread).length}
            </span>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Pesquisar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => setSelectedFilter('all')}
              className={cn(
                "flex-1 px-4 py-1.5 text-sm font-medium rounded-md",
                selectedFilter === 'all' ? "bg-white text-primary-600 shadow" : "text-gray-500 hover:text-gray-900"
              )}
            >
              Todas
            </button>
            <button
              onClick={() => setSelectedFilter('mine')}
              className={cn(
                "flex-1 px-4 py-1.5 text-sm font-medium rounded-md",
                selectedFilter === 'mine' ? "bg-white text-primary-600 shadow" : "text-gray-500 hover:text-gray-900"
              )}
            >
              Minhas
            </button>
            <button
              onClick={() => setSelectedFilter('unassigned')}
              className={cn(
                "flex-1 px-4 py-1.5 text-sm font-medium rounded-md",
                selectedFilter === 'unassigned' ? "bg-white text-primary-600 shadow" : "text-gray-500 hover:text-gray-900"
              )}
            >
              Não atribuídas
            </button>
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {filteredChats.map((chat) => (
            <div
              key={chat.id}
              className="p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-200"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-primary-600 font-medium">
                      {chat.name[0].toUpperCase()}
                    </span>
                  </div>
                  {chat.unread && (
                    <div className="absolute -top-1 -right-1 h-4 w-4 bg-primary-600 rounded-full border-2 border-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900 truncate">{chat.name}</h3>
                    <span className="text-xs text-gray-500">{chat.time}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    {chat.hasAudio && (
                      <div className="flex items-center gap-1">
                        <span>🎵</span>
                        <span>Áudio</span>
                      </div>
                    )}
                    {chat.hasImage && (
                      <div className="flex items-center gap-1">
                        <span>🖼️</span>
                        <span>Imagem</span>
                      </div>
                    )}
                    {!chat.hasAudio && !chat.hasImage && (
                      <p className="truncate">{chat.message}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Side - Chat Area */}
      <div className="flex-1 bg-gray-50 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <Phone className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>Selecione uma conversa para começar</p>
        </div>
      </div>
    </div>
  );
}