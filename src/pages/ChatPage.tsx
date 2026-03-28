import { useState, useEffect, useRef } from 'react';
import { Search, Plus, MessageSquare, Phone, Send, Paperclip, MoreVertical, Clock, Check, CheckCheck, Smartphone, RefreshCw, Archive, User, Wifi, WifiOff, FileText, Tag, Filter, UserCheck, UserX, CheckCircle, Info, Trash2, Ban, MailOpen } from 'lucide-react';
import { cn } from '../lib/utils';
import { uazapiService, Chat as UazapiChat, Label } from '../services/uazapiService';
import { getCurrentServerConfig } from '../services/api';
import { useInstance } from '../contexts/InstanceContext';
import { useMultiAttendance } from '../contexts/MultiAttendanceContext';
import { message, getProfileInfo } from '../lib/wapi/api';
import { toast } from 'react-hot-toast';
import { SelectInstanceModal } from '../components/instance/SelectInstanceModal';
import { useRealTimeChat } from '../hooks/useRealTimeChat';
import { TemplatesModal } from '../components/TemplatesModal';
import { NotesPanel } from '../components/NotesPanel';
import { AssignAgentModal } from '../components/AssignAgentModal';
import { MediaUploadModal } from '../components/MediaUploadModal';
import { MediaRenderer } from '../components/MediaRenderer';
import { LabelsModal } from '../components/LabelsModal';
import { ChatDetailsPanel } from '../components/ChatDetailsPanel'; // ✅ Painel de detalhes do chat
import { useInstanceSecurity } from '../hooks/useInstanceSecurity';

interface QuotedMessage {
  id?: string;
  messageId?: string;
  stanzaId?: string;
  body?: string | object;
  text?: string;
  conversation?: string;
  type?: string;
  pushName?: string;
  participant?: string;
  author?: string;
  fromMe?: boolean;
  timestamp?: number;
  messageTimestamp?: number;
  message?: Record<string, unknown>;
  [key: string]: unknown;
}

interface ChatMessage {
  id: string;
  chatId: string;
  content: string | object;
  timestamp: number;
  fromMe: boolean;
  type: 'text' | 'image' | 'video' | 'audio' | 'ptt' | 'document';
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  author?: string;
  mediaUrl?: string;
  quotedMsg?: QuotedMessage | null;
  reactions?: { [emoji: string]: string[] }; // emoji -> array de usuários que reagiram
}

interface ExtendedChat extends Omit<UazapiChat, 'lastMessage'> {
  lastMessage?: ChatMessage;
  agent?: string; // Nome do agente
  agentId?: string; // ✅ ID do agente para filtros
  status: 'unassigned' | 'assigned' | 'closed';
}

export function ChatPage() {
  const { selectedInstance, setSelectedInstance } = useInstance();
  const { validateInstanceOwnership } = useInstanceSecurity();
  const { 
    isAdministrator, 
    isAgent,
    currentUserId, // ✅ ID do usuário atual
    agents,
    assignments,
    assignChat,
    unassignChat,
    closeChat,
    reopenChat,
    filterByAgent,
    filterByStatus,
    setFilterByAgent,
    setFilterByStatus,
    loadAgents
  } = useMultiAttendance();
  
  const [chats, setChats] = useState<ExtendedChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<ExtendedChat | null>(null);
  const [selectedChatDetails, setSelectedChatDetails] = useState<Record<string, unknown> | null>(null); // ✅ Detalhes completos do chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'mine' | 'unassigned' | 'archived'>('all');
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingChatDetails, setLoadingChatDetails] = useState(false); // ✅ Estado de carregamento dos detalhes
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showInstanceModal, setShowInstanceModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [showLabelsModal, setShowLabelsModal] = useState(false);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [showChatDetailsPanel, setShowChatDetailsPanel] = useState(false); // ✅ Estado para painel de detalhes
  const [showMoreOptionsMenu, setShowMoreOptionsMenu] = useState(false); // ✅ Menu de mais opções
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null); // ID da mensagem para mostrar picker
  const [reactingToMessage, setReactingToMessage] = useState<string | null>(null); // ID da mensagem sendo reagida
  const [labels, setLabels] = useState<Label[]>([]);
  const [labelsLoading, setLabelsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  // ✅ Cache para nomes de contatos com persistência em localStorage
  const CACHE_KEY = 'conectezap_contact_names_cache';
  const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 horas
  
  const [contactNamesCache, setContactNamesCache] = useState<Record<string, { name: string; timestamp: number }>>(() => {
    // Carregar cache do localStorage ao inicializar
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsedCache = JSON.parse(cached);
        const now = Date.now();
        
        // Filtrar entradas expiradas
        const validCache = Object.entries(parsedCache).reduce((acc, [key, value]: [string, unknown]) => {
          const entry = value as { name: string; timestamp: number };
          if (entry.timestamp && (now - entry.timestamp) < CACHE_EXPIRY_MS) {
            acc[key] = entry;
          }
          return acc;
        }, {} as Record<string, { name: string; timestamp: number }>);
        
        console.log('📦 Cache de nomes carregado do localStorage:', Object.keys(validCache).length, 'entradas');
        return validCache;
      }
    } catch (error) {
      console.warn('⚠️ Erro ao carregar cache do localStorage:', error);
    }
    return {};
  });

  // ✅ Persiste cache no localStorage quando atualizado
  useEffect(() => {
    if (Object.keys(contactNamesCache).length > 0) {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(contactNamesCache));
        console.log('💾 Cache de nomes salvo no localStorage:', Object.keys(contactNamesCache).length, 'entradas');
      } catch (error) {
        console.warn('⚠️ Erro ao salvar cache no localStorage:', error);
      }
    }
  }, [contactNamesCache]);

  // ✅ Função para buscar o nome correto do contato com cache persistente
  const getContactName = async (chatId: string, instanceToken?: string): Promise<string> => {
    // Verificar cache primeiro
    const cached = contactNamesCache[chatId];
    if (cached) {
      const now = Date.now();
      // Verificar se o cache ainda é válido (menos de 24h)
      if ((now - cached.timestamp) < CACHE_EXPIRY_MS) {
        console.log('✅ Nome do cache (válido):', cached.name, 'para', chatId);
        return cached.name;
      } else {
        console.log('⏰ Cache expirado para:', chatId);
      }
    }

    try {
      // Extrair número do chatId (remover @s.whatsapp.net se presente)
      const number = chatId.includes('@') ? chatId.split('@')[0] : chatId;
      
      // Buscar informações do perfil
      const profileInfo = await getProfileInfo(number, instanceToken);
      
      if (profileInfo && profileInfo.name && profileInfo.name !== number) {
        // Atualizar cache com timestamp
        const nameData = { name: profileInfo.name, timestamp: Date.now() };
        setContactNamesCache(prev => ({
          ...prev,
          [chatId]: nameData
        }));
        console.log('📝 Nome atualizado no cache:', profileInfo.name, 'para', chatId);
        return profileInfo.name;
      }
    } catch (error) {
      console.warn('⚠️ Erro ao buscar nome do contato:', error);
      
      // ✅ Se falhar mas temos cache expirado, usar mesmo assim
      if (cached) {
        console.log('🔄 Usando cache expirado como fallback:', cached.name);
        return cached.name;
      }
    }

    // Fallback para 'Contato' se não conseguir obter o nome
    return 'Contato';
  };

  // ✅ Função para limpar cache de nomes expirados (manutenção)
  const cleanExpiredCache = () => {
    const now = Date.now();
    const validCache = Object.entries(contactNamesCache).reduce((acc, [key, value]) => {
      if ((now - value.timestamp) < CACHE_EXPIRY_MS) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, { name: string; timestamp: number }>);
    
    const removedCount = Object.keys(contactNamesCache).length - Object.keys(validCache).length;
    if (removedCount > 0) {
      console.log('🧹 Cache limpo:', removedCount, 'entradas expiradas removidas');
      setContactNamesCache(validCache);
    }
  };

  // ✅ Limpar cache expirado ao montar o componente
  useEffect(() => {
    cleanExpiredCache();

    // Limpar cache a cada 1 hora
    const intervalId = setInterval(cleanExpiredCache, 60 * 60 * 1000);

    return () => clearInterval(intervalId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Função para analisar se uma mensagem pode ser uma resposta baseado em padrões
  // Função removida: analyzeIfCouldBeReply - causava detecção incorreta de respostas

  // Sistema de tempo real
  const { isConnected: realtimeConnected } = useRealTimeChat({
    instanceToken: selectedInstance?.token,
    instanceId: selectedInstance?.id,
    onNewMessage: (message) => {
      console.log('📩 Nova mensagem em tempo real:', message);
      
      // Se a mensagem for do chat atualmente selecionado, adicionar às mensagens
      if (selectedChat && message.chatId === selectedChat.id) {
        // Aplicar a mesma lógica de processamento de citações usada no carregamento
        let processedQuotedMsg: QuotedMessage | null = null;
        const msgRecord = message as unknown as Record<string, unknown>;
        const msgMessage = msgRecord.message as Record<string, unknown> | undefined;
        const msgKey = msgRecord.key as Record<string, unknown> | undefined;
        const msgBody = msgRecord.body as Record<string, unknown> | undefined;
        const extTextMsg = msgRecord.extendedTextMessage as Record<string, unknown> | undefined;
        const msgContextInfo = msgRecord.contextInfo as Record<string, unknown> | undefined;
        const extTextMsgInMsg = msgMessage?.extendedTextMessage as Record<string, unknown> | undefined;
        const convInMsg = msgMessage?.conversation as Record<string, unknown> | undefined;
        const keyContextInfo = msgKey?.contextInfo as Record<string, unknown> | undefined;
        const extCtxInfo = extTextMsg?.contextInfo as Record<string, unknown> | undefined;
        const msgCtxInfo = msgContextInfo?.quotedMessage;
        const extMsgCtxInfo = extTextMsgInMsg?.contextInfo as Record<string, unknown> | undefined;
        const convCtxInfo = convInMsg?.contextInfo as Record<string, unknown> | undefined;

        // Verificar todos os campos possíveis onde mensagens citadas podem estar
        const quotedSource = message.quotedMsg ||
                           msgRecord.quoted ||
                           msgRecord.quotedMessage ||
                           msgCtxInfo ||
                           extMsgCtxInfo?.quotedMessage ||
                           convCtxInfo?.quotedMessage ||
                           keyContextInfo?.quotedMessage ||
                           msgRecord.quotedStanzaId ||
                           msgRecord.quotedParticipant ||
                           msgRecord.quotedStanza ||
                           extCtxInfo?.quotedMessage ||
                           (msgBody && typeof msgBody === 'object' && (msgBody as Record<string, unknown>).quotedMessage) ||
                           msgRecord.replyTo ||
                           msgRecord.repliedTo ||
                           msgRecord.inReplyTo ||
                           msgRecord.quotedContent ||
                           msgRecord.quotedText ||
                           msgRecord.quotedBody ||
                           msgRecord.reference ||
                           msgRecord.messageRef ||
                           msgRecord.quotedMessageId ||
                           msgRecord.originalMessage ||
                           msgRecord.parentMessage ||
                           msgMessage?.quotedMessage ||
                           msgMessage?.quoted ||
                           msgMessage?.contextInfo ||
                           msgRecord.stanzaId ||
                           msgRecord.participant ||
                           msgRecord.quotedStanzaId ||
                           (msgKey && msgKey.participant && msgKey.id);
        
        if (quotedSource) {
          console.log('📋 ✅ ENCONTROU mensagem citada em tempo real! Processando:', quotedSource);
          
          const quotedSourceObj = quotedSource as Record<string, unknown>;
          const quotedData = (quotedSourceObj.quotedMessage || quotedSource) as Record<string, unknown>;

          processedQuotedMsg = {
            ...quotedData,
            body: (quotedData.body || quotedData.text || quotedData.conversation) as string | undefined,
            type: (quotedData.type || 'text') as string,
            pushName: (quotedData.pushName || quotedData.participant || quotedData.author) as string | undefined,
            id: (quotedData.id || quotedData.messageId) as string | undefined,
            timestamp: (quotedData.timestamp || quotedData.messageTimestamp) as number | undefined
          };
          
          console.log('✅ Mensagem citada processada em tempo real:', processedQuotedMsg);
        } else {
          console.log('ℹ️ Nenhuma mensagem citada real encontrada em tempo real para:', message.id);
        }
        
        const newMessage: ChatMessage = {
          id: message.id || Date.now().toString(),
          chatId: message.chatId,
          content: message.body || message.content || '',
          timestamp: message.timestamp || Date.now(),
          fromMe: message.fromMe || false,
          type: message.type || 'text',
          author: message.author || message.pushName || (message.fromMe ? 'Você' : 'Contato'),
          mediaUrl: message.mediaUrl,
          quotedMsg: processedQuotedMsg
        };
        
        setMessages(prev => {
          // Evitar duplicatas
          if (prev.some(m => m.id === newMessage.id)) {
            return prev;
          }
          return [...prev, newMessage];
        });
        
        // Se o autor é 'Contato', tentar buscar o nome correto
        if (!message.fromMe && newMessage.author === 'Contato' && selectedInstance?.token) {
          getContactName(message.chatId, selectedInstance.token)
            .then(correctName => {
              if (correctName !== 'Contato') {
                setMessages(prev => prev.map(msg => 
                  msg.id === newMessage.id ? { ...msg, author: correctName } : msg
                ));
              }
            })
            .catch(error => {
              console.warn('Erro ao buscar nome do contato em tempo real:', error);
            });
        }
        
        toast.success('Nova mensagem recebida!');
      }
      
      // Atualizar lista de chats com a nova mensagem
      setChats(prev => prev.map(chat => {
        if (chat.id === message.chatId) {
          return {
            ...chat,
            lastMessage: {
              id: message.id || Date.now().toString(),
              chatId: message.chatId,
              content: message.body || message.content || '',
              timestamp: message.timestamp || Date.now(),
              fromMe: message.fromMe || false,
              type: 'text'
            },
            unreadCount: selectedChat?.id === chat.id ? 0 : (chat.unreadCount || 0) + 1,
            lastMessageTimestamp: message.timestamp || Date.now()
          };
        }
        return chat;
      }));
    },
    onChatUpdate: (chatUpdate) => {
      console.log('💬 Atualização de chat:', chatUpdate);
      // Recarregar chats se necessário
      if (selectedInstance?.token) {
        loadChats();
      }
    },
    onPresenceUpdate: (presence) => {
      console.log('👤 Atualização de presença:', presence);
      // Atualizar status online/offline dos contatos
    },
    onTyping: (typing) => {
      console.log('⌨️ Digitando:', typing);
      // Mostrar indicador de "digitando"
    }
  });

  // Auto-scroll para última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ✅ Abrir modal de instância APENAS na montagem inicial se não houver instância
  // Não abrir novamente ao trocar de aba/voltar para a página
  useEffect(() => {
    // Verificar se é a primeira renderização e não há instância
    const hasNoInstance = !selectedInstance;
    
    if (hasNoInstance) {
      // Aguardar um pequeno delay para garantir que o InstanceContext carregou
      const timer = setTimeout(() => {
        if (!selectedInstance) {
          setShowInstanceModal(true);
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ✅ Array vazio = executa APENAS na montagem

  // Carregar chats quando instância for selecionada
  useEffect(() => {
    if (selectedInstance?.token) {
      loadChats();
      // Configurar atualização automática a cada 30 segundos
      const interval = setInterval(loadChats, 30000);
      return () => clearInterval(interval);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInstance]);

  // Fechar seletor de emojis ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showEmojiPicker && !(event.target as Element).closest('.emoji-picker')) {
        setShowEmojiPicker(null);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showEmojiPicker]);

  // Fechar menu de mais opções ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMoreOptionsMenu && !(event.target as Element).closest('.more-options-menu')) {
        setShowMoreOptionsMenu(false);
      }
    };

    if (showMoreOptionsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMoreOptionsMenu]);

  // Carregar agentes quando o componente monta
  useEffect(() => {
    if (selectedInstance) {
      loadAgents();
    }
  }, [selectedInstance, loadAgents]);

  // Monitorar estado do modal de etiquetas (DEBUG)
  useEffect(() => {
    console.log('🏷️ [ChatPage] Estado showLabelsModal mudou para:', showLabelsModal);
  }, [showLabelsModal]);

  // Funções para gerenciar etiquetas
  const loadLabels = async () => {
    if (!selectedInstance?.token) return;
    
    setLabelsLoading(true);
    try {
      const labelsData = await uazapiService.getLabels(selectedInstance.token);
      console.log('📋 Etiquetas carregadas:', labelsData);
      setLabels(labelsData);
    } catch (error) {
      console.error('Erro ao carregar etiquetas:', error);
      toast.error('Erro ao carregar etiquetas');
    } finally {
      setLabelsLoading(false);
    }
  };

  const handleCreateLabel = async (name: string, color: number) => {
    if (!selectedInstance?.token) return;
    
    try {
      console.log('🏷️ Criando etiqueta:', { name, color });
      // ✅ Criar nova etiqueta usando POST /label/edit com labelid vazio
      const success = await uazapiService.editLabel(
        selectedInstance.token, 
        '', // labelid vazio = criar nova
        name, 
        color, 
        false
      );
      
      if (success) {
        toast.success('Etiqueta criada com sucesso');
        loadLabels();
      } else {
        toast.error('Erro ao criar etiqueta');
      }
    } catch (error) {
      console.error('Erro ao criar etiqueta:', error);
      toast.error('Erro ao criar etiqueta');
    }
  };

  const handleEditLabel = async (labelId: string, name: string, color: number) => {
    if (!selectedInstance?.token) return;
    
    try {
      console.log('✏️ Editando etiqueta:', { labelId, name, color });
      // ✅ Editar etiqueta existente
      const success = await uazapiService.editLabel(
        selectedInstance.token, 
        labelId, 
        name, 
        color, 
        false
      );
      
      if (success) {
        toast.success('Etiqueta atualizada com sucesso');
        loadLabels();
      } else {
        toast.error('Erro ao atualizar etiqueta');
      }
    } catch (error) {
      console.error('Erro ao atualizar etiqueta:', error);
      toast.error('Erro ao atualizar etiqueta');
    }
  };

  const handleDeleteLabel = async (labelId: string) => {
    if (!selectedInstance?.token) return;
    
    try {
      console.log('🗑️ Deletando etiqueta:', labelId);
      // ✅ Deletar etiqueta usando delete=true
      const success = await uazapiService.editLabel(
        selectedInstance.token, 
        labelId, 
        '', // nome vazio quando deletando
        0,  // cor 0 quando deletando
        true // delete=true
      );
      
      if (success) {
        toast.success('Etiqueta excluída com sucesso');
        loadLabels();
      } else {
        toast.error('Erro ao excluir etiqueta');
      }
    } catch (error) {
      console.error('Erro ao excluir etiqueta:', error);
      toast.error('Erro ao excluir etiqueta');
    }
  };

  // Funções para gerenciar atribuições
  const handleAssignAgent = async (agentId: string, agentName: string) => {
    if (!selectedChat) return;
    
    try {
      await assignChat(selectedChat.id, agentId);
      
      // Atualizar o chat local
      setChats(prev => prev.map(chat => 
        chat.id === selectedChat.id 
          ? { ...chat, agent: agentName, status: 'assigned' as const }
          : chat
      ));
      
      setSelectedChat(prev => prev ? { ...prev, agent: agentName, status: 'assigned' } : null);
      setShowAssignModal(false);
    } catch (error) {
      console.error('Erro ao atribuir agente:', error);
    }
  };

  const handleUnassignChat = async () => {
    if (!selectedChat) return;
    
    try {
      await unassignChat(selectedChat.id);
      
      // Atualizar o chat local
      setChats(prev => prev.map(chat => 
        chat.id === selectedChat.id 
          ? { ...chat, agent: undefined, status: 'unassigned' as const }
          : chat
      ));
      
      setSelectedChat(prev => prev ? { ...prev, agent: undefined, status: 'unassigned' } : null);
      toast.success('Chat desatribuído com sucesso');
    } catch (error) {
      console.error('Erro ao desatribuir chat:', error);
    }
  };

  const handleCloseChat = async () => {
    if (!selectedChat) return;
    
    try {
      await closeChat(selectedChat.id, 'Atendimento finalizado');
      
      // Atualizar o chat local
      setChats(prev => prev.map(chat => 
        chat.id === selectedChat.id 
          ? { ...chat, status: 'closed' as const }
          : chat
      ));
      
      setSelectedChat(prev => prev ? { ...prev, status: 'closed' } : null);
      toast.success('Atendimento finalizado com sucesso');
    } catch (error) {
      console.error('Erro ao fechar atendimento:', error);
    }
  };

  const handleReopenChat = async () => {
    if (!selectedChat) return;
    
    try {
      await reopenChat(selectedChat.id);
      
      // Atualizar o chat local
      setChats(prev => prev.map(chat => 
        chat.id === selectedChat.id 
          ? { ...chat, status: 'unassigned' as const }
          : chat
      ));
      
      setSelectedChat(prev => prev ? { ...prev, status: 'unassigned' } : null);
      toast.success('Atendimento reaberto com sucesso');
    } catch (error) {
      console.error('Erro ao reabrir atendimento:', error);
    }
  };

  // ✅ Arquivar/Desarquivar conversa (toggle)
  const handleToggleArchiveChat = async () => {
    if (!selectedChat || !selectedInstance?.token) return;
    
    const isCurrentlyArchived = selectedChat.isArchived || false;
    const action = isCurrentlyArchived ? 'desarquivando' : 'arquivando';
    
    try {
      console.log(`📦 ${action} conversa:`, selectedChat.name);
      
      // Extrair número do chat ID
      const number = selectedChat.id.includes('@') ? selectedChat.id.split('@')[0] : selectedChat.id;
      
      // Chamar API para arquivar/desarquivar
      await uazapiService.archiveChat(selectedInstance.token, number, !isCurrentlyArchived);
      
      // Atualizar o chat localmente
      setChats(prev => prev.map(chat => 
        chat.id === selectedChat.id 
          ? { ...chat, isArchived: !isCurrentlyArchived }
          : chat
      ));
      
      // Atualizar chat selecionado
      setSelectedChat(prev => prev ? { ...prev, isArchived: !isCurrentlyArchived } : null);
      
      toast.success(isCurrentlyArchived ? 'Conversa desarquivada com sucesso' : 'Conversa arquivada com sucesso');
    } catch (error) {
      console.error(`❌ Erro ao ${action} conversa:`, error);
      toast.error(`Erro ao ${action} conversa`);
    }
  };

  // ✅ Desarquivar conversa
  const handleUnarchiveChat = async (chat: ExtendedChat) => {
    if (!selectedInstance?.token) return;
    
    try {
      console.log('📂 Desarquivando conversa:', chat.name);
      
      // Extrair número do chat ID
      const number = chat.id.includes('@') ? chat.id.split('@')[0] : chat.id;
      
      // Chamar API para desarquivar (endpoint: POST /chat/archive com archive=false)
      await uazapiService.archiveChat(selectedInstance.token, number, false);
      
      // Atualizar o chat localmente removendo flag de arquivado
      setChats(prev => prev.map(c => 
        c.id === chat.id 
          ? { ...c, isArchived: false }
          : c
      ));
      
      toast.success('Conversa desarquivada com sucesso');
    } catch (error) {
      console.error('❌ Erro ao desarquivar conversa:', error);
      toast.error('Erro ao desarquivar conversa');
    }
  };

  // ✅ Bloquear contato
  const handleBlockContact = async () => {
    if (!selectedChat || !selectedInstance?.token) return;
    
    if (!confirm(`Deseja realmente bloquear ${selectedChat.name}?`)) return;
    
    try {
      console.log('🚫 Bloqueando contato:', selectedChat.name);
      
      const number = selectedChat.id.includes('@') ? selectedChat.id.split('@')[0] : selectedChat.id;
      
      // Chamar API para bloquear
      await uazapiService.blockContact(selectedInstance.token, number, true);
      
      toast.success('Contato bloqueado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao bloquear contato:', error);
      toast.error('Erro ao bloquear contato');
    }
  };

  // ✅ Marcar como não lido
  const handleMarkAsUnread = async () => {
    if (!selectedChat || !selectedInstance?.token) return;
    
    try {
      console.log('📬 Marcando como não lido:', selectedChat.name);
      
      // Atualizar localmente
      setChats(prev => prev.map(chat => 
        chat.id === selectedChat.id 
          ? { ...chat, unreadCount: (chat.unreadCount || 0) + 1 }
          : chat
      ));
      
      toast.success('Marcado como não lido');
    } catch (error) {
      console.error('❌ Erro ao marcar como não lido:', error);
      toast.error('Erro ao marcar como não lido');
    }
  };

  // ✅ Limpar conversa
  const handleClearChat = async () => {
    if (!selectedChat || !selectedInstance?.token) return;
    
    if (!confirm(`Deseja realmente limpar todas as mensagens de ${selectedChat.name}? Esta ação não pode ser desfeita.`)) return;
    
    try {
      console.log('🗑️ Limpando conversa:', selectedChat.name);
      
      // Limpar mensagens localmente
      setMessages([]);
      
      toast.success('Conversa limpa com sucesso');
    } catch (error) {
      console.error('❌ Erro ao limpar conversa:', error);
      toast.error('Erro ao limpar conversa');
    }
  };

  const loadChats = async () => {
    if (!selectedInstance?.token) return;

    try {
      // 👑 SUPER ADMIN: Bypass validação de ownership
      if (!isAdministrator) {
        // SEGURANÇA: Validar ownership da instância (apenas para usuários normais)
        const isValid = await validateInstanceOwnership(selectedInstance.token);
        if (!isValid) {
          console.error('🚫 ACESSO NEGADO: Instância não pertence ao usuário');
          toast.error('Acesso negado: você não tem permissão para esta instância');
          setSelectedInstance(null);
          return;
        }
        console.log('✅ Validação de ownership: APROVADA (usuário normal)');
      } else {
        console.log('👑 SUPER ADMIN - Acesso PERMITIDO sem validação de ownership');
      }

      setLoading(true);
      console.log('🔍 CARREGANDO CHATS - DIAGNÓSTICO COMPLETO');
      console.log('🔍 Instância selecionada:', selectedInstance.name);
      const instanceToken = selectedInstance.token;
      console.log('🔍 Token:', instanceToken.substring(0, 10) + '...');
      
      // Diagnóstico da URL base
      const currentServer = getCurrentServerConfig();
      console.log('🔍 Servidor atual configurado:', {
        url: currentServer?.url,
        isDefault: currentServer?.url === 'https://uazapi.dev'
      });
      
      // Buscar conversas reais da API
      const apiChats = await uazapiService.searchChats(instanceToken, {
        limit: 50,
        includeLastMessage: true
      });

      console.log('📱 Chats carregados da API:', apiChats.length);

      if (apiChats.length === 0) {
        console.log('⚠️ Nenhuma conversa encontrada na API');
        setChats([]);
        return;
      }

      // Usar dados REAIS da API, não fictícios
      const extendedChats: ExtendedChat[] = apiChats.map(chat => {
        // Verificar se existe atribuição para este chat
        const assignment = assignments.find(a => a.chatId === chat.id && a.status !== 'closed');
        const agent = assignment ? agents.find(a => a.id === assignment.agentId) : undefined;
        
        // Determinar status baseado nas atribuições
        let status: 'unassigned' | 'assigned' | 'closed' = 'unassigned';
        if (assignment) {
          status = assignment.status;
        } else if (chat.unreadCount === 0) {
          // Se não tem mensagens não lidas e não está atribuído, pode estar fechado
          status = 'unassigned';
        }

        return {
          ...chat,
          status,
          agent: agent?.name, // Nome do agente atribuído
          agentId: agent?.id, // ✅ ID do agente para filtros
          // Se a API não retornou lastMessage, criar uma baseada no timestamp
          lastMessage: chat.lastMessage ? {
            id: chat.lastMessage.id,
            chatId: chat.lastMessage.chatId,
            content: chat.lastMessage.body || chat.lastMessage.type || '[Mídia]',
            timestamp: chat.lastMessage.timestamp,
            fromMe: chat.lastMessage.fromMe,
            type: chat.lastMessage.type as 'text' | 'image' | 'audio' | 'document',
            status: chat.lastMessage.fromMe ? 'delivered' : undefined,
            author: chat.lastMessage.author || chat.lastMessage.pushName,
            mediaUrl: chat.lastMessage.mediaUrl,
            quotedMsg: chat.lastMessage.quotedMsg
          } : {
            id: `${chat.id}_last`,
            chatId: chat.id,
            content: 'Sem mensagens recentes',
            timestamp: chat.lastMessageTimestamp || Date.now(),
            fromMe: false,
            type: 'text' as const,
            status: undefined
          }
        };
      });

      // Ordenar por timestamp da última mensagem (mais recentes primeiro)
      extendedChats.sort((a, b) => {
        const timestampA = a.lastMessage?.timestamp || a.lastMessageTimestamp || 0;
        const timestampB = b.lastMessage?.timestamp || b.lastMessageTimestamp || 0;
        return timestampB - timestampA;
      });

      console.log('✅ Chats processados e ordenados:', extendedChats.length);
      if (extendedChats.length > 0) {
        console.log('📨 Primeiro chat (exemplo):', {
          name: extendedChats[0].name,
          id: extendedChats[0].id.substring(0, 10) + '...',
          lastMessage: typeof extendedChats[0].lastMessage?.content === 'string' ? extendedChats[0].lastMessage.content.substring(0, 50) + '...' : '[Mídia]',
          timestamp: new Date(extendedChats[0].lastMessage?.timestamp || 0).toLocaleString()
        });
      }

      setChats(extendedChats);
      
      // ✅ Pré-carregar nomes de contatos em lote (background)
      preloadContactNames(extendedChats, instanceToken);
      
      // Se não há chat selecionado e temos chats, selecionar o primeiro
      if (!selectedChat && extendedChats.length > 0) {
        handleSelectChat(extendedChats[0]);
      }
      
    } catch (error) {
      console.error('❌ Erro ao carregar chats:', error);
      setChats([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Função para pré-carregar nomes de contatos em lote (background)
  const preloadContactNames = async (chats: ExtendedChat[], instanceToken: string) => {
    console.log('🔄 Iniciando pré-carregamento de nomes de contatos...');
    
    // Filtrar apenas chats que não têm nome em cache
    const chatsToLoad = chats.filter(chat => !contactNamesCache[chat.id]);
    
    if (chatsToLoad.length === 0) {
      console.log('✅ Todos os nomes já estão em cache');
      return;
    }
    
    console.log(`📥 Pré-carregando ${chatsToLoad.length} nomes de contatos...`);
    
    // Processar em lotes de 5 para não sobrecarregar a API
    const batchSize = 5;
    let loadedCount = 0;
    
    for (let i = 0; i < chatsToLoad.length; i += batchSize) {
      const batch = chatsToLoad.slice(i, i + batchSize);
      
      const namePromises = batch.map(async (chat) => {
        try {
          const name = await getContactName(chat.id, instanceToken);
          if (name !== 'Contato') {
            loadedCount++;
          }
          return { chatId: chat.id, name };
        } catch (error) {
          console.warn(`⚠️ Erro ao pré-carregar nome de ${chat.id}:`, error);
          return { chatId: chat.id, name: 'Contato' };
        }
      });
      
      await Promise.all(namePromises);
      
      // Pequena pausa entre lotes para não sobrecarregar
      if (i + batchSize < chatsToLoad.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    console.log(`✅ Pré-carregamento concluído: ${loadedCount}/${chatsToLoad.length} nomes obtidos`);
  };

  const loadMessages = async (chat: ExtendedChat) => {
    if (!selectedInstance?.token) return;

    try {
      // 👑 SUPER ADMIN: Bypass validação de ownership
      if (!isAdministrator) {
        // SEGURANÇA: Validar ownership da instância (apenas para usuários normais)
        const isValid = await validateInstanceOwnership(selectedInstance.token);
        if (!isValid) {
          console.error('🚫 ACESSO NEGADO: Instância não pertence ao usuário');
          toast.error('Acesso negado: você não tem permissão para esta instância');
          return;
        }
        console.log('✅ Validação de ownership: APROVADA (usuário normal)');
      } else {
        console.log('👑 SUPER ADMIN - Acesso PERMITIDO sem validação de ownership');
      }

      setLoadingMessages(true);
      console.log('💬 Carregando mensagens do chat:', chat.name, 'ID:', chat.id);

      // Buscar mensagens reais da API
      const instanceToken = selectedInstance.token;
      const apiMessages = await uazapiService.searchMessages(instanceToken, {
        chatid: chat.id,
        limit: 50
      });

      console.log('📨 Mensagens carregadas da API:', apiMessages.length);

      if (apiMessages.length === 0) {
        console.log('⚠️ Nenhuma mensagem encontrada para o chat:', chat.name);
        // Mostrar mensagem explicativa se não houver mensagens
        const placeholderMessage: ChatMessage = {
          id: 'placeholder_' + Date.now(),
          chatId: chat.id,
          content: 'Esta conversa ainda não possui mensagens ou as mensagens não puderam ser carregadas.',
          timestamp: Date.now(),
          fromMe: false,
          type: 'text',
          author: 'Sistema'
        };
        setMessages([placeholderMessage]);
        return;
      }

      // Mapear mensagens da API para formato local
      const chatMessages: ChatMessage[] = apiMessages.map(msg => {
        console.log('🔄 Processando mensagem da API:', {
          id: msg.id,
          type: msg.type,
          bodyType: typeof msg.body,
          hasMediaUrl: !!msg.mediaUrl,
          body: msg.body
        });
        
        // Tratar msg.body de forma segura e determinar o tipo correto
        let content = '';
        let messageType = msg.type || 'text';
        let mediaUrl = msg.mediaUrl;
        
        if (typeof msg.body === 'string') {
          // Mensagem de texto normal
          content = msg.body;
          messageType = 'text';
        } else if (typeof msg.body === 'object' && msg.body !== null) {
          // Mensagem de mídia - msg.body contém metadados da mídia
          const mediaObj = msg.body as Record<string, unknown>;
          
          console.log('📎 Processando mídia:', {
            messageId: msg.id,
            mediaObj: mediaObj,
            originalType: msg.type,
            hasCaption: !!mediaObj.caption,
            hasFileName: !!mediaObj.fileName,
            hasMimetype: !!mediaObj.mimetype
          });
          
          // Determinar tipo baseado no mimetype se disponível
          if (mediaObj.mimetype) {
            const mimetype = String(mediaObj.mimetype);
            if (mimetype.startsWith('image/')) {
              messageType = 'image';
            } else if (mimetype.startsWith('video/')) {
              messageType = 'video';
            } else if (mimetype.startsWith('audio/')) {
              // Verificar se é PTT (push-to-talk) ou áudio normal
              messageType = mediaObj.isPtt || msg.type === 'ptt' ? 'ptt' : 'audio';
            } else {
              messageType = 'document';
            }
          } else if (msg.type) {
            // Usar o tipo original se não há mimetype
            messageType = msg.type;
          }
          
          // Definir conteúdo baseado no que está disponível
          if (mediaObj.caption) {
            content = String(mediaObj.caption);
          } else if (mediaObj.fileName) {
            content = String(mediaObj.fileName);
          } else {
            // Conteúdo padrão baseado no tipo
            switch (messageType) {
              case 'image': content = 'Imagem'; break;
              case 'video': content = 'Vídeo'; break;
              case 'audio': content = 'Áudio'; break;
              case 'ptt': content = 'Mensagem de voz'; break;
              case 'document': content = 'Documento'; break;
              default: content = 'Mídia';
            }
          }
          
          // Garantir que temos mediaUrl para mídias
          if (!mediaUrl && mediaObj.url) {
            mediaUrl = mediaObj.url;
          }
          
        } else {
          // Fallback para outros casos
          content = msg.type || 'Mensagem';
          messageType = msg.type || 'text';
        }

        console.log('✅ Mensagem processada:', {
          id: msg.id,
          finalType: messageType,
          finalContent: content.substring(0, 50) + '...',
          hasMediaUrl: !!mediaUrl
        });

        // Processar mensagem citada de forma simplificada
        let processedQuotedMsg = null;
        
        // Usar diretamente o campo quotedMsg que já vem processado do serviço
        if (msg.quotedMsg) {
          console.log('📋 ✅ MENSAGEM CITADA ENCONTRADA:', {
            messageId: msg.id,
            quotedMsg: msg.quotedMsg
          });
          
          processedQuotedMsg = {
            id: msg.quotedMsg.id || 'quoted_' + Date.now(),
            body: msg.quotedMsg.body || msg.quotedMsg.text || msg.quotedMsg.conversation || 'Mensagem citada',
            type: msg.quotedMsg.type || 'text',
            pushName: msg.quotedMsg.pushName || msg.quotedMsg.participant || msg.quotedMsg.author || 'Contato',
            fromMe: msg.quotedMsg.fromMe || false,
            timestamp: msg.quotedMsg.timestamp || msg.quotedMsg.messageTimestamp || Date.now()
          };
          
          console.log('✅ Mensagem citada processada:', processedQuotedMsg);
        }


        return {
          id: msg.id,
          chatId: msg.chatId,
          content,
          timestamp: msg.timestamp,
          fromMe: msg.fromMe,
          type: messageType as 'text' | 'image' | 'video' | 'audio' | 'ptt' | 'document',
          status: msg.fromMe ? 'delivered' : undefined,
          author: msg.author || msg.pushName || (msg.fromMe ? 'Você' : 'Contato'),
          mediaUrl: mediaUrl,
          quotedMsg: processedQuotedMsg
        };
      });

      // Ordenar mensagens por timestamp
      chatMessages.sort((a, b) => a.timestamp - b.timestamp);

      console.log('✅ Mensagens processadas:', chatMessages.length);
      
      // Debug de mensagens citadas
      const quotedMessagesCount = chatMessages.filter(msg => msg.quotedMsg).length;
      console.log('💬 ==== RELATÓRIO DE MENSAGENS CITADAS ====');
      console.log('📊 TOTAL de mensagens com citações encontradas:', quotedMessagesCount);
      
      if (quotedMessagesCount > 0) {
        const quotedMessages = chatMessages.filter(msg => msg.quotedMsg);
        console.log('📋 Lista de mensagens com citações:');
        quotedMessages.forEach((msg, index) => {
          const contentPreview = typeof msg.content === 'string' ? msg.content.substring(0, 30) : '[Mídia]';
          console.log(`   ${index + 1}. ${contentPreview}... (ID: ${msg.id})`);
        });
        console.log('🎨 ✅ ESSAS MENSAGENS APARECERÃO COM VISUAL DE RESPOSTA NO WHATSAPP!');
        console.log('🔍 Detalhes das primeiras citações:', quotedMessages.slice(0, 2));
      } else {
        console.log('⚠️ NENHUMA mensagem com citação encontrada');
        console.log('💡 Dicas para debug:');
        console.log('   1. Verifique se as mensagens são realmente respostas');
        console.log('   2. Teste o botão "🧪 Testar Respostas" para ver o visual');
        console.log('   3. Analise os logs detalhados de cada mensagem processada');
      }
      console.log('==========================================');
      
      setMessages(chatMessages);
      
      // Buscar nomes corretos dos contatos para mensagens que não têm author/pushName
      const messagesToUpdate = chatMessages.filter(msg => 
        !msg.fromMe && msg.author === 'Contato' && selectedInstance?.token
      );
      
      if (messagesToUpdate.length > 0) {
        console.log(`🔍 Buscando nomes corretos para ${messagesToUpdate.length} contatos...`);
        
        // Buscar nomes em paralelo (limitado para não sobrecarregar a API)
        const batchSize = 5;
        for (let i = 0; i < messagesToUpdate.length; i += batchSize) {
          const batch = messagesToUpdate.slice(i, i + batchSize);
          
          const namePromises = batch.map(async (msg) => {
            try {
              const correctName = await getContactName(msg.chatId, selectedInstance.token);
              return { messageId: msg.id, correctName };
            } catch (error) {
              console.warn(`Erro ao buscar nome para ${msg.chatId}:`, error);
              return { messageId: msg.id, correctName: 'Contato' };
            }
          });
          
          const results = await Promise.all(namePromises);
          
          // Atualizar mensagens com nomes corretos
          setMessages(prev => prev.map(msg => {
            const result = results.find(r => r.messageId === msg.id);
            if (result && result.correctName !== 'Contato') {
              return { ...msg, author: result.correctName };
            }
            return msg;
          }));
          
          // Pequena pausa entre batches para não sobrecarregar a API
          if (i + batchSize < messagesToUpdate.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        
        console.log('✅ Nomes dos contatos atualizados');
      }
      
    } catch (error) {
      console.error('❌ Erro ao carregar mensagens:', error);
      toast.error('Erro ao carregar mensagens da conversa');
      
      // Mostrar mensagem de erro
      const errorMessage: ChatMessage = {
        id: 'error_' + Date.now(),
        chatId: chat.id,
        content: 'Erro ao carregar mensagens desta conversa. Tente novamente mais tarde.',
        timestamp: Date.now(),
        fromMe: false,
        type: 'text',
        author: 'Sistema'
      };
      setMessages([errorMessage]);
    } finally {
      setLoadingMessages(false);
    }
  };

  /**
   * Carregar detalhes completos de um chat
   * Usa o endpoint POST /chat/details para obter mais de 60 campos
   */
  const loadChatDetails = async (chat: ExtendedChat) => {
    if (!selectedInstance?.token) return;

    try {
      setLoadingChatDetails(true);
      console.log('📋 Carregando detalhes completos do chat:', chat.name);

      // Extrair número do chat ID
      const number = chat.id.includes('@') ? chat.id.split('@')[0] : chat.id;

      // Buscar detalhes completos (preview = false para imagem full)
      const details = await uazapiService.getChatDetails(selectedInstance.token, number, false);

      console.log('✅ Detalhes carregados:', {
        name: details.name || details.wa_name,
        isGroup: details.wa_isGroup,
        isBusiness: details.wa_isBusiness,
        isBlocked: details.wa_isBlocked,
        fields: Object.keys(details).length
      });

      setSelectedChatDetails(details);
    } catch (error) {
      console.error('❌ Erro ao carregar detalhes do chat:', error);
      // Não mostrar toast de erro aqui, pois não é crítico
      setSelectedChatDetails(null);
    } finally {
      setLoadingChatDetails(false);
    }
  };

  const handleSelectChat = async (chat: ExtendedChat) => {
    console.log('🎯 CHAT SELECIONADO:', chat.name);
    setSelectedChat(chat);
    
    // ✅ Carregar detalhes completos do chat
    await loadChatDetails(chat);
    
    // Marcar chat como lido ao selecionar (funcionalidade opcional)
    if (selectedInstance && selectedInstance.token && chat.id) {
      try {
        console.log('📖 Tentando marcar chat como lido:', {
          chatId: chat.id,
          chatName: chat.name,
          isGroup: chat.isGroup
        });
        
        // TEMPORARIAMENTE DESABILITADO: markChatAsRead devido a erro 500 da API
        // Executar em background sem aguardar para não bloquear o fluxo
        const token = selectedInstance.token;
        const chatId = chat.id;
        if (token && chatId && typeof token === 'string' && typeof chatId === 'string') {
          // FUNÇÃO TEMPORARIAMENTE DESABILITADA DEVIDO A ERRO 500 NO SERVIDOR UAZAPI
          console.log('⚠️ markChatAsRead TEMPORARIAMENTE DESABILITADO devido a erro 500 da API');
          console.log('📖 Chat selecionado:', { chatId, chatName: chat.name, isGroup: chat.isGroup });
          
          // TODO: Reabilitar quando o servidor UAZAPI corrigir o erro 500
          /*
          uazapiService.markChatAsRead(token, chatId, true)
            .then((result) => {
              if (result) {
                console.log('✅ Chat marcado como lido com sucesso');
              } else {
                console.warn('⚠️ Falha ao marcar chat como lido');
              }
            })
            .catch((error) => {
              console.warn('⚠️ Erro ao marcar chat como lido (não crítico):', error.message);
              // Erro não crítico - não mostrar para o usuário
            });
          */
        }
        
      } catch (error) {
        console.warn('⚠️ Erro ao iniciar marcação como lido:', error);
        // Continuar mesmo se der erro
      }
    }
    
    // Atualizar contagem de não lidas localmente
    setChats(prev => prev.map(c => 
      c.id === chat.id ? { ...c, unreadCount: 0 } : c
    ));
    
    // Carregar mensagens do chat
    loadMessages(chat);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !selectedInstance?.token) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSendingMessage(true);

    // Adicionar mensagem otimisticamente
    const tempMessage: ChatMessage = {
      id: Date.now().toString(),
      chatId: selectedChat.id,
      content: messageContent,
      timestamp: Date.now(),
      fromMe: true,
      type: 'text',
      status: 'sending',
      quotedMsg: replyingToMessage ? {
        id: replyingToMessage.id,
        body: replyingToMessage.content,
        type: replyingToMessage.type,
        pushName: replyingToMessage.author || 'Você',
        fromMe: replyingToMessage.fromMe
      } : undefined
    };

    setMessages(prev => [...prev, tempMessage]);

    try {
      console.log('📤 Enviando mensagem para:', selectedChat.name);
      
      const instanceToken = selectedInstance.token;
      
      // Se está respondendo a uma mensagem, usar endpoint de reply
      if (replyingToMessage) {
        console.log('💬 Respondendo à mensagem:', replyingToMessage.id);
        
        // Usar a função reply da API
        await message.reply(
          selectedChat.id,
          messageContent,
          replyingToMessage.id,
          {},
          instanceToken
        );
        
        // Limpar estado de resposta
        setReplyingToMessage(null);
      } else {
        // Enviar mensagem normal
        await uazapiService.sendSimpleMessage(instanceToken, {
          number: selectedChat.id,
          message: messageContent,
          type: 'text'
        });
      }

      // Atualizar status da mensagem
      setMessages(prev => prev.map(msg => 
        msg.id === tempMessage.id 
          ? { ...msg, status: 'sent' as const }
          : msg
      ));

      console.log('✅ Mensagem enviada com sucesso');
      toast.success('Mensagem enviada');

      // Focar input novamente
      messageInputRef.current?.focus();

    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem');
      
      // Remover mensagem em caso de erro
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      
      // Limpar estado de resposta em caso de erro
      setReplyingToMessage(null);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSelectTemplate = (template: { content: string }) => {
    setNewMessage(template.content);
    setShowTemplatesModal(false);
    // Focar no input após aplicar template
    setTimeout(() => {
      messageInputRef.current?.focus();
    }, 100);
  };

  const handleReplyToMessage = (message: ChatMessage) => {
    setReplyingToMessage(message);
    messageInputRef.current?.focus();
  };

  const handleCancelReply = () => {
    setReplyingToMessage(null);
  };

  // Funções para reações
  const handleReactToMessage = async (messageId: string, emoji: string) => {
    if (!selectedInstance?.token || !selectedChat) {
      toast.error('Instância ou chat não selecionado');
      return;
    }

    setReactingToMessage(messageId);
    
    try {
      const success = await uazapiService.reactToMessage(
        selectedInstance.token,
        selectedChat.id,
        messageId,
        emoji
      );

      if (success) {
        // Atualizar localmente a reação
        setMessages(prevMessages => 
          prevMessages.map(msg => {
            if (msg.id === messageId) {
              const reactions = { ...msg.reactions };
              if (!reactions[emoji]) {
                reactions[emoji] = [];
              }
              
              // Verificar se o usuário já reagiu com este emoji
              const userIndex = reactions[emoji].indexOf('Você');
              if (userIndex === -1) {
                reactions[emoji].push('Você');
              } else {
                // Se já reagiu, remover a reação
                reactions[emoji].splice(userIndex, 1);
                if (reactions[emoji].length === 0) {
                  delete reactions[emoji];
                }
              }
              
              return { ...msg, reactions };
            }
            return msg;
          })
        );
        
        toast.success('Reação enviada!');
      } else {
        toast.error('Erro ao enviar reação');
      }
    } catch (error) {
      console.error('Erro ao reagir à mensagem:', error);
      toast.error('Erro ao enviar reação');
    } finally {
      setReactingToMessage(null);
      setShowEmojiPicker(null);
    }
  };

  const toggleEmojiPicker = (messageId: string) => {
    setShowEmojiPicker(showEmojiPicker === messageId ? null : messageId);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffHours < 24) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  };

  const getMessageIcon = (status?: string) => {
    switch (status) {
      case 'sending':
        return <Clock className="h-3 w-3 text-gray-400" />;
      case 'sent':
        return <Check className="h-3 w-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      default:
        return null;
    }
  };

  // Função para rolar até uma mensagem específica
  const scrollToMessage = (messageId: string) => {
    console.log('🎯 Procurando mensagem:', messageId);
    
    // Encontrar o elemento da mensagem pelo ID
    const messageElement = document.getElementById(`message-${messageId}`);
    
    if (messageElement) {
      console.log('✅ Mensagem encontrada! Rolando...');
      
      // Rolar suavemente até a mensagem
      messageElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      
      // Destacar a mensagem temporariamente
      messageElement.classList.add('bg-yellow-100', 'ring-2', 'ring-yellow-400');
      
      // Remover destaque após 2 segundos
      setTimeout(() => {
        messageElement.classList.remove('bg-yellow-100', 'ring-2', 'ring-yellow-400');
      }, 2000);
      
      toast.success('Mensagem original encontrada!');
    } else {
      console.warn('⚠️ Mensagem original não encontrada no chat atual');
      toast.error('Mensagem original não está mais disponível');
    }
  };

  // Função para renderizar mensagem citada/de resposta - estilo WhatsApp Web
  const renderQuotedMessage = (quotedMsg: QuotedMessage, isFromMe: boolean) => {
    if (!quotedMsg) {
      console.log('❌ renderQuotedMessage chamada com quotedMsg vazio');
      return null;
    }

    console.log('💬 ✅ RENDERIZANDO MENSAGEM CITADA!', {
      quotedMsg,
      isFromMe,
      hasBody: !!quotedMsg.body,
      hasPushName: !!quotedMsg.pushName
    });

    // Extrair informações da mensagem citada
    const quotedContent = getQuotedMessageContent(quotedMsg);
    const quotedAuthor = quotedMsg.pushName || quotedMsg.participant || quotedMsg.author || 'Você';
    
    // Determinar se a mensagem citada é de mídia
    const isQuotedMedia = quotedMsg.type && quotedMsg.type !== 'text';
    
    return (
      <button
        onClick={() => {
          // Tentar encontrar a mensagem original pelo ID
          const originalMessageId = quotedMsg.id || quotedMsg.messageId || quotedMsg.stanzaId;
          if (originalMessageId) {
            scrollToMessage(originalMessageId);
          } else {
            console.warn('⚠️ ID da mensagem citada não encontrado:', quotedMsg);
            toast.error('Não foi possível localizar a mensagem original');
          }
        }}
        className={cn(
          "flex items-start gap-2 w-full text-left p-2 rounded-lg transition-all",
          "hover:bg-black/5 active:bg-black/10 cursor-pointer",
          isFromMe && "hover:bg-white/10 active:bg-white/20"
        )}
        title="Clique para ir até a mensagem original"
      >
        {/* Linha indicadora vertical */}
        <div className={cn(
          "w-1 h-full min-h-[40px] rounded-full flex-shrink-0",
          isFromMe ? "bg-white/60" : "bg-green-500"
        )} />
        
        <div className="flex-1 min-w-0">
          {/* Nome do autor com cores do WhatsApp Web */}
          <div className={cn(
            "text-xs font-medium mb-1 truncate",
            isFromMe 
              ? "text-white/90" 
              : quotedAuthor === 'Você' 
                ? "text-green-600" 
                : "text-blue-600"
          )}>
            {quotedAuthor}
          </div>
          
          {/* Conteúdo da mensagem */}
          <div className={cn(
            "text-sm leading-relaxed",
            isFromMe ? "text-white/80" : "text-gray-700"
          )}>
            {/* Se é mídia, mostrar ícone + tipo */}
            {isQuotedMedia ? (
              <div className="flex items-center gap-2">
                <span className="text-base">{getMediaIcon(quotedMsg.type)}</span>
                <span className={cn(
                  "italic",
                  isFromMe ? "text-white/70" : "text-gray-500"
                )}>
                  {getMediaTypeName(quotedMsg.type)}
                  {quotedContent !== getMediaTypeName(quotedMsg.type) && (
                    <span className={cn(
                      "block text-xs mt-1",
                      isFromMe ? "text-white/80" : "text-gray-600"
                    )}>
                      {quotedContent}
                    </span>
                  )}
                </span>
              </div>
            ) : (
              /* Mensagem de texto com estilo WhatsApp Web */
              <div
                className={cn(
                  "break-words font-normal line-clamp-2",
                  isFromMe ? "text-white/85" : "text-gray-700"
                )}
              >
                {quotedContent}
              </div>
            )}
          </div>
        </div>
      </button>
    );
  };

  // Função para extrair conteúdo da mensagem citada - melhorada para API UAZAPI
  const getQuotedMessageContent = (quotedMsg: QuotedMessage | string | unknown): string => {
    console.log('🔍 Extraindo conteúdo da mensagem citada:', quotedMsg);
    
    // Se é string simples, retornar diretamente
    if (typeof quotedMsg === 'string') {
      return quotedMsg;
    }

    // Se não é objeto, tentar converter
    if (!quotedMsg || typeof quotedMsg !== 'object') {
      return String(quotedMsg || 'Mensagem');
    }

    // A partir daqui, quotedMsg é um objeto - usar como Record para acesso seguro
    const msg = quotedMsg as Record<string, unknown>;

    // Prioridade 1: Campo body (mais comum na UAZAPI)
    if (msg.body) {
      if (typeof msg.body === 'string') {
        return msg.body;
      }

      // Se body é um objeto (mensagem de mídia)
      if (typeof msg.body === 'object' && msg.body !== null) {
        const mediaObj = msg.body as Record<string, unknown>;

        // Para mídia com legenda
        if (mediaObj.caption) {
          return String(mediaObj.caption);
        }

        // Para documentos com nome
        if (mediaObj.fileName) {
          return String(mediaObj.fileName);
        }

        // Para outros tipos de mídia, usar tipo genérico
        return getMediaTypeName(String(msg.type || 'document'));
      }
    }

    // Prioridade 2: Campos de texto alternativos
    const textFields = [
      'conversation',    // WhatsApp conversation field
      'text',           // Generic text field
      'content',        // Content field
      'message',        // Message field
      'caption',        // Caption for media
      'quotedBody',     // Quoted body field
      'extendedText'    // Extended text field
    ];

    for (const field of textFields) {
      if (msg[field] && typeof msg[field] === 'string') {
        return msg[field] as string;
      }
    }

    // Prioridade 3: Mensagens de mídia específicas
    if (msg.type && msg.type !== 'text') {
      // Para diferentes tipos de mídia
      const mediaTypes = {
        'image': '📷 Foto',
        'imageMessage': '📷 Foto',
        'video': '🎥 Vídeo',
        'videoMessage': '🎥 Vídeo',
        'audio': '🎵 Áudio',
        'audioMessage': '🎵 Áudio',
        'ptt': '🎤 Áudio',
        'pttMessage': '🎤 Áudio',
        'document': '📄 Documento',
        'documentMessage': '📄 Documento',
        'sticker': '😊 Figurinha',
        'stickerMessage': '😊 Figurinha',
        'location': '📍 Localização',
        'locationMessage': '📍 Localização',
        'contact': '👤 Contato',
        'contactMessage': '👤 Contato'
      };

             return mediaTypes[msg.type as keyof typeof mediaTypes] || `📎 ${getMediaTypeName(String(msg.type))}`;
    }

    // Prioridade 4: Verificar estruturas aninhadas
    if (msg.message) {
      const nestedContent = getQuotedMessageContent(msg.message);
      if (nestedContent !== 'Mensagem') {
        return nestedContent;
      }
    }

    // Prioridade 5: Usar qualquer campo de string disponível
    const allKeys = Object.keys(msg);
    for (const key of allKeys) {
      const value = msg[key];
      if (typeof value === 'string' && value.length > 0 && value !== msg.id) {
        console.log(`🔍 Usando campo '${key}' como conteúdo:`, value);
        return value;
      }
    }

    // Fallback final
    console.warn('⚠️ Não foi possível extrair conteúdo da mensagem citada, usando fallback');
    return 'Mensagem';
  };

  // Função auxiliar para obter ícone da mídia
  const getMediaIcon = (type: string): string => {
    switch (type?.toLowerCase()) {
      case 'image': 
      case 'imageMessage': return '🖼️';
      case 'video': 
      case 'videoMessage': return '🎥';
      case 'audio': 
      case 'audioMessage':
      case 'ptt': 
      case 'pttMessage': return '🎵';
      case 'document': 
      case 'documentMessage': return '📄';
      case 'sticker': 
      case 'stickerMessage': return '🔖';
      case 'location': 
      case 'locationMessage': return '📍';
      case 'contact': 
      case 'contactMessage': return '👤';
      default: return '📎';
    }
  };

  // Função auxiliar para obter nome do tipo de mídia
  const getMediaTypeName = (type: string): string => {
    switch (type) {
      case 'image': return 'Imagem';
      case 'video': return 'Vídeo';
      case 'audio': return 'Áudio';
      case 'ptt': return 'Mensagem de voz';
      case 'document': return 'Documento';
      case 'sticker': return 'Figurinha';
      case 'location': return 'Localização';
      case 'contact': return 'Contato';
      default: return 'Mídia';
    }
  };

  // Função para renderizar conteúdo de mensagens com suporte a mídia
  const renderMessageContent = (message: ChatMessage) => {
    // Verificar se é uma mensagem de mídia
    const isMediaMessage = ['image', 'video', 'audio', 'ptt', 'document'].includes(message.type);
    
    // Se é mídia E temos token da instância, usar MediaRenderer
    if (isMediaMessage && selectedInstance?.token) {
      return (
        <MediaRenderer
          message={{
            id: message.id,
            type: message.type,
            content: message.content,
            mediaUrl: message.mediaUrl,
            fromMe: message.fromMe
          }}
          instanceToken={selectedInstance.token}
        />
      );
    }
    
    // Para mensagens de texto ou quando não há token
    if (typeof message.content === 'string') {
      return message.content;
    }
    
    // Se content é objeto (mídia sem token)
    if (typeof message.content === 'object' && message.content !== null) {
      const mediaObj = message.content as Record<string, unknown>;
      
      // Priorizar legenda se disponível
      if (mediaObj.caption) {
        return String(mediaObj.caption);
      }

      // Fallback para nome do arquivo
      if (mediaObj.fileName) {
        return `📁 ${String(mediaObj.fileName)}`;
      }
      
      // Indicador genérico por tipo
      const typeNames: { [key: string]: string } = {
        'image': '🖼️ Imagem',
        'video': '🎥 Vídeo',
        'audio': '🎵 Áudio',
        'ptt': '🎤 Áudio',
        'document': '📄 Documento'
      };
      
      return typeNames[message.type] || '📎 Mídia';
    }
    
    return 'Mensagem';
  };

  const filteredChats = chats.filter(chat => {
    const matchesSearch = chat.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    // ✅ Filtro por status de arquivamento
    const matchesArchiveFilter = selectedFilter === 'archived' 
      ? chat.isArchived === true 
      : chat.isArchived !== true; // Chats não arquivados nos outros filtros
    
    const matchesFilter = 
      selectedFilter === 'all' ||
      selectedFilter === 'archived' || // Já tratado em matchesArchiveFilter
      // 👑 Admin vê todos os chats | Agente vê apenas os atribuídos a ele
      (selectedFilter === 'mine' && (isAdministrator || (chat.agentId === currentUserId))) ||
      (selectedFilter === 'unassigned' && chat.status === 'unassigned');
    
    return matchesSearch && matchesFilter && matchesArchiveFilter;
  });

  const unreadCount = chats.filter(chat => chat.unreadCount > 0).length;

  // Método de debug para console do navegador
  useEffect(() => {
    // Expor método de debug no window para acesso via console
    (window as unknown as Record<string, unknown>).debugConversas = async (token?: string) => {
      const instanceToken = token || selectedInstance?.token;
      if (!instanceToken) {
        console.error('❌ Token não fornecido. Use: debugConversas("SEU_TOKEN_AQUI")');
        return;
      }

      console.log('🔧 ===== DEBUG DE CONVERSAS CONECTEZAP =====');
      console.log('🔧 Token:', instanceToken.slice(0, 10) + '...');
      console.log('🔧 Instância selecionada:', selectedInstance?.name || 'Nenhuma');
      console.log('🔧 URL do servidor:', getCurrentServerConfig()?.url || 'Não definido');
      
      try {
        // 1. Testar conectividade
        console.log('\n🔍 1. TESTANDO CONECTIVIDADE DA INSTÂNCIA...');
        const connectivity = await uazapiService.testInstanceConnection(instanceToken);
        console.log('📊 Resultado:', connectivity);

        // 2. Buscar conversas
        console.log('\n🔍 2. BUSCANDO CONVERSAS...');
        const conversations = await uazapiService.searchChats(instanceToken, { limit: 10 });
        console.log('📱 Conversas encontradas:', conversations.length);
        
        if (conversations.length > 0) {
          console.log('📋 Primeira conversa:', conversations[0]);
          
          // 3. Testar mensagens da primeira conversa
          console.log('\n🔍 3. TESTANDO MENSAGENS DA PRIMEIRA CONVERSA...');
          const messages = await uazapiService.searchMessages(instanceToken, {
            chatid: conversations[0].id,
            limit: 5
          });
          console.log('💬 Mensagens encontradas:', messages.length);
          if (messages.length > 0) {
            console.log('📨 Primeira mensagem:', messages[0]);
          }
        }

        // 4. Diagnóstico final
        console.log('\n✅ DIAGNÓSTICO CONCLUÍDO');
        console.log('📊 RESUMO:');
        console.log('- Instância conectada:', connectivity.isConnected);
        console.log('- Status:', connectivity.status);
        console.log('- Conversas encontradas:', conversations.length);
        console.log('- Possui contatos:', connectivity.hasContacts);
        console.log('- Possui grupos:', connectivity.hasGroups);
        
        if (conversations.length === 0) {
          console.log('\n⚠️ POSSÍVEIS SOLUÇÕES:');
          console.log('1. Verifique se a instância está conectada');
          console.log('2. Verifique se há conversas no WhatsApp');
          console.log('3. Teste enviar uma mensagem primeiro');
          console.log('4. Verifique o token da instância');
        }

      } catch (error) {
        console.error('❌ ERRO no debug:', error);
      }
    };

    console.log('🔧 Debug disponível via console: debugConversas("SEU_TOKEN")');
    
    return () => {
      delete (window as unknown as Record<string, unknown>).debugConversas;
    };
  }, [selectedInstance]);

  // Função para enviar múltiplas mídias
  const handleSendMedia = async (mediaFiles: Array<{
    id: string;
    file: File;
    type: 'image' | 'video' | 'audio' | 'document';
    caption?: string;
  }>) => {
    if (!selectedChat || !selectedInstance || !selectedChat.id) {
      throw new Error('Chat ou instância não selecionados');
    }

    try {
      console.log('🎬 INICIANDO ENVIO DE MÚLTIPLAS MÍDIAS:', mediaFiles.length);
      
      // Usar método específico para múltiplas mídias
      if (!selectedInstance.token) {
        throw new Error('Token da instância não disponível');
      }
      
      await uazapiService.sendMultipleMedia(
        selectedInstance.token, 
        selectedChat.id!, 
        mediaFiles,
        (current, total, currentFile) => {
          // Callback de progresso - pode ser usado para mostrar progresso no modal
          console.log(`📤 Enviando ${current}/${total}: ${currentFile}`);
        }
      );

      // Recarregar mensagens para mostrar as mídias enviadas
      await loadMessages(selectedChat);
      
      toast.success(`${mediaFiles.length} mídia(s) enviada(s) com sucesso!`);
      
    } catch (error: unknown) {
      console.error('❌ ERRO AO ENVIAR MÍDIAS:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar mídias');
      throw error; // Re-throw para o modal tratar
    }
  };

  return (
    <div className="h-[calc(100vh-7rem)] flex bg-gray-50">
      {/* Left Sidebar - Chat List */}
      <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold text-gray-900">Multiatendimento</h1>
            <div className="flex items-center gap-2">
              {isAdministrator && (
                <button
                  onClick={() => {
                    console.log('🏷️ [ChatPage] Botão Gerenciar Etiquetas clicado!');
                    setShowLabelsModal(true);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  title="Gerenciar Etiquetas"
                >
                  <Tag className="h-5 w-5" />
                </button>
              )}
              <button
                onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                className={cn(
                  "p-2 rounded-lg hover:bg-gray-100",
                  showFiltersPanel ? "text-primary-600 bg-primary-50" : "text-gray-400 hover:text-gray-600"
                )}
                title="Filtros Avançados"
              >
                <Filter className="h-5 w-5" />
              </button>
              <button
                onClick={() => setShowInstanceModal(true)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                title="Selecionar Instância"
              >
                <Smartphone className="h-5 w-5" />
              </button>
              <button
                onClick={loadChats}
                disabled={loading}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                title="Atualizar"
              >
                <RefreshCw className={cn("h-5 w-5", loading && "animate-spin")} />
              </button>
            </div>
          </div>

          {selectedInstance ? (
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  selectedInstance.status === 'connected' ? "bg-green-500" : "bg-red-500"
                )} />
                <span className="text-sm text-gray-600">{selectedInstance.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {realtimeConnected ? (
                  <Wifi className="h-3 w-3 text-green-500" />
                ) : (
                  <WifiOff className="h-3 w-3 text-red-500" />
                )}
                <span className="text-xs text-gray-500">
                  {realtimeConnected ? 'Tempo real ativo' : 'Tempo real desconectado'}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500 mb-4">Nenhuma instância selecionada</div>
          )}

          <button 
            onClick={() => toast('Funcionalidade em desenvolvimento')}
            className="flex items-center gap-2 w-full bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
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
              {unreadCount}
            </span>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Pesquisar conversas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Advanced Filters Panel */}
          {showFiltersPanel && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">Filtros Avançados</h3>
                <button
                  onClick={() => {
                    setFilterByAgent(null);
                    setFilterByStatus(null);
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Limpar
                </button>
              </div>
              
              {/* Filter by Agent */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Por Agente</label>
                <select
                  value={filterByAgent || ''}
                  onChange={(e) => setFilterByAgent(e.target.value || null)}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">Todos os agentes</option>
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Filter by Status */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Por Status</label>
                <select
                  value={filterByStatus || ''}
                  onChange={(e) => setFilterByStatus((e.target.value as 'unassigned' | 'assigned' | 'closed') || null)}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">Todos os status</option>
                  <option value="unassigned">Não atribuído</option>
                  <option value="assigned">Atribuído</option>
                  <option value="closed">Fechado</option>
                </select>
              </div>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => setSelectedFilter('all')}
              className={cn(
                "flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap",
                selectedFilter === 'all' ? "bg-white text-primary-600 shadow" : "text-gray-500 hover:text-gray-900"
              )}
            >
              Todas
            </button>
            <button
              onClick={() => setSelectedFilter('mine')}
              className={cn(
                "flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap",
                selectedFilter === 'mine' ? "bg-white text-primary-600 shadow" : "text-gray-500 hover:text-gray-900"
              )}
            >
              Minhas
            </button>
            <button
              onClick={() => setSelectedFilter('unassigned')}
              className={cn(
                "flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap",
                selectedFilter === 'unassigned' ? "bg-white text-primary-600 shadow" : "text-gray-500 hover:text-gray-900"
              )}
            >
              Não atrib.
            </button>
            <button
              onClick={() => setSelectedFilter('archived')}
              className={cn(
                "flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap",
                selectedFilter === 'archived' ? "bg-white text-primary-600 shadow" : "text-gray-500 hover:text-gray-900"
              )}
              title="Conversas arquivadas"
            >
              Arquivados
            </button>
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin h-6 w-6 border-2 border-primary-600 border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-sm text-gray-500">Carregando conversas...</p>
            </div>
          ) : !selectedInstance ? (
            <div className="p-8 text-center">
              <Smartphone className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Selecione uma instância</p>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="p-8 text-center space-y-4">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto" />
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {chats.length === 0 ? 'Nenhuma conversa encontrada' : 'Nenhum resultado para sua busca'}
                </h3>
                {chats.length === 0 ? (
                  <div className="text-sm text-gray-500 space-y-2 max-w-sm mx-auto">
                    <p>Não foram encontradas conversas para esta instância.</p>
                    <div className="text-left">
                      <p className="font-medium">Possíveis causas:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>Instância não está conectada</li>
                        <li>Não há conversas no WhatsApp</li>
                        <li>Token da instância inválido</li>
                        <li>Problemas de conectividade</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Tente ajustar os filtros ou termo de busca</p>
                )}
              </div>
              {chats.length === 0 && selectedInstance && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <button
                      onClick={loadChats}
                      disabled={loading}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                    >
                      {loading ? 'Recarregando...' : 'Tentar novamente'}
                    </button>
                    <button
                      onClick={() => {
                        console.log('🔧 Debug forçado - adicionando MÚLTIPLAS mensagens citadas para teste');
                        if (selectedChat) {
                          const testMessages: ChatMessage[] = [
                            // Resposta a texto
                            {
                              id: 'test_quoted_text_' + Date.now(),
                              chatId: selectedChat.id,
                              content: 'Perfeito! Entendi sua mensagem.',
                              timestamp: Date.now(),
                              fromMe: true,
                              type: 'text',
                              author: 'Você',
                              quotedMsg: {
                                body: 'Você pode me ajudar com uma dúvida?',
                                type: 'text',
                                pushName: 'Cliente',
                                id: 'original_1',
                                timestamp: Date.now() - 120000
                              }
                            },
                            // Resposta a mídia
                            {
                              id: 'test_quoted_media_' + Date.now() + 1,
                              chatId: selectedChat.id,
                              content: 'Que foto linda! Obrigado por compartilhar.',
                              timestamp: Date.now() + 1000,
                              fromMe: false,
                              type: 'text',
                              author: 'Cliente',
                              quotedMsg: {
                                body: { fileName: 'paisagem.jpg', caption: 'Olha essa vista!' },
                                type: 'image',
                                pushName: 'Você',
                                id: 'original_2',
                                timestamp: Date.now() - 60000
                              }
                            },
                            // Resposta simples
                            {
                              id: 'test_quoted_simple_' + Date.now() + 2,
                              chatId: selectedChat.id,
                              content: 'ok',
                              timestamp: Date.now() + 2000,
                              fromMe: true,
                              type: 'text',
                              author: 'Você',
                              quotedMsg: {
                                body: 'Vou enviar o arquivo agora',
                                type: 'text',
                                pushName: 'Cliente',
                                id: 'original_3',
                                timestamp: Date.now() - 30000
                              }
                            }
                          ];
                          
                          setMessages(prev => [...prev, ...testMessages]);
                          console.log('✅ Múltiplas mensagens de teste com citação adicionadas!');
                          
                          // Scroll para o final
                          setTimeout(scrollToBottom, 300);
                        }
                      }}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm"
                    >
                      🧪 Testar Respostas (WhatsApp)
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      console.log('🔧 Executando debug via botão...');
                      ((window as unknown as Record<string, unknown>).debugConversas as ((token?: string) => void) | undefined)?.(selectedInstance?.token);
                    }}
                    className="block mx-auto px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                  >
                    🔧 Executar Diagnóstico
                  </button>
                  <p className="text-xs text-gray-400">
                    Ou abra o console (F12) e execute: <code className="bg-gray-100 px-1 rounded">debugConversas()</code>
                  </p>
                </div>
              )}
            </div>
          ) : (
            filteredChats.map((chat) => (
            <div
              key={chat.id}
                className={cn(
                  "relative p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors group",
                  selectedChat?.id === chat.id && "bg-primary-50 border-primary-200"
                )}
            >
              {/* ✅ Botão de Desarquivar (aparece no hover quando no filtro "Arquivados") */}
              {selectedFilter === 'archived' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Evitar abrir o chat ao clicar no botão
                    handleUnarchiveChat(chat);
                  }}
                  className="absolute top-2 right-2 p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  title="Desarquivar conversa"
                >
                  <Archive className="h-4 w-4 rotate-180" />
                </button>
              )}
              
              <div onClick={() => handleSelectChat(chat)}>
              <div className="flex items-center gap-3">
                <div className="relative">
                  {/* Foto de perfil ou avatar com inicial */}
                  {chat.profilePicUrl && !chat.profilePicUrl.includes('pps.whatsapp.net') ? (
                    <img
                      src={uazapiService.getProxiedImageUrl(chat.profilePicUrl)}
                      alt={chat.name}
                      className="h-12 w-12 rounded-full object-cover flex-shrink-0 bg-gray-100"
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        // Fallback para avatar com inicial se imagem falhar
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling;
                        if (fallback) (fallback as HTMLElement).style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0"
                    style={{ display: (chat.profilePicUrl && !chat.profilePicUrl.includes('pps.whatsapp.net')) ? 'none' : 'flex' }}
                  >
                    <span className="text-primary-600 font-medium">
                      {chat.name[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  {chat.unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 h-5 w-5 bg-primary-600 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-medium">
                        {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                      </span>
                    </div>
                  )}
                </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-gray-900 truncate">{chat.name}</h3>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {formatTime(chat.lastMessageTimestamp || Date.now())}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500 truncate">
                        {typeof chat.lastMessage?.content === 'object' 
                          ? '📎 Mídia' 
                          : chat.lastMessage?.content || 'Sem mensagens'}
                      </p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* ✅ Indicador de arquivado */}
                        {chat.isArchived && (
                          <div className="flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-medium mr-1" title="Arquivado">
                            <Archive className="h-3 w-3" />
                            <span>Arquivado</span>
                          </div>
                        )}
                        
                        {/* Status indicator */}
                        {chat.status === 'unassigned' && (
                          <div className="w-2 h-2 bg-orange-400 rounded-full" title="Não atribuído" />
                        )}
                        {chat.status === 'assigned' && (
                          <div className="w-2 h-2 bg-green-400 rounded-full" title="Atribuído" />
                        )}
                        {chat.status === 'closed' && (
                          <div className="w-2 h-2 bg-gray-400 rounded-full" title="Fechado" />
                        )}
                        
                        {/* Agent indicator */}
                        {chat.agent && (
                          <div title={`Agente: ${chat.agent}`}>
                            <User className="h-3 w-3 text-gray-400" />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Agent name and status */}
                    {(chat.agent || chat.status !== 'unassigned') && (
                      <div className="flex items-center gap-2 mt-1">
                        {chat.agent && (
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                            {chat.agent}
                          </span>
                        )}
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded",
                          chat.status === 'unassigned' && "bg-orange-100 text-orange-700",
                          chat.status === 'assigned' && "bg-green-100 text-green-700",
                          chat.status === 'closed' && "bg-gray-100 text-gray-700"
                        )}>
                          {chat.status === 'unassigned' && 'Não atribuído'}
                          {chat.status === 'assigned' && 'Atribuído'}
                          {chat.status === 'closed' && 'Fechado'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            ))
          )}
        </div>
      </div>

      {/* Right Side - Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Foto de perfil ou avatar no header */}
                  {selectedChat.profilePicUrl && !selectedChat.profilePicUrl.includes('pps.whatsapp.net') ? (
                    <img
                      src={uazapiService.getProxiedImageUrl(selectedChat.profilePicUrl)}
                      alt={selectedChat.name}
                      className="h-10 w-10 rounded-full object-cover bg-gray-100"
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling;
                        if (fallback) (fallback as HTMLElement).style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center"
                    style={{ display: (selectedChat.profilePicUrl && !selectedChat.profilePicUrl.includes('pps.whatsapp.net')) ? 'none' : 'flex' }}
                  >
                    <span className="text-primary-600 font-medium">
                      {selectedChat.name[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-gray-900">{selectedChat.name}</h2>
                      {/* ✅ Badge de Arquivado no header */}
                      {selectedChat.isArchived && (
                        <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-1 rounded-md text-xs font-medium">
                          <Archive className="h-3 w-3" />
                          Arquivado
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setShowAssignModal(true)}
                      className="text-sm text-gray-500 hover:text-primary-600 transition-colors"
                    >
                      {selectedChat.agent ? `Atribuída: ${selectedChat.agent}` : 'Não atribuída - Clique para atribuir'}
                    </button>
                  </div>
                </div>
                                <div className="flex items-center gap-2">
                  {/* Botão de Detalhes do Contato */}
                  <button
                    onClick={() => setShowChatDetailsPanel(true)}
                    className="p-2 text-gray-500 hover:text-primary-600 rounded-lg hover:bg-gray-100"
                    title="Ver detalhes do contato"
                  >
                    <Info className="h-5 w-5" />
                  </button>

                  {/* Controles de Multiatendimento */}
                  {isAgent && (
                    <>
                      {selectedChat.status === 'unassigned' && (
                        <button
                          onClick={() => setShowAssignModal(true)}
                          className="p-2 text-blue-500 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                          title="Atribuir Agente"
                        >
                          <UserCheck className="h-5 w-5" />
                        </button>
                      )}
                      
                      {selectedChat.status === 'assigned' && selectedChat.agent && (
                        <>
                          <button
                            onClick={handleUnassignChat}
                            className="p-2 text-orange-500 hover:text-orange-600 rounded-lg hover:bg-orange-50"
                            title="Desatribuir"
                          >
                            <UserX className="h-5 w-5" />
                          </button>
                          <button
                            onClick={handleCloseChat}
                            className="p-2 text-green-500 hover:text-green-600 rounded-lg hover:bg-green-50"
                            title="Finalizar Atendimento"
                          >
                            <CheckCircle className="h-5 w-5" />
                          </button>
                        </>
                      )}
                      
                      {selectedChat.status === 'closed' && (
                        <button
                          onClick={handleReopenChat}
                          className="p-2 text-blue-500 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                          title="Reabrir Atendimento"
                        >
                          <RefreshCw className="h-5 w-5" />
                        </button>
                      )}
                    </>
                  )}
                  <button
                    onClick={() => setShowNotesPanel(true)}
                    className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-gray-100"
                    title="Notas internas"
                  >
                    <FileText className="h-5 w-5" />
                  </button>
                  
                  {/* ✅ BOTÃO DE ARQUIVAR/DESARQUIVAR - DINÂMICO */}
                  <button
                    onClick={handleToggleArchiveChat}
                    className={cn(
                      "p-2 rounded-lg hover:bg-orange-50 transition-colors",
                      selectedChat.isArchived 
                        ? "text-blue-500 hover:text-blue-600" 
                        : "text-gray-400 hover:text-orange-600"
                    )}
                    title={selectedChat.isArchived ? "Desarquivar conversa" : "Arquivar conversa"}
                  >
                    <Archive className={cn("h-5 w-5", selectedChat.isArchived && "rotate-180")} />
                  </button>
                  
                  <div className="relative more-options-menu">
                    <button
                      onClick={() => setShowMoreOptionsMenu(!showMoreOptionsMenu)}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                      title="Mais opções"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>
                    {showMoreOptionsMenu && (
                      <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                        <div className="py-2">
                          <button
                            onClick={() => {
                              handleMarkAsUnread();
                              setShowMoreOptionsMenu(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
                          >
                            <MailOpen className="h-4 w-4" />
                            Marcar como não lido
                          </button>
                          
                          <div className="my-1 border-t border-gray-200"></div>
                          
                          <button
                            onClick={() => {
                              handleBlockContact();
                              setShowMoreOptionsMenu(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                          >
                            <Ban className="h-4 w-4" />
                            Bloquear contato
                          </button>
                          <button
                            onClick={() => {
                              handleClearChat();
                              setShowMoreOptionsMenu(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                          >
                            <Trash2 className="h-4 w-4" />
                            Limpar conversa
                          </button>
                          
                          {/* Separador */}
                          <div className="border-t border-gray-200 my-1"></div>
                          
                          {/* ✅ Opção para limpar cache de nomes */}
                          <button
                            onClick={() => {
                              setContactNamesCache({});
                              localStorage.removeItem(CACHE_KEY);
                              setShowMoreOptionsMenu(false);
                              toast.success('Cache de nomes limpo com sucesso');
                              console.log('🧹 Cache de nomes limpo manualmente');
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-3"
                          >
                            <Trash2 className="h-4 w-4" />
                            Limpar cache de nomes
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingMessages ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-primary-600 border-t-transparent rounded-full mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Carregando mensagens...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Nenhuma mensagem ainda</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    id={`message-${message.id}`}
                    className={cn(
                      "flex group transition-all duration-300 rounded-lg",
                      message.fromMe ? "justify-end" : "justify-start"
                    )}
                  >
                    {/* Botão de resposta (aparece no hover) */}
                    {!message.fromMe && (
                      <button
                        onClick={() => handleReplyToMessage(message)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 mr-2 mt-auto mb-2 text-gray-400 hover:text-primary-600 rounded"
                        title="Responder"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                      </button>
                    )}
                    
                    <div
                      className={cn(
                        "max-w-xs lg:max-w-md rounded-lg overflow-hidden",
                        message.quotedMsg ? "" : "px-4 py-2", // Padding condicional
                        message.fromMe
                          ? "bg-primary-600 text-white rounded-br-sm"
                          : "bg-gray-100 text-gray-900 rounded-bl-sm"
                      )}
                    >
                      {/* Container para mensagem com citação */}
                      {message.quotedMsg ? (
                        <div className="flex flex-col">
                          {/* Mensagem citada */}
                          <div className={cn(
                            "px-3 py-2 border-b",
                            message.fromMe 
                              ? "border-white/20 bg-black/10" 
                              : "border-gray-300 bg-white/50"
                          )}>
                            {renderQuotedMessage(message.quotedMsg, message.fromMe)}
                          </div>
                          
                          {/* Resposta */}
                          <div className="px-4 py-2">
                            {!message.fromMe && message.author && (
                              <p className="text-xs text-gray-500 mb-1">{message.author}</p>
                            )}
                            
                            {/* Conteúdo da resposta */}
                            {['image', 'video', 'audio', 'ptt', 'document'].includes(message.type) ? (
                              <div className="mt-1">
                                {renderMessageContent(message)}
                              </div>
                            ) : (
                              <p className="break-words whitespace-pre-wrap">{renderMessageContent(message)}</p>
                            )}
                            
                            <div className="flex items-center justify-end gap-1 mt-1">
                              <span className={cn(
                                "text-xs",
                                message.fromMe ? "text-primary-100" : "text-gray-500"
                              )}>
                                {formatTime(message.timestamp)}
                              </span>
                              {message.fromMe && getMessageIcon(message.status)}
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Mensagem normal sem citação */
                        <>
                          {!message.fromMe && message.author && (
                            <p className="text-xs text-gray-500 mb-1">{message.author}</p>
                          )}
                          
                          {/* Verificar se é mídia para renderizar sem <p> */}
                          {['image', 'video', 'audio', 'ptt', 'document'].includes(message.type) ? (
                            <div className="mt-1">
                              {renderMessageContent(message)}
                            </div>
                          ) : (
                            <p className="break-words whitespace-pre-wrap">{renderMessageContent(message)}</p>
                          )}
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <span className={cn(
                              "text-xs",
                              message.fromMe ? "text-primary-100" : "text-gray-500"
                            )}>
                              {formatTime(message.timestamp)}
                            </span>
                            {message.fromMe && getMessageIcon(message.status)}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Reações */}
                    <div className="mt-1 relative">
                      {/* Exibir reações existentes */}
                      {message.reactions && Object.keys(message.reactions).length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {Object.entries(message.reactions).map(([emoji, users]) => (
                            <button
                              key={emoji}
                              onClick={() => handleReactToMessage(message.id, emoji)}
                              className={cn(
                                "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-colors",
                                users.includes('Você')
                                  ? "bg-primary-100 border-primary-300 text-primary-700"
                                  : "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200"
                              )}
                              title={`${users.join(', ')} reagiu${users.length > 1 ? 'ram' : ''} com ${emoji}`}
                            >
                              <span>{emoji}</span>
                              <span>{users.length}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Botão para adicionar reação */}
                      <div className="relative inline-block">
                        <button
                          onClick={() => toggleEmojiPicker(message.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-gray-200 text-gray-500 hover:text-gray-700"
                          title="Adicionar reação"
                        >
                          <span className="text-sm">😊</span>
                        </button>

                        {/* Seletor de emojis */}
                         {showEmojiPicker === message.id && (
                           <div className={cn(
                             "emoji-picker absolute bottom-full mb-2 bg-white border border-gray-200 rounded-lg shadow-xl p-3 z-[9999] min-w-[240px]",
                             message.fromMe ? "right-0" : "left-0"
                           )}>
                            <div className="grid grid-cols-6 gap-2">
                              {['👍', '❤️', '😂', '😮', '😢', '😡', '👏', '🙏', '🔥', '💯', '🎉', '✅'].map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleReactToMessage(message.id, emoji)}
                                  className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-lg text-2xl transition-all hover:scale-110 active:scale-95"
                                  disabled={reactingToMessage === message.id}
                                  title={`Reagir com ${emoji}`}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Preview */}
            {replyingToMessage && (
              <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                      <span className="text-sm font-medium text-gray-700">Respondendo a {replyingToMessage.author || 'Contato'}</span>
                    </div>
                    <div className="bg-white rounded-lg p-3 border-l-4 border-primary-600">
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {replyingToMessage.type === 'text' 
                          ? (typeof replyingToMessage.content === 'string' ? replyingToMessage.content : '[Mensagem]')
                          : `📎 ${replyingToMessage.type.charAt(0).toUpperCase() + replyingToMessage.type.slice(1)}`
                        }
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleCancelReply}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    title="Cancelar resposta"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Message Input */}
                        <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex items-end gap-3">
                <button
                  onClick={() => setShowTemplatesModal(true)}
                  className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-gray-100 flex-shrink-0"
                  title="Templates de mensagem"
                >
                  <MessageSquare className="h-5 w-5" />
                </button>
                <button 
                  onClick={() => setShowMediaModal(true)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                <div className="flex-1">
                  <textarea
                    ref={messageInputRef}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={replyingToMessage ? "Digite sua resposta..." : "Digite sua mensagem..."}
                    className="w-full resize-none rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    rows={1}
                    style={{ minHeight: '40px', maxHeight: '120px' }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = target.scrollHeight + 'px';
                    }}
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                  className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 transition-colors"
                  title="Enviar mensagem"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <Phone className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>Selecione uma conversa para começar</p>
        </div>
      </div>
        )}
      </div>

      {/* Instance Modal */}
      {showInstanceModal && (
        <SelectInstanceModal
          onSelect={(instance) => {
            setSelectedInstance(instance);
            setShowInstanceModal(false);
          }}
          onClose={() => setShowInstanceModal(false)}
        />
      )}

      {/* Templates Modal */}
      <TemplatesModal 
        isOpen={showTemplatesModal}
        onClose={() => setShowTemplatesModal(false)}
        onSelectTemplate={handleSelectTemplate}
      />

      {/* Notes Panel */}
      {selectedChat && (
        <NotesPanel 
          chatId={selectedChat.id}
          isOpen={showNotesPanel}
          onClose={() => setShowNotesPanel(false)}
        />
      )}

      {/* Assign Agent Modal */}
      {selectedChat && (
        <AssignAgentModal
          isOpen={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          chatId={selectedChat?.id || ''}
          chatName={selectedChat?.name || 'Chat'}
          currentAgent={selectedChat?.agent}
          currentAgentId={assignments.find(a => a.chatId === selectedChat.id && a.status === 'assigned')?.agentId}
          agents={agents} // ✅ Passar agentes reais do contexto
          onAssign={handleAssignAgent}
        />
      )}

      {/* Labels Modal */}
      <LabelsModal
        isOpen={showLabelsModal}
        onClose={() => setShowLabelsModal(false)}
        labels={labels}
        onLoadLabels={loadLabels}
        onCreateLabel={handleCreateLabel}
        onEditLabel={handleEditLabel}
        onDeleteLabel={handleDeleteLabel}
        loading={labelsLoading}
      />

      {/* Modal de Upload de Mídia */}
      <MediaUploadModal
        isOpen={showMediaModal}
        onClose={() => setShowMediaModal(false)}
        onSendMedia={handleSendMedia}
        chatName={selectedChat?.name || 'Chat'}
      />

      {/* Painel de Detalhes do Chat */}
      <ChatDetailsPanel
        isOpen={showChatDetailsPanel}
        onClose={() => setShowChatDetailsPanel(false)}
        chatDetails={selectedChatDetails}
        loading={loadingChatDetails}
      />
    </div>
  );
}

export default ChatPage;