import { useState, useEffect, useRef } from 'react';
import { Search, Plus, MessageSquare, Phone, Send, Paperclip, MoreVertical, Clock, Check, CheckCheck, Smartphone, RefreshCw, Archive, User, Wifi, WifiOff, FileText } from 'lucide-react';
import { cn } from '../lib/utils';
import { uazapiService, Chat as UazapiChat } from '../services/uazapiService';
import { getCurrentServerConfig } from '../services/api';
import { useInstance } from '../contexts/InstanceContext';
import { message, getProfileInfo } from '../lib/wapi/api';
import { toast } from 'react-hot-toast';
import { SelectInstanceModal } from '../components/instance/SelectInstanceModal';
import { useRealTimeChat } from '../hooks/useRealTimeChat';
import { TemplatesModal } from '../components/TemplatesModal';
import { NotesPanel } from '../components/NotesPanel';
import { AssignAgentModal } from '../components/AssignAgentModal';
import { MediaUploadModal } from '../components/MediaUploadModal';
import { MediaRenderer } from '../components/MediaRenderer';

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
  quotedMsg?: any;
}

interface ExtendedChat extends Omit<UazapiChat, 'lastMessage'> {
  lastMessage?: ChatMessage;
  agent?: string;
  status: 'unassigned' | 'assigned' | 'closed';
}

export function ChatPage() {
  const { selectedInstance, setSelectedInstance } = useInstance();
  const [chats, setChats] = useState<ExtendedChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<ExtendedChat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'mine' | 'unassigned'>('all');
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showInstanceModal, setShowInstanceModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  // Cache para nomes de contatos
  const [contactNamesCache, setContactNamesCache] = useState<Record<string, string>>({});

  // Função para buscar o nome correto do contato
  const getContactName = async (chatId: string, instanceToken?: string): Promise<string> => {
    // Verificar cache primeiro
    if (contactNamesCache[chatId]) {
      return contactNamesCache[chatId];
    }

    try {
      // Extrair número do chatId (remover @s.whatsapp.net se presente)
      const number = chatId.includes('@') ? chatId.split('@')[0] : chatId;
      
      // Buscar informações do perfil
      const profileInfo = await getProfileInfo(number, instanceToken);
      
      if (profileInfo && profileInfo.name && profileInfo.name !== number) {
        // Atualizar cache
        setContactNamesCache(prev => ({
          ...prev,
          [chatId]: profileInfo.name
        }));
        return profileInfo.name;
      }
    } catch (error) {
      console.warn('Erro ao buscar nome do contato:', error);
    }

    // Fallback para 'Contato' se não conseguir obter o nome
    return 'Contato';
  };

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
        let processedQuotedMsg = null;
        const msgAny = message as any;
        
        // Verificar todos os campos possíveis onde mensagens citadas podem estar
        const quotedSource = message.quotedMsg || 
                           msgAny.quoted || 
                           msgAny.quotedMessage || 
                           msgAny.contextInfo?.quotedMessage ||
                           msgAny.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
                           msgAny.message?.conversation?.contextInfo?.quotedMessage ||
                           msgAny.key?.contextInfo?.quotedMessage ||
                           msgAny.quotedStanzaId || 
                           msgAny.quotedParticipant || 
                           msgAny.quotedStanza || 
                           msgAny.extendedTextMessage?.contextInfo?.quotedMessage ||
                           (msgAny.body && typeof msgAny.body === 'object' && msgAny.body.quotedMessage) ||
                           msgAny.replyTo ||
                           msgAny.repliedTo ||
                           msgAny.inReplyTo ||
                           msgAny.quotedContent ||
                           msgAny.quotedText ||
                           msgAny.quotedBody ||
                           msgAny.reference ||
                           msgAny.messageRef ||
                           msgAny.quotedMessageId ||
                           msgAny.originalMessage ||
                           msgAny.parentMessage ||
                           msgAny.message?.quotedMessage ||
                           msgAny.message?.quoted ||
                           msgAny.message?.contextInfo ||
                           msgAny.stanzaId ||
                           msgAny.participant ||
                           msgAny.quotedStanzaId ||
                           (msgAny.key && msgAny.key.participant && msgAny.key.id);
        
        if (quotedSource) {
          console.log('📋 ✅ ENCONTROU mensagem citada em tempo real! Processando:', quotedSource);
          
          const quotedData = quotedSource.quotedMessage || quotedSource;
          
          processedQuotedMsg = {
            ...quotedData,
            body: quotedData.body || quotedData.text || quotedData.conversation,
            type: quotedData.type || 'text',
            pushName: quotedData.pushName || quotedData.participant || quotedData.author,
            id: quotedData.id || quotedData.messageId,
            timestamp: quotedData.timestamp || quotedData.messageTimestamp
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

  // Abrir modal de instância automaticamente se não houver instância selecionada
  useEffect(() => {
    if (!selectedInstance) {
      setShowInstanceModal(true);
    }
  }, [selectedInstance]);

  // Carregar chats quando instância for selecionada
  useEffect(() => {
    if (selectedInstance?.token) {
      loadChats();
      // Configurar atualização automática a cada 30 segundos
      const interval = setInterval(loadChats, 30000);
      return () => clearInterval(interval);
    }
  }, [selectedInstance]);

  const loadChats = async () => {
    if (!selectedInstance?.token) return;

    try {
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
        // Determinar status baseado em dados reais ou padrão
        let status: 'unassigned' | 'assigned' | 'closed' = 'unassigned';
        if (chat.unreadCount > 0) {
          status = 'unassigned'; // Se tem mensagens não lidas, não está atribuído
        } else {
          status = 'assigned'; // Se não tem mensagens pendentes, pode estar atribuído
        }

        return {
          ...chat,
          status,
          agent: undefined, // Sem agente atribuído por padrão
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

  const loadMessages = async (chat: ExtendedChat) => {
    if (!selectedInstance?.token) return;

    try {
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
          const mediaObj = msg.body as any;
          
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

        // Processar mensagem citada se existir - verificar diferentes campos
        let processedQuotedMsg = null;
        
        // Verificar todos os campos possíveis onde mensagens citadas podem estar
        const msgAny = msg as any; // Cast para evitar erros TypeScript
        
        // Expandir busca MÁXIMA para capturar QUALQUER estrutura da API UAZAPI
        const quotedSource = msg.quotedMsg || 
                           msgAny.quoted || 
                           msgAny.quotedMessage || 
                           msgAny.contextInfo?.quotedMessage ||
                           msgAny.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
                           msgAny.message?.conversation?.contextInfo?.quotedMessage ||
                           msgAny.key?.contextInfo?.quotedMessage ||
                           msgAny.quotedStanzaId || 
                           msgAny.quotedParticipant || 
                           msgAny.quotedStanza || 
                           msgAny.extendedTextMessage?.contextInfo?.quotedMessage ||
                           // Estruturas aninhadas
                           (msgAny.body && typeof msgAny.body === 'object' && msgAny.body.quotedMessage) ||
                           // Campos alternativos que podem existir
                           msgAny.replyTo ||
                           msgAny.repliedTo ||
                           msgAny.inReplyTo ||
                           msgAny.quotedContent ||
                           msgAny.quotedText ||
                           msgAny.quotedBody ||
                           msgAny.reference ||
                           msgAny.messageRef ||
                           msgAny.quotedMessageId ||
                           msgAny.originalMessage ||
                           msgAny.parentMessage ||
                           // Verificar em níveis mais profundos
                           msgAny.message?.quotedMessage ||
                           msgAny.message?.quoted ||
                           msgAny.message?.contextInfo ||
                           // Campos específicos do protocolo WhatsApp
                           msgAny.stanzaId ||
                           msgAny.participant ||
                           msgAny.quotedStanzaId ||
                           // Estruturas complexas
                           (msgAny.key && msgAny.key.participant && msgAny.key.id) ||
                           // Busca em qualquer objeto que tenha 'quoted' no nome
                           Object.keys(msgAny).find(key => 
                             key.toLowerCase().includes('quot') && 
                             msgAny[key] && 
                             typeof msgAny[key] === 'object'
                           ) && msgAny[Object.keys(msgAny).find(key => 
                             key.toLowerCase().includes('quot') && 
                             msgAny[key] && 
                             typeof msgAny[key] === 'object'
                           )!];
        
        // Log ULTRA DETALHADO para mensagens suspeitas de serem respostas
        if (content && (
          content.toLowerCase().trim() === 'top' ||
          content.toLowerCase().trim() === 'ok' ||
          content.toLowerCase().trim() === 'as' ||
          content.toLowerCase().trim() === 'sim' ||
          content.toLowerCase().trim() === 'não'
        )) {
          console.log('🔍 ===== ANÁLISE COMPLETA DE POSSÍVEL RESPOSTA =====');
          console.log('📋 MENSAGEM ORIGINAL COMPLETA:', JSON.stringify(msg, null, 2));
          console.log('🔍 TODOS OS CAMPOS RAIZ:', Object.keys(msgAny));
          console.log('🔍 ESTRUTURA NIVEL 1:', msgAny);
          
          // Análise profunda de estruturas que podem conter citações
          if (msgAny.message) {
            console.log('🔍 ESTRUTURA msg.message:', Object.keys(msgAny.message));
            console.log('🔍 CONTEÚDO msg.message:', msgAny.message);
          }
          
          if (msgAny.contextInfo) {
            console.log('🔍 ESTRUTURA msg.contextInfo:', Object.keys(msgAny.contextInfo));
            console.log('🔍 CONTEÚDO msg.contextInfo:', msgAny.contextInfo);
          }
          
          if (msgAny.body && typeof msgAny.body === 'object') {
            console.log('🔍 ESTRUTURA msg.body (object):', Object.keys(msgAny.body));
            console.log('🔍 CONTEÚDO msg.body (object):', msgAny.body);
          }
          
          // Buscar QUALQUER campo que contenha 'quot', 'reply', 'ref', 'parent'
          const suspiciousFields = Object.keys(msgAny).filter(key => {
            const lowerKey = key.toLowerCase();
            return lowerKey.includes('quot') || 
                   lowerKey.includes('reply') || 
                   lowerKey.includes('ref') || 
                   lowerKey.includes('parent') ||
                   lowerKey.includes('context');
          });
          
          if (suspiciousFields.length > 0) {
            console.log('🕵️ CAMPOS SUSPEITOS ENCONTRADOS:', suspiciousFields);
            suspiciousFields.forEach(field => {
              console.log(`🔍 ${field}:`, msgAny[field]);
            });
          }
          
          console.log('====================================================');
        }
        
        // Log mais detalhado para debug
        console.log('🔍 DEBUG MENSAGEM CITADA - Verificando campos expandidos:', {
          msgId: msg.id,
          content: content?.toString().substring(0, 50) + '...',
          msgKeys: Object.keys(msgAny),
          // Campos básicos
          hasQuotedMsg: !!msg.quotedMsg,
          hasQuoted: !!msgAny.quoted,
          hasQuotedMessage: !!msgAny.quotedMessage,
          // Context Info
          hasContextInfo: !!msgAny.contextInfo,
          contextInfoKeys: msgAny.contextInfo ? Object.keys(msgAny.contextInfo) : null,
          quotedInContextInfo: !!(msgAny.contextInfo?.quotedMessage),
          // Campos específicos da API
          hasQuotedStanzaId: !!msgAny.quotedStanzaId,
          hasQuotedParticipant: !!msgAny.quotedParticipant,
          hasExtendedTextMessage: !!msgAny.extendedTextMessage,
          // Estrutura de mensagem
          messageKeys: msgAny.message ? Object.keys(msgAny.message) : null,
          bodyType: typeof msgAny.body,
          bodyHasQuoted: msgAny.body && typeof msgAny.body === 'object' && !!msgAny.body.quotedMessage
        });
        
        if (quotedSource) {
          console.log('📋 ✅ ENCONTROU mensagem citada! Processando:', quotedSource);
          
          // A mensagem citada pode estar em diferentes estruturas
          const quotedData = quotedSource.quotedMessage || quotedSource;
          
          processedQuotedMsg = {
            ...quotedData,
            // Garantir que temos os campos básicos
            body: quotedData.body || quotedData.text || quotedData.conversation,
            type: quotedData.type || 'text',
            pushName: quotedData.pushName || quotedData.participant || quotedData.author,
            // Preservar outros campos importantes
            id: quotedData.id || quotedData.messageId,
            timestamp: quotedData.timestamp || quotedData.messageTimestamp
          };
          
          console.log('✅ Mensagem citada processada com sucesso:', processedQuotedMsg);
          console.log('🎯 Esta mensagem será renderizada com visual de resposta!');
          
        } else {
          console.log('❌ Nenhuma mensagem citada encontrada para:', msg.id);
          
          // Análise mais detalhada para debug
          if (Object.keys(msgAny).length > 8) {
            console.log('🔍 Mensagem complexa com muitos campos - analisando estrutura:', {
              totalFields: Object.keys(msgAny).length,
              mainFields: Object.keys(msgAny).slice(0, 10),
              hasNestedMessage: !!msgAny.message,
              hasNestedBody: msgAny.body && typeof msgAny.body === 'object',
              possibleQuotedFields: Object.keys(msgAny).filter(key => 
                key.toLowerCase().includes('quot') || 
                key.toLowerCase().includes('reply') ||
                key.toLowerCase().includes('ref')
              )
            });
          }
          
          // Mensagem citada não encontrada - manter como null
          console.log('ℹ️ Nenhuma mensagem citada real encontrada para:', msg.id);
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

  const handleSelectChat = async (chat: ExtendedChat) => {
    console.log('🎯 CHAT SELECIONADO:', chat.name);
    setSelectedChat(chat);
    
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
          selectedInstance.id || 'default',
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

  const handleSelectTemplate = (template: any) => {
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

  // Função para renderizar mensagem citada/de resposta - estilo WhatsApp Web
  const renderQuotedMessage = (quotedMsg: any, isFromMe: boolean) => {
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
      <div className="flex items-start gap-2">
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
      </div>
    );
  };

  // Função para extrair conteúdo da mensagem citada - melhorada para API UAZAPI
  const getQuotedMessageContent = (quotedMsg: any): string => {
    console.log('🔍 Extraindo conteúdo da mensagem citada:', quotedMsg);
    
    // Se é string simples, retornar diretamente
    if (typeof quotedMsg === 'string') {
      return quotedMsg;
    }

    // Se não é objeto, tentar converter
    if (!quotedMsg || typeof quotedMsg !== 'object') {
      return String(quotedMsg || 'Mensagem');
    }

    // Prioridade 1: Campo body (mais comum na UAZAPI)
    if (quotedMsg.body) {
      if (typeof quotedMsg.body === 'string') {
        return quotedMsg.body;
      }
      
      // Se body é um objeto (mensagem de mídia)
      if (typeof quotedMsg.body === 'object' && quotedMsg.body !== null) {
        const mediaObj = quotedMsg.body;
        
        // Para mídia com legenda
        if (mediaObj.caption) {
          return mediaObj.caption;
        }
        
        // Para documentos com nome
        if (mediaObj.fileName) {
          return mediaObj.fileName;
        }
        
        // Para outros tipos de mídia, usar tipo genérico
        return getMediaTypeName(quotedMsg.type || 'document');
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
      if (quotedMsg[field] && typeof quotedMsg[field] === 'string') {
        return quotedMsg[field];
      }
    }

    // Prioridade 3: Mensagens de mídia específicas
    if (quotedMsg.type && quotedMsg.type !== 'text') {
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
      
             return mediaTypes[quotedMsg.type as keyof typeof mediaTypes] || `📎 ${getMediaTypeName(quotedMsg.type)}`;
    }

    // Prioridade 4: Verificar estruturas aninhadas
    if (quotedMsg.message) {
      const nestedContent = getQuotedMessageContent(quotedMsg.message);
      if (nestedContent !== 'Mensagem') {
        return nestedContent;
      }
    }

    // Prioridade 5: Usar qualquer campo de string disponível
    const allKeys = Object.keys(quotedMsg);
    for (const key of allKeys) {
      const value = quotedMsg[key];
      if (typeof value === 'string' && value.length > 0 && value !== quotedMsg.id) {
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
      const mediaObj = message.content as any;
      
      // Priorizar legenda se disponível
      if (mediaObj.caption) {
        return mediaObj.caption;
      }
      
      // Fallback para nome do arquivo
      if (mediaObj.fileName) {
        return `📁 ${mediaObj.fileName}`;
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
    
    const matchesFilter = 
      selectedFilter === 'all' ||
      (selectedFilter === 'mine' && chat.agent) ||
      (selectedFilter === 'unassigned' && chat.status === 'unassigned');
    
    return matchesSearch && matchesFilter;
  });

  const unreadCount = chats.filter(chat => chat.unreadCount > 0).length;

  // Método de debug para console do navegador
  useEffect(() => {
    // Expor método de debug no window para acesso via console
    (window as any).debugConversas = async (token?: string) => {
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
      delete (window as any).debugConversas;
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
      
    } catch (error: any) {
      console.error('❌ ERRO AO ENVIAR MÍDIAS:', error);
      toast.error(error.message || 'Erro ao enviar mídias');
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

          {/* Filter Tabs */}
          <div className="flex rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => setSelectedFilter('all')}
              className={cn(
                "flex-1 px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
                selectedFilter === 'all' ? "bg-white text-primary-600 shadow" : "text-gray-500 hover:text-gray-900"
              )}
            >
              Todas
            </button>
            <button
              onClick={() => setSelectedFilter('mine')}
              className={cn(
                "flex-1 px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
                selectedFilter === 'mine' ? "bg-white text-primary-600 shadow" : "text-gray-500 hover:text-gray-900"
              )}
            >
              Minhas
            </button>
            <button
              onClick={() => setSelectedFilter('unassigned')}
              className={cn(
                "flex-1 px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
                selectedFilter === 'unassigned' ? "bg-white text-primary-600 shadow" : "text-gray-500 hover:text-gray-900"
              )}
            >
              Não atribuídas
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
                      (window as any).debugConversas?.(selectedInstance?.token);
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
                onClick={() => handleSelectChat(chat)}
                className={cn(
                  "p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors",
                  selectedChat?.id === chat.id && "bg-primary-50 border-primary-200"
                )}
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                    <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
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
                                                 {chat.status === 'unassigned' && (
                           <div className="w-2 h-2 bg-orange-400 rounded-full" />
                         )}
                                                 {chat.agent && (
                           <User className="h-3 w-3 text-gray-400" />
                         )}
                      </div>
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
                  <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-primary-600 font-medium">
                      {selectedChat.name[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">{selectedChat.name}</h2>
                    <button
                      onClick={() => setShowAssignModal(true)}
                      className="text-sm text-gray-500 hover:text-primary-600 transition-colors"
                    >
                      {selectedChat.agent ? `Atribuída: ${selectedChat.agent}` : 'Não atribuída - Clique para atribuir'}
                    </button>
                  </div>
                </div>
                                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      console.log('🔧 Debug forçado - adicionando mensagem citada para teste');
                      if (selectedChat) {
                        const testMessage: ChatMessage = {
                          id: 'test_quoted_' + Date.now(),
                          chatId: selectedChat.id,
                          content: 'Esta é uma resposta de teste que deveria mostrar a citação',
                          timestamp: Date.now(),
                          fromMe: false,
                          type: 'text',
                          author: 'Sistema',
                          quotedMsg: {
                            body: 'Mensagem original simulada para teste',
                            type: 'text',
                            pushName: 'Rafael Mendes',
                            id: 'test_original',
                            timestamp: Date.now() - 60000
                          }
                        };
                        setMessages(prev => [...prev, testMessage]);
                        console.log('✅ Mensagem de teste com citação adicionada!');
                        
                        // Scroll para o final
                        setTimeout(scrollToBottom, 100);
                      }
                    }}
                    className="p-2 text-orange-500 hover:text-orange-600 rounded-lg hover:bg-orange-50"
                    title="🧪 Testar Mensagem Citada (Debug)"
                  >
                    <span className="text-xs">🧪</span>
                  </button>
                  <button
                    onClick={() => setShowNotesPanel(true)}
                    className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-gray-100"
                    title="Notas internas"
                  >
                    <FileText className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => toast('Funcionalidade em desenvolvimento')}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    title="Arquivar"
                  >
                    <Archive className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => toast('Funcionalidade em desenvolvimento')}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    title="Mais opções"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </button>
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
                    className={cn(
                      "flex group",
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
          onSelect={(instance: any) => {
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
          onAssign={(agent) => {
            console.log('Agente atribuído:', agent);
            setShowAssignModal(false);
          }}
        />
      )}

      {/* Modal de Upload de Mídia */}
      <MediaUploadModal
        isOpen={showMediaModal}
        onClose={() => setShowMediaModal(false)}
        onSendMedia={handleSendMedia}
        chatName={selectedChat?.name || 'Chat'}
      />
    </div>
  );
}

export default ChatPage;