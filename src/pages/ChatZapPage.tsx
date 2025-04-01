import { useState, useEffect, useRef } from 'react';
import { 
  Search, MessageCircle, Phone, Paperclip, Send, MoreVertical, Smartphone, 
  Trash, Check, Reply, Forward, FileText, Mic
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SelectInstanceModal } from '../components/instance/SelectInstanceModal';
import { 
  getChats, 
  getProfileInfo,
  getGroups,
  Group,
  downloadMessageMedia,
  chat,
  message,
  webhook,
  connectToSSE,
  group,
  label,
  searchMessages,
  getAllMessagesFromChat,
  markMessageAsRead,
  searchAllMessages,
  API_URL
} from '../lib/wapi/api';

interface Instance {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'connecting';
  token: string;
}

interface Chat {
  id: string;
  name: string;
  displayNumber?: string;
  lastMessage?: string;
  timestamp?: number;
  unreadCount: number;
  isGroup: boolean;
  profileImage?: string;
  number: string;
  lastSeen?: number; 
}

interface Message {
  id: string;
  messageId?: string;
  sender: string;
  senderName?: string;
  senderProfileImage?: string;
  content: string;
  timestamp: number;
  fromMe?: boolean;
  status?: string;
  read?: boolean;
  mediaType?: string;
  mediaUrl?: string | null;
  chatId?: string;
  quotedMsg?: any;
  isForwarded?: boolean;
  latitude?: number;
  longitude?: number;
  buttons?: any[];
  listItems?: any[];
  fileName?: string;
  contactCard?: string;
  mentionedIds?: string[];
}

// Tipagem para o resultado da função
interface ResultWithKey {
  key?: {
    id: string;
  };
  messageTimestamp?: number;
}

const formatDateTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const FileIcon = ({ className }: { className?: string }) => (
  <FileText className={className} />
);

export function ChatZapPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showInstanceModal, setShowInstanceModal] = useState(true);
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  const [activeTab, setActiveTab] = useState<'chats' | 'groups' | 'labels'>('chats');
  const [labels] = useState<any[]>([]);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [sseConnection, setSseConnection] = useState<any>(null);
  const [showContextMenu, setShowContextMenu] = useState<{x: number, y: number, messageId: string} | null>(null);
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [showSearchMessages, setShowSearchMessages] = useState(false);
  const [messageSearchTerm, setMessageSearchTerm] = useState('');
  const [searchingMessages, setSearchingMessages] = useState(false);
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
  const [searchingGlobally, setSearchingGlobally] = useState(false);
  const [isUsingMockData, setIsUsingMockData] = useState(false);
  const [apiConnectionStatus, setApiConnectionStatus] = useState<'online' | 'offline'>('online');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Emojis de reação comuns
  const commonReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  useEffect(() => {
    if (selectedInstance) {
      loadChats();
      loadGroups();
      setupSSE();
    }
    
    return () => {
      if (sseConnection) {
        sseConnection.close();
      }
    };
  }, [selectedInstance]);

  useEffect(() => {
    setShowInstanceModal(true);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const setupSSE = () => {
    if (!selectedInstance) return;
    
    if (sseConnection) {
      sseConnection.close();
    }
    
    const connection = connectToSSE(
      selectedInstance.id,
      (event) => {
        handleSSEEvent(event);
      },
      selectedInstance.token
    );
    
    setSseConnection(connection);
    console.log('SSE conectado para a instância:', selectedInstance.id);
  };

  const handleSSEEvent = (event: any) => {
    // Eventos de mensagem
    if (event.type === 'message' && event.event === 'received') {
      // Executar toast de notificação para novas mensagens
      const sender = event.data.notifyName || event.data.pushName || event.data.from.split('@')[0];
      const content = event.data.body || event.data.caption || '[Mídia]';
      
      toast.success(`Nova mensagem de ${sender}: ${content.substring(0, 30)}${content.length > 30 ? '...' : ''}`, {
        duration: 4000,
        icon: '💬'
      });
      
      // Se for o chat atual, atualizar mensagens
      if (selectedChat && (event.data.from === selectedChat.id || event.data.key?.remoteJid === selectedChat.id)) {
        loadMessages(selectedChat.id);
      }
      
      // Atualizar a lista de chats
      loadChats();
    }
    // Eventos de status de mensagem
    else if (event.type === 'message' && event.event === 'update') {
      console.log('Status de mensagem atualizado:', event.data);
      
      // Atualizar status de mensagem no estado atual
      if (event.data.status) {
        setMessages(prev => 
          prev.map(msg => 
            msg.messageId === event.data.key?.id ? { ...msg, status: event.data.status } : msg
          )
        );
      }
    }
    // Eventos de conexão
    else if (event.type === 'connection') {
      console.log('Status de conexão atualizado:', event.data);
      try {
        toast(`Status da conexão: ${event.data.status}`, {
          icon: event.data.status === 'connected' ? '✅' : event.data.status === 'disconnected' ? '❌' : '⚠️'
        });
      } catch (error) {
        console.error('Erro ao mostrar toast:', error);
      }
      
      // Recarregar instâncias se o status mudou
      setTimeout(() => {
        if (selectedInstance) {
          // Verificar se a instância atual ainda está conectada
          fetch(`${API_URL}/instance/status`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'token': selectedInstance.token
            }
          })
          .then(res => res.json())
          .then(data => {
            if (data.status !== 'connected') {
              toast.error('A conexão com o WhatsApp foi perdida. Por favor, reconecte sua instância.');
              setShowInstanceModal(true);
            }
          })
          .catch(err => {
            console.error('Erro ao verificar status da instância:', err);
          });
        }
      }, 2000);
    }
    // Outros eventos
    else {
      console.log('Evento SSE recebido:', event);
    }
  };

  const loadChats = async () => {
    if (!selectedInstance) return;

    try {
      setLoading(true);
      setError(null);
      setApiConnectionStatus('online');
      setIsUsingMockData(false);

      const rawChats = await getChats(selectedInstance.id, searchTerm, selectedInstance.token);
      console.log('Chats carregados:', rawChats);

      // Verificar se estamos usando dados de exemplo
      const isMockData = rawChats.some((chat: any) => chat.name.includes('(EXEMPLO)'));
      setIsUsingMockData(isMockData);
      
      if (isMockData) {
        setApiConnectionStatus('offline');
        toast.error('Mostrando dados de exemplo devido a problemas de conexão com a API', {
          duration: 5000
        });
      }

      const formattedChats: Chat[] = rawChats.map((chat: any) => {
        const chatId = chat.jid || chat.id;
        
        const isGroup = chat.isGroup || chatId.includes('g.us');
        
        let displayName = chat.name;
        if (!displayName || displayName === chatId.split('@')[0]) {
          displayName = isGroup ? 'Grupo' : 'Contato';
        }
        
        // Formatar o número para exibição
        const formattedNumber = chatId.includes('@') ? chatId.split('@')[0] : chatId;
        
        return {
          id: chatId,
          name: displayName,
          displayNumber: formattedNumber,
          lastMessage: chat.lastMessage?.message || '',
          timestamp: chat.lastMessage?.timestamp ? new Date(chat.lastMessage.timestamp).getTime() : Date.now(),
          unreadCount: chat.unreadCount || 0,
          isGroup: isGroup,
          profileImage: chat.profilePicture || chat.imgUrl || '',
          number: chat.number || chatId,
          lastSeen: chat.lastSeen, 
        };
      });

      setChats(formattedChats);
      
      // Carregar imagens de perfil para cada chat
      for (const chat of formattedChats) {
        await loadProfilePicture(chat.id);
      }
      
      setError(null);
    } catch (error: any) {
      setApiConnectionStatus('offline');
      setIsUsingMockData(true);
      console.error('Erro ao carregar conversas:', error);
      if (error.response?.status === 502 || error.response?.status === 500) {
        setError('O servidor está temporariamente indisponível. Por favor, tente novamente em alguns minutos.');
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        setError('Erro de autenticação. Verifique suas credenciais.');
      } else {
        setError(`Erro ao carregar conversas: ${error.response?.data?.message || error.message || 'Erro desconhecido'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    if (!selectedInstance) return;

    try {
      const response = await getGroups(selectedInstance.id, selectedInstance.token);
      console.log('Grupos carregados:', response);
      
      if (response && Array.isArray(response)) {
        setGroups(response as Group[]);
      } else if (response && typeof response === 'object') {
        type GroupResponse = { groups?: Group[] };
        const groupResponse = response as GroupResponse;
        
        if (groupResponse.groups && Array.isArray(groupResponse.groups)) {
          setGroups(groupResponse.groups);
        } else {
          setGroups([]);
        }
      } else {
        setGroups([]);
      }
    } catch (error) {
      console.error('Erro ao carregar grupos:', error);
      setGroups([]);
    }
  };

  const loadProfilePicture = async (chatId: string) => {
    if (!selectedInstance) return;
    
    try {
      const number = chatId.includes('@') ? chatId.split('@')[0] : chatId;
      const profileInfo = await getProfileInfo(
        number,
        selectedInstance.token
      );
      
      if (profileInfo && profileInfo.imageUrl) {
        // Atualizar a imagem de perfil no chat correspondente
        setChats(prev => 
          prev.map(chat => 
            chat.id === chatId 
              ? { ...chat, profileImage: profileInfo.imageUrl } 
              : chat
          )
        );
      }
    } catch (error) {
      console.error(`Erro ao carregar foto de perfil para ${chatId}:`, error);
    }
  };

  useEffect(() => {
    if (selectedInstance) {
      if (activeTab === 'chats') {
        loadChats();
      } else {
        loadGroups();
      }
    }
  }, [searchTerm, selectedInstance, activeTab]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedChat || !selectedInstance) {
      return;
    }

    try {
      setMessageInput('');
      
      const tempId = `temp-${Date.now()}`;
      const newMessage: Message = {
        id: tempId,
        messageId: tempId,
        sender: 'me',
        content: messageInput,
        timestamp: Date.now(),
        status: 'sending',
        fromMe: true,
        chatId: selectedChat.id
      };
      
      setMessages(prev => [...prev, newMessage]);
      scrollToBottom();
      
      // Configurar opções de envio
      const options: any = {};
      
      // Verificar se há menções no texto (formato @número)
      const mentionRegex = /@(\d+)/g;
      const mentions = messageInput.match(mentionRegex);
      
      if (mentions && mentions.length > 0) {
        options.mentions = mentions.map(m => m.substring(1) + '@s.whatsapp.net');
      }
      
      // Se a mensagem é uma resposta a outra mensagem
      if (replyingTo) {
        try {
          const result: ResultWithKey = await message.reply(
            selectedInstance.id,
            selectedChat.id,
            messageInput,
            replyingTo.messageId || '',
            options,
            selectedInstance.token
          );
          
          console.log('Resposta enviada:', result);
          setReplyingTo(null);
          
          // Atualizar a mensagem no estado com os dados reais
          if (result && result.key && result.key.id) {
            setMessages(prev => 
              prev.map(msg => 
                msg.id === tempId ? { 
                  ...msg, 
                  id: result.key!.id, 
                  messageId: result.key!.id,
                  status: 'sent',
                  timestamp: result.messageTimestamp ? result.messageTimestamp * 1000 : Date.now()
                } : msg
              )
            );
          } else {
            setMessages(prev => 
              prev.map(msg => 
                msg.id === tempId ? { ...msg, status: 'sent' } : msg
              )
            );
          }
        } catch (error) {
          console.error('Erro ao responder mensagem:', error);
          setMessages(prev => 
            prev.map(msg => 
              msg.id === tempId ? { ...msg, status: 'failed' } : msg
            )
          );
          toast.error('Erro ao responder mensagem. Tente novamente.');
          return;
        }
      } else {
        // Mensagem normal (sem resposta)
        try {
          const result: ResultWithKey = await message.sendText(
            selectedInstance.id,
            selectedChat.id,
            messageInput,
            options,
            selectedInstance.token
          );
          
          console.log('Mensagem enviada:', result);
          
          // Atualizar a mensagem no estado com os dados reais
          if (result && result.key && result.key.id) {
            setMessages(prev => 
              prev.map(msg => 
                msg.id === tempId ? { 
                  ...msg, 
                  id: result.key!.id, 
                  messageId: result.key!.id,
                  status: 'sent',
                  timestamp: result.messageTimestamp ? result.messageTimestamp * 1000 : Date.now()
                } : msg
              )
            );
          } else {
            setMessages(prev => 
              prev.map(msg => 
                msg.id === tempId ? { ...msg, status: 'sent' } : msg
              )
            );
          }
        } catch (error) {
          console.error('Erro ao enviar mensagem:', error);
          setMessages(prev => 
            prev.map(msg => 
              msg.id === tempId ? { ...msg, status: 'failed' } : msg
            )
          );
          toast.error('Erro ao enviar mensagem. Tente novamente.');
          return;
        }
      }
      
      // Atualizar a lista de mensagens 1.5 segundo depois para sincronizar com o servidor
      setTimeout(() => {
        loadMessages(selectedChat.id);
      }, 1500);
      
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem. Tente novamente.');
    }
  };

  const _handleAttachmentClick = () => {
    setShowAttachmentOptions(prev => !prev);
  };

  const _handleRecordAudio = () => {
    toast('Gravação de áudio não implementada ainda.');
  };

  const _handleFileSelect = (type: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = type === 'image' 
        ? 'image/*' 
        : type === 'video' 
          ? 'video/*' 
          : type === 'audio' 
            ? 'audio/*' 
            : type === 'document' 
              ? '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt' 
              : '';
      
      fileInputRef.current.click();
    }
    setShowAttachmentOptions(false);
  };

  const _handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files.length || !selectedChat || !selectedInstance) {
      return;
    }
    
    try {
      const file = event.target.files[0];
      const fileType = file.type.split('/')[0]; 
      const fileSizeMB = file.size / (1024 * 1024);
      
      // Verificar tamanho do arquivo
      if (fileSizeMB > 16) {
        toast.error('O arquivo é maior que 16MB. Por favor, selecione um arquivo menor.');
        return;
      }
      
      toast.loading('Enviando arquivo...', { id: 'upload' });
      
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        let result: ResultWithKey;
        
        // Criar uma mensagem temporária para mostrar progresso
        const tempId = `temp-file-${Date.now()}`;
        let tempMessage: Message = {
          id: tempId,
          messageId: tempId,
          sender: 'me',
          content: `Enviando ${file.name}...`,
          timestamp: Date.now(),
          status: 'sending',
          fromMe: true,
          chatId: selectedChat.id,
          mediaType: fileType
        };
        
        setMessages(prev => [...prev, tempMessage]);
        scrollToBottom();
        
        try {
          if (fileType === 'image') {
            const caption = prompt('Digite uma legenda para a imagem (opcional):') || '';
            result = await message.sendImage(
              selectedInstance.id,
              selectedChat.id,
              dataUrl,
              caption,
              {},
              selectedInstance.token
            ) as ResultWithKey;
            
            // Atualizar a mensagem temporária
            tempMessage = {
              ...tempMessage,
              content: caption || '[Imagem]',
              mediaUrl: URL.createObjectURL(file)
            };
          } 
          else if (fileType === 'video') {
            const caption = prompt('Digite uma legenda para o vídeo (opcional):') || '';
            result = await message.sendVideo(
              selectedInstance.id,
              selectedChat.id,
              dataUrl,
              caption,
              {},
              selectedInstance.token
            ) as ResultWithKey;
            
            // Atualizar a mensagem temporária
            tempMessage = {
              ...tempMessage,
              content: caption || '[Vídeo]',
              mediaUrl: URL.createObjectURL(file)
            };
          } 
          else if (fileType === 'audio') {
            result = await message.sendAudio(
              selectedInstance.id,
              selectedChat.id,
              dataUrl,
              {},
              selectedInstance.token
            ) as ResultWithKey;
            
            // Atualizar a mensagem temporária
            tempMessage = {
              ...tempMessage,
              content: '[Áudio]',
              mediaUrl: URL.createObjectURL(file)
            };
          } 
          else {
            result = await message.sendDocument(
              selectedInstance.id,
              selectedChat.id,
              dataUrl,
              file.name,
              '',
              {},
              selectedInstance.token
            ) as ResultWithKey;
            
            // Atualizar a mensagem temporária
            tempMessage = {
              ...tempMessage,
              content: `[Documento] ${file.name}`,
              fileName: file.name
            };
          }
          
          // Atualizar mensagem temporária com ID real
          if (result && result.key && result.key.id) {
            setMessages(prev => 
              prev.map(msg => 
                msg.id === tempId ? { 
                  ...tempMessage, 
                  id: result.key!.id, 
                  messageId: result.key!.id,
                  status: 'sent',
                  timestamp: result.messageTimestamp ? result.messageTimestamp * 1000 : Date.now()
                } : msg
              )
            );
          } else {
            setMessages(prev => 
              prev.map(msg => 
                msg.id === tempId ? { ...tempMessage, status: 'sent' } : msg
              )
            );
          }
          
          toast.success('Arquivo enviado com sucesso!', { id: 'upload' });
          
          // Recarregar mensagens após um pequeno delay
          setTimeout(() => {
            loadMessages(selectedChat.id);
          }, 1500);
        } catch (error) {
          console.error('Erro ao enviar arquivo:', error);
          setMessages(prev => 
            prev.map(msg => 
              msg.id === tempId ? { ...tempMessage, status: 'failed', content: 'Falha ao enviar arquivo' } : msg
            )
          );
          toast.error('Erro ao enviar arquivo. Tente novamente.', { id: 'upload' });
        }
      };
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast.error('Erro ao processar arquivo. Tente novamente.', { id: 'upload' });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const _handleSendLocation = async () => {
    if (!selectedChat || !selectedInstance) return;
    
    try {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const title = prompt('Digite um título para a localização (opcional):') || '';
          const address = prompt('Digite um endereço para a localização (opcional):') || '';
          
          await message.sendLocation(
            selectedInstance.id,
            selectedChat.id,
            latitude,
            longitude,
            title,
            address,
            {},
            selectedInstance.token
          );
          
          toast.success('Localização enviada com sucesso!');
          await loadMessages(selectedChat.id);
        },
        (error) => {
          console.error('Erro ao obter localização:', error);
          toast.error('Não foi possível obter sua localização. Verifique as permissões.');
        }
      );
    } catch (error) {
      console.error('Erro ao enviar localização:', error);
      toast.error('Erro ao enviar localização. Tente novamente.');
    }
  };

  const handleReplyMessage = (msg: Message) => {
    setReplyingTo(msg);
    setShowContextMenu(null);
  };

  const handleForwardMessage = (msg: Message) => {
    setForwardingMessage(msg);
    setShowContextMenu(null);
  };

  const confirmForward = async (targetChatId: string) => {
    if (!forwardingMessage || !selectedInstance) return;
    
    try {
      await message.forward(
        selectedInstance.id,
        targetChatId,
        forwardingMessage.messageId || '',
        {},
        selectedInstance.token
      );
      
      toast.success('Mensagem encaminhada com sucesso!');
      setForwardingMessage(null);
    } catch (error) {
      console.error('Erro ao encaminhar mensagem:', error);
      toast.error('Erro ao encaminhar mensagem. Tente novamente.');
    }
  };

  const handleDeleteMessage = async (msg: Message) => {
    if (!msg.messageId || !selectedInstance) return;
    
    try {
      const confirmDelete = window.confirm('Tem certeza que deseja excluir esta mensagem?');
      if (!confirmDelete) return;
      
      await message.delete(
        selectedInstance.id,
        msg.messageId,
        false,
        selectedInstance.token
      );
      
      setMessages(prev => prev.filter(m => m.id !== msg.id));
      
      toast.success('Mensagem excluída com sucesso!');
      setShowContextMenu(null);
    } catch (error) {
      console.error('Erro ao excluir mensagem:', error);
      toast.error('Erro ao excluir mensagem. Tente novamente.');
    }
  };

  const handleMessageContextMenu = (e: React.MouseEvent, messageId: string) => {
    e.preventDefault();
    setShowContextMenu({
      x: e.clientX,
      y: e.clientY,
      messageId
    });
  };

  const _handleReactToMessage = async (messageId: string, emoji: string) => {
    const msg = messages.find((m) => m.id === messageId);
    
    if (!msg || !msg.messageId || !selectedInstance) return;
    
    try {
      toast.loading('Enviando reação...', { id: 'reaction' });
      
      await message.react(
        selectedInstance.id,
        msg.messageId,
        emoji,
        selectedInstance.token
      );
      
      toast.success(`Reação enviada!`, { id: 'reaction' });
      setShowEmojiPicker(null);
      setShowContextMenu(null);
      
      // Atualizar a lista de mensagens após um pequeno delay
      setTimeout(() => {
        loadMessages(selectedChat!.id);
      }, 1000);
    } catch (error) {
      console.error('Erro ao reagir à mensagem:', error);
      toast.error('Erro ao reagir à mensagem. Tente novamente.', { id: 'reaction' });
    }
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setShowContextMenu(null);
    };
    
    document.addEventListener('click', handleClickOutside);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const loadMessages = async (chatId: string) => {
    try {
      setLoading(true);
      setError(null);

      if (!selectedInstance) return;

      // Primeiro tentamos buscar todas as mensagens do chat
      const messagesResponse = await getAllMessagesFromChat(
        selectedInstance.id, 
        chatId, 
        selectedInstance.token
      );
      
      console.log('Mensagens carregadas:', messagesResponse);

      let rawMessages;
      
      if (messagesResponse && Array.isArray(messagesResponse.messages) && messagesResponse.messages.length > 0) {
        rawMessages = messagesResponse.messages;
      } else {
        // Fallback para o método anterior
        const oldResponse = await chat.fetchMessages(selectedInstance.id, chatId, 50, selectedInstance.token);
        console.log('Mensagens carregadas (método antigo):', oldResponse);
        
        if (!oldResponse || !oldResponse.messages) {
          setMessages([]);
          return;
        }
        
        rawMessages = oldResponse.messages;
      }

      // Criamos um conjunto de formattedMessages usando um objeto vazio
      const formattedMessages = [];
      
      // Iteramos sobre as mensagens
      for (const msg of rawMessages) {
        const isFromMe = msg.fromMe || msg.key?.fromMe || false;
        let content = '';
        let mediaType = '';
        let sender = '';
        let senderName = '';
        let senderProfileImage = '';
        
        // Determinar o remetente da mensagem
        if (isFromMe) {
          sender = 'me';
          senderName = 'Você';
        } else {
          // Verificamos se o msg.sender ou msg.from existe
          sender = msg.sender || msg.from || msg.key?.participant || msg.key?.remoteJid || chatId;
          
          // Se o remetente não for eu, buscamos as informações de perfil
          try {
            // Obtemos o número a partir do JID
            const number = sender.includes('@') ? sender.split('@')[0] : sender;
            
            // Buscamos informações de perfil
            const profileInfo = await getProfileInfo(number, selectedInstance.token);
            
            if (profileInfo) {
              senderName = profileInfo.name || number;
              senderProfileImage = profileInfo.imageUrl || '';
            } else {
              senderName = number;
            }
          } catch (error) {
            console.error('Erro ao carregar informações do remetente:', error);
            senderName = sender.includes('@') ? sender.split('@')[0] : sender;
          }
        }
        
        // Determinar o tipo de mensagem com base no messageType (formato Uazapi)
        if (msg.type === 'chat' || msg.type === 'text' || msg.messageType === 'conversation' || msg.messageType === 'extendedTextMessage') {
          content = msg.body || msg.message || msg.content?.text || msg.text || '';
          mediaType = '';
        } 
        else if (msg.type === 'image' || msg.messageType === 'imageMessage') {
          content = '[Imagem]' + (msg.caption || msg.content?.caption ? ': ' + (msg.caption || msg.content?.caption) : '');
          mediaType = 'image';
        } 
        else if (msg.type === 'video' || msg.messageType === 'videoMessage') {
          content = '[Vídeo]' + (msg.caption || msg.content?.caption ? ': ' + (msg.caption || msg.content?.caption) : '');
          mediaType = 'video';
        } 
        else if (msg.type === 'document' || msg.messageType === 'documentMessage') {
          content = '[Documento]' + (msg.fileName || msg.content?.fileName ? ': ' + (msg.fileName || msg.content?.fileName) : '');
          mediaType = 'document';
        } 
        else if (msg.type === 'audio' || msg.type === 'ptt' || msg.messageType === 'audioMessage' || msg.messageType === 'pttMessage') {
          content = '[Áudio]';
          mediaType = 'audio';
        } 
        else if (msg.type === 'location' || msg.messageType === 'locationMessage') {
          content = '[Localização]';
          mediaType = 'location';
          // Se tiver coordenadas, extrair latitude e longitude
          if (msg.content?.location) {
            msg.latitude = msg.content.location.degreesLatitude;
            msg.longitude = msg.content.location.degreesLongitude;
          }
        } 
        else if (msg.type === 'sticker' || msg.messageType === 'stickerMessage') {
          content = '[Sticker]';
          mediaType = 'sticker';
        }
        else if (msg.type === 'vcard' || msg.messageType === 'contactMessage' || msg.messageType === 'contactsArrayMessage') {
          content = '[Contato]';
          mediaType = 'contact';
        }
        else if (msg.type === 'buttonsMessage' || msg.messageType === 'buttonsMessage') {
          content = msg.content?.text || '[Mensagem com botões]';
          mediaType = 'buttons';
        }
        else if (msg.type === 'templateMessage' || msg.messageType === 'templateMessage') {
          content = msg.content?.text || '[Mensagem de modelo]';
          mediaType = 'template';
        }
        else if (msg.type === 'listMessage' || msg.messageType === 'listMessage') {
          content = msg.content?.text || '[Lista]';
          mediaType = 'list';
        }
        else {
          content = msg.body || msg.message || msg.content?.text || `[${msg.type || msg.messageType || 'Desconhecido'}]`;
        }
        
        // Verificar se é uma mensagem encaminhada
        const isForwarded = msg.isForwarded || (msg.messageContextInfo && msg.messageContextInfo.isForwarded) || false;
        
        // Verificar se é uma resposta a outra mensagem
        const quotedMsg = msg.quotedMsg || msg.quotedMessage || null;
        let quotedMsgData = null;
        
        if (quotedMsg) {
          const quotedContent = quotedMsg.body || quotedMsg.message || quotedMsg.content?.text || '';
          const quotedSender = quotedMsg.sender || quotedMsg.participant || '';
          quotedMsgData = {
            id: quotedMsg.id || '',
            sender: quotedSender,
            content: quotedContent,
            fromMe: quotedMsg.fromMe || false
          };
        }
        
        // Estado de leitura da mensagem
        const readStatus = msg.status || (msg.read ? 'read' : 'delivered');
        
        // Extrair o ID da mensagem de forma confiável
        const messageId = msg.id || msg.key?.id || `msg-${Date.now()}-${Math.random()}`;
        
        formattedMessages.push({
          id: messageId,
          messageId: messageId,
          sender: sender,
          senderName: senderName,
          senderProfileImage: senderProfileImage,
          content: content,
          timestamp: new Date(msg.timestamp || msg.messageTimestamp || Date.now()).getTime(),
          status: readStatus,
          fromMe: isFromMe,
          read: msg.read || false,
          mediaType: mediaType,
          mediaUrl: null,
          chatId: chatId,
          quotedMsg: quotedMsgData,
          isForwarded: isForwarded,
          latitude: msg.latitude,
          longitude: msg.longitude,
          // Dados adicionais para mensagens ricas
          buttons: msg.buttons || msg.content?.buttons || [],
          listItems: msg.listItems || msg.content?.items || [],
          fileName: msg.fileName || msg.content?.fileName || '',
          contactCard: msg.contactCard || msg.content?.vcard || '',
          mentionedIds: msg.mentionedJidList || []
        });
      }

      setMessages(formattedMessages);

      // Carregar mídia para todas as mensagens que possuem mídia
      formattedMessages.forEach(async (msg: Message) => {
        if (msg.mediaType && msg.messageId) {
          try {
            const mediaData = await downloadMessageMedia(
              selectedInstance.id,
              msg.messageId,
              selectedInstance.token
            );
            
            if (mediaData && mediaData.url) {
              setMessages(prev => 
                prev.map(m => 
                  m.id === msg.id ? { ...m, mediaUrl: mediaData.url } : m
                )
              );
            }
          } catch (error) {
            console.error(`Erro ao baixar mídia para mensagem ${msg.id}:`, error);
          }
        }
      });

      // Atualizar informações do perfil
      await loadProfileInfo(chatId);
      
      // Marcar todas as mensagens como lidas
      const unreadMessages = formattedMessages.filter((msg: Message) => !msg.fromMe && !msg.read);
      if (unreadMessages.length > 0) {
        try {
          for (const msg of unreadMessages) {
            if (msg.messageId) {
              await markMessageAsRead(
                selectedInstance.id,
                msg.messageId,
                selectedInstance.token
              );
            }
          }
        } catch (error) {
          console.error('Erro ao marcar mensagens como lidas:', error);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      setError('Falha ao carregar mensagens. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const loadProfileInfo = async (chatId: string) => {
    if (!selectedInstance) return;
    
    try {
      const number = chatId.includes('@') ? chatId.split('@')[0] : chatId;
      const profileInfo = await getProfileInfo(
        number,
        selectedInstance.token
      );
      
      if (profileInfo && profileInfo.success && selectedChat) {
        setSelectedChat(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            name: profileInfo.name || prev.name,
            profileImage: profileInfo.imageUrl || prev.profileImage
          };
        });
      }
    } catch (error) {
      console.error('Erro ao carregar informações do perfil:', error);
    }
  };

  const _handleViewProfileImage = async (chat: Chat) => {
    if (!selectedInstance) return;
    
    try {
      const number = chat.number || chat.id.split('@')[0];
      const profileInfo = await getProfileInfo(
        number,
        selectedInstance.token
      );
      
      if (profileInfo && profileInfo.imageUrl) {
        window.open(profileInfo.imageUrl, '_blank');
      } else {
        toast.error('Imagem de perfil não disponível');
      }
    } catch (error) {
      toast.error('Erro ao buscar imagem de perfil');
    }
  };

  const _handleChatAction = async (action: string) => {
    if (!selectedChat || !selectedInstance) {
      toast.error('Nenhum chat selecionado ou instância não conectada');
      return;
    }

    try {
      const dropdownMenu = document.getElementById('chatOptionsDropdown');
      if (dropdownMenu) {
        dropdownMenu.classList.add('hidden');
      }

      switch (action) {
        case 'archive':
          toast.promise(
            chat.archive(selectedInstance.id, selectedChat.id, true, selectedInstance.token),
            {
              loading: 'Arquivando conversa...',
              success: 'Conversa arquivada com sucesso!',
              error: 'Erro ao arquivar conversa'
            }
          );
          break;

        case 'pin':
          toast.promise(
            chat.pin(selectedInstance.id, selectedChat.id, true, selectedInstance.token),
            {
              loading: 'Fixando conversa...',
              success: 'Conversa fixada com sucesso!',
              error: 'Erro ao fixar conversa'
            }
          );
          break;

        case 'mute':
          toast.promise(
            chat.mute(selectedInstance.id, selectedChat.id, 8 * 60 * 60, selectedInstance.token), 
            {
              loading: 'Silenciando notificações...',
              success: 'Notificações silenciadas com sucesso!',
              error: 'Erro ao silenciar notificações'
            }
          );
          break;

        case 'clear':
          if (window.confirm('Tem certeza que deseja limpar todas as mensagens desta conversa?')) {
            await toast.promise(
              chat.clear(selectedInstance.id, selectedChat.id, selectedInstance.token),
              {
                loading: 'Limpando mensagens...',
                success: 'Mensagens limpas com sucesso!',
                error: 'Erro ao limpar mensagens'
              }
            );
            setMessages([]);
          }
          break;

        case 'delete':
          if (window.confirm('Tem certeza que deseja excluir esta conversa? Esta ação não pode ser desfeita.')) {
            await toast.promise(
              chat.delete(selectedInstance.id, selectedChat.id, selectedInstance.token),
              {
                loading: 'Excluindo conversa...',
                success: 'Conversa excluída com sucesso!',
                error: 'Erro ao excluir conversa'
              }
            );
            setSelectedChat(null);
            loadChats();
          }
          break;

        default:
          toast.error('Ação não implementada');
      }
    } catch (error) {
      console.error(`Erro ao executar ação ${action}:`, error);
      toast.error(`Erro ao executar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const _handleMarkMessageAsRead = async (messageId: string) => {
    if (!selectedInstance) return;
    
    try {
      await chat.markMessageAsRead(
        selectedInstance.id,
        messageId,
        selectedInstance.token
      );
      
      setMessages(prev => 
        prev.map(m => 
          m.messageId === messageId 
            ? { ...m, read: true } 
            : m
        )
      );
    } catch (error) {
      console.error('Erro ao marcar mensagem como lida:', error);
      toast.error('Erro ao marcar mensagem como lida');
    }
  };

  const _handleSelectChat = (chat: Chat) => {
    setSelectedChat(chat);
    loadMessages(chat.id);
    
    try {
      console.log('Marcando mensagens como lidas para o chat:', chat.id);
    } catch (error) {
      console.error('Erro ao marcar mensagens como lidas:', error);
    }
  };

  const _handleCreateGroup = async () => {
    if (!selectedInstance) return;
    
    try {
      const groupName = prompt('Digite o nome do grupo:');
      if (!groupName) return;
      
      const participantsInput = prompt('Digite os números dos participantes separados por vírgula:');
      if (!participantsInput) return;
      
      const participants = participantsInput.split(',').map(num => num.trim());
      
      const _result = await group.create(
        selectedInstance.id,
        groupName,
        participants,
        selectedInstance.token
      );
      
      if (_result && _result.groupId) {
        toast.success(`Grupo "${groupName}" criado com sucesso!`);
        loadGroups();
      } else {
        throw new Error('Falha ao criar grupo');
      }
    } catch (error) {
      console.error('Erro ao criar grupo:', error);
      toast.error('Erro ao criar grupo. Verifique os números e tente novamente.');
    }
  };

  const _handleAddParticipants = async (groupId: string) => {
    if (!selectedInstance) return;
    
    try {
      const participantsInput = prompt('Digite os números dos participantes a adicionar separados por vírgula:');
      if (!participantsInput) return;
      
      const participants = participantsInput.split(',').map(num => num.trim());
      
      await group.addParticipants(
        selectedInstance.id,
        groupId,
        participants,
        selectedInstance.token
      );
      
      toast.success('Participantes adicionados com sucesso!');
      loadGroups();
    } catch (error) {
      console.error('Erro ao adicionar participantes:', error);
      toast.error('Erro ao adicionar participantes. Tente novamente.');
    }
  };

  const _handleRemoveParticipant = async (groupId: string) => {
    if (!selectedInstance) return;
    
    try {
      const participantInput = prompt('Digite o número do participante a remover:');
      if (!participantInput) return;
      
      await group.removeParticipants(
        selectedInstance.id,
        groupId,
        [participantInput.trim()],
        selectedInstance.token
      );
      
      toast.success('Participante removido com sucesso!');
      loadGroups();
    } catch (error) {
      console.error('Erro ao remover participante:', error);
      toast.error('Erro ao remover participante. Tente novamente.');
    }
  };

  const _handlePromoteParticipant = async (groupId: string) => {
    if (!selectedInstance) return;
    
    try {
      const participantInput = prompt('Digite o número do participante a promover a admin:');
      if (!participantInput) return;
      
      await group.promoteParticipants(
        selectedInstance.id,
        groupId,
        [participantInput.trim()],
        selectedInstance.token
      );
      
      toast.success('Participante promovido a admin com sucesso!');
    } catch (error) {
      console.error('Erro ao promover participante:', error);
      toast.error('Erro ao promover participante. Tente novamente.');
    }
  };

  const _handleCreateLabel = async () => {
    if (!selectedInstance) return;
    
    try {
      const labelName = prompt('Digite o nome da etiqueta:');
      if (!labelName) return;
      
      await label.create(
        selectedInstance.id,
        labelName,
        selectedInstance.token
      );
      
      toast.success(`Etiqueta "${labelName}" criada com sucesso!`);
      loadChats();
    } catch (error) {
      console.error('Erro ao criar etiqueta:', error);
      toast.error('Erro ao criar etiqueta. Tente novamente.');
    }
  };

  const _handleAddLabelToChat = async (chatId: string) => {
    if (!selectedInstance || !labels.length) return;
    
    try {
      const labelOptions = labels.map(l => `${l.id}: ${l.name}`).join('\n');
      const labelIdInput = prompt(`Digite o ID da etiqueta a adicionar:\n${labelOptions}`);
      if (!labelIdInput) return;
      
      await label.addToChat(
        selectedInstance.id,
        chatId,
        labelIdInput.trim(),
        selectedInstance.token
      );
      
      toast.success('Etiqueta adicionada ao chat com sucesso!');
      loadChats();
    } catch (error) {
      console.error('Erro ao adicionar etiqueta ao chat:', error);
      toast.error('Erro ao adicionar etiqueta. Tente novamente.');
    }
  };

  const _handleRemoveLabelFromChat = async (chatId: string, labelId: string) => {
    if (!selectedInstance) return;
    
    try {
      await label.removeFromChat(
        selectedInstance.id,
        chatId,
        labelId,
        selectedInstance.token
      );
      
      toast.success('Etiqueta removida do chat com sucesso!');
      loadChats();
    } catch (error) {
      console.error('Erro ao remover etiqueta do chat:', error);
      toast.error('Erro ao remover etiqueta. Tente novamente.');
    }
  };

  const _handleConfigureWebhook = async () => {
    if (!selectedInstance) return;
    
    try {
      const webhookUrl = prompt('Digite a URL do webhook:');
      if (!webhookUrl) return;
      
      const eventsInput = prompt('Digite os eventos a escutar separados por vírgula (ex: message,connection):');
      if (!eventsInput) return;
      
      const events = eventsInput.split(',').map(e => e.trim());
      
      await webhook.set(
        selectedInstance.id,
        webhookUrl,
        events,
        selectedInstance.token
      );
      
      // setWebhookSettings({ url: webhookUrl, events });
      toast.success('Webhook configurado com sucesso!');
    } catch (error) {
      console.error('Erro ao configurar webhook:', error);
      toast.error('Erro ao configurar webhook. Tente novamente.');
    }
  };

  // Renderiza a visualização de mídia na mensagem
  const _renderMediaPreview = (message: Message) => {
    if (!message.mediaUrl && !message.mediaType) return null;
    
    if (message.mediaType === 'location' && message.latitude && message.longitude) {
      // Renderizar preview de localização
      return (
        <div className="media-preview mb-2">
          <div className="bg-gray-200 rounded-lg p-2 relative overflow-hidden" style={{height: '150px'}}>
            <img 
              src={`https://maps.googleapis.com/maps/api/staticmap?center=${message.latitude},${message.longitude}&zoom=15&size=300x150&markers=color:red%7C${message.latitude},${message.longitude}&key=YOUR_API_KEY`} 
              alt="Localização" 
              className="w-full h-full object-cover rounded"
            />
            <div className="absolute bottom-2 left-2 right-2 bg-white/80 p-1 rounded text-xs text-gray-800">
              Localização compartilhada
            </div>
          </div>
        </div>
      );
    }
    
    if (!message.mediaUrl) return null;
    
    switch (message.mediaType) {
      case 'image':
        return (
          <div className="media-preview mb-2">
            <img 
              src={message.mediaUrl} 
              alt="Imagem" 
              className="max-w-full max-h-60 rounded-lg cursor-pointer"
              onClick={() => window.open(message.mediaUrl!, '_blank')}
            />
          </div>
        );
      case 'video':
        return (
          <div className="media-preview mb-2">
            <video 
              src={message.mediaUrl} 
              controls 
              className="max-w-full max-h-60 rounded-lg"
            />
          </div>
        );
      case 'audio':
        return (
          <div className="media-preview mb-2 flex items-center">
            <audio 
              src={message.mediaUrl} 
              controls 
              className="w-full h-10"
            />
          </div>
        );
      case 'document':
        return (
          <div className="media-preview mb-2 flex items-center bg-blue-50 p-2 rounded-lg">
            <FileIcon className="w-8 h-8 text-blue-600 mr-2" />
            <div className="flex-1 overflow-hidden">
              <div className="text-xs font-medium truncate">{message.fileName || 'Documento'}</div>
              <a 
                href={message.mediaUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-600"
              >
                Abrir documento
              </a>
            </div>
          </div>
        );
      case 'sticker':
        return (
          <div className="media-preview mb-2">
            <img 
              src={message.mediaUrl} 
              alt="Sticker" 
              className="max-w-full max-h-36"
            />
          </div>
        );
      case 'contact':
        return (
          <div className="media-preview mb-2 flex items-center bg-gray-50 p-2 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
              <Phone className="w-4 h-4 text-gray-600" />
            </div>
            <div className="text-xs">Contato compartilhado</div>
          </div>
        );
      default:
        return null;
    }
  };

  // Renderiza a mensagem completa com todos os elementos
  const _renderMessage = (msg: Message, index: number) => {
    const isFromMe = msg.fromMe || msg.sender === 'me';
    
    return (
      <div
        key={msg.id}
        id={`msg-${msg.id}`}
        className={`flex ${isFromMe ? 'justify-end' : 'justify-start'} mb-3`}
        onContextMenu={(e) => handleMessageContextMenu(e, msg.id)}
      >
        {!isFromMe && (
          <div className="h-8 w-8 rounded-full mr-2 overflow-hidden flex-shrink-0">
            {msg.senderProfileImage ? (
              <img 
                src={msg.senderProfileImage} 
                alt={msg.senderName || 'Contato'} 
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gray-300 flex items-center justify-center text-xs">
                {(msg.senderName || '?').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        )}
        <div
          className={`relative max-w-[80%] p-2 rounded-lg shadow-sm ${
            isFromMe 
              ? 'bg-[#dcf8c6] rounded-tr-none' 
              : 'bg-white rounded-tl-none'
          }`}
        >
          {/* Mostrar o nome do remetente se não for uma mensagem minha */}
          {!isFromMe && msg.senderName && (
            <div className="text-xs font-medium text-primary-600 mb-1">
              {msg.senderName}
            </div>
          )}
          
          {/* Se for mensagem encaminhada */}
          {msg.isForwarded && (
            <div className="text-xs text-gray-500 mb-1 flex items-center">
              <Forward className="h-3 w-3 mr-1" />
              Encaminhada
            </div>
          )}
          
          {/* Se for resposta a outra mensagem */}
          {msg.quotedMsg && (
            <div className="bg-gray-100 p-1 rounded mb-1 border-l-2 border-gray-300 text-xs text-gray-600">
              <div className="font-medium">{msg.quotedMsg.fromMe ? 'Você' : msg.quotedMsg.sender}</div>
              <div className="truncate">{msg.quotedMsg.content}</div>
            </div>
          )}
          
          {/* Renderiza preview de mídia se existir */}
          {_renderMediaPreview(msg)}
          
          {/* Conteúdo da mensagem */}
          {msg.content && (
            <p className="text-sm text-gray-800 break-words whitespace-pre-wrap">{msg.content}</p>
          )}
          
          {/* Informações de hora e status */}
          <div className="flex items-center justify-end mt-1 space-x-1">
            <span className="text-[10px] text-gray-500">
              {formatTime(msg.timestamp)}
            </span>
            
            {isFromMe && (
              <span>
                {msg.status === 'sending' && <div className="h-3 w-3 text-gray-400">⌛</div>}
                {msg.status === 'sent' && <Check className="h-3 w-3 text-gray-400" />}
                {msg.status === 'delivered' && (
                  <div className="flex">
                    <Check className="h-3 w-3 text-gray-400" />
                    <Check className="h-3 w-3 text-gray-400 -ml-1" />
                  </div>
                )}
                {msg.status === 'read' && (
                  <div className="flex">
                    <Check className="h-3 w-3 text-blue-500" />
                    <Check className="h-3 w-3 text-blue-500 -ml-1" />
                  </div>
                )}
                {msg.status === 'failed' && (
                  <div className="text-red-500 text-[10px]">Falha</div>
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const _renderMessageBody = (msg: Message) => {
    // ... existing code ...
  };

  const handleSelectInstance = (instance: Instance) => {
    setSelectedInstance(instance);
    setShowInstanceModal(false);
    setSelectedChat(null);
    setMessages([]);
  };

  // Adicionar função para buscar mensagens
  const searchChatMessages = async () => {
    if (!selectedInstance || !selectedChat || !messageSearchTerm.trim()) {
      return;
    }
    
    try {
      setSearchingMessages(true);
      
      const response = await searchMessages(
        selectedInstance.id,
        messageSearchTerm,
        selectedChat.id,
        selectedInstance.token
      );
      
      console.log('Resultados da busca:', response);
      
      if (response && response.messages && response.messages.length > 0) {
        // Formatar as mensagens encontradas
        const formattedResults = response.messages.map((msg: any) => {
          const isFromMe = msg.fromMe || msg.key?.fromMe || false;
          let content = msg.body || msg.message || msg.content?.text || msg.text || '';
          
          // Extrair o ID da mensagem
          const messageId = msg.id || msg.key?.id || `msg-${Date.now()}-${Math.random()}`;
          
          // Determinar o remetente
          const sender = isFromMe ? 'me' : (msg.participant || msg.sender || msg.key?.participant || msg.key?.remoteJid || 'them');
          
          return {
            id: messageId,
            messageId: messageId,
            sender: sender,
            senderName: isFromMe ? 'Você' : (msg.senderName || sender),
            content: content,
            timestamp: new Date(msg.timestamp || msg.messageTimestamp || Date.now()).getTime(),
            fromMe: isFromMe,
            chatId: selectedChat.id
          };
        });
        
        setSearchResults(formattedResults);
        
        // Destacar os resultados
        if (formattedResults.length > 0) {
          toast.success(`Encontrado${formattedResults.length > 1 ? 's' : ''} ${formattedResults.length} resultado${formattedResults.length > 1 ? 's' : ''}`);
        } else {
          toast.error('Nenhum resultado encontrado');
        }
      } else {
        setSearchResults([]);
        toast.error('Nenhum resultado encontrado');
      }
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      toast.error('Erro ao buscar mensagens');
    } finally {
      setSearchingMessages(false);
    }
  };

  // Adicionar função para busca global
  const searchAllChatMessages = async () => {
    if (!selectedInstance || !globalSearchTerm.trim()) {
      return;
    }
    
    try {
      setSearchingGlobally(true);
      
      const response = await searchAllMessages(
        selectedInstance.id,
        globalSearchTerm,
        selectedInstance.token
      );
      
      console.log('Resultados da busca global:', response);
      
      if (response && response.messages && response.messages.length > 0) {
        // Organizar resultados por chat
        const resultsByChat: {[key: string]: any[]} = {};
        
        response.messages.forEach((msg: any) => {
          const chatId = msg.key?.remoteJid || msg.chatId || msg.from || 'unknown';
          
          if (!resultsByChat[chatId]) {
            resultsByChat[chatId] = [];
          }
          
          resultsByChat[chatId].push(msg);
        });
        
        // Formatar para exibição
        const formattedResults = Object.keys(resultsByChat).map(chatId => {
          // Buscar informações do chat
          const chatInfo = chats.find(c => c.id === chatId) || {
            id: chatId,
            name: chatId.includes('@') ? chatId.split('@')[0] : chatId,
            displayNumber: chatId.includes('@') ? chatId.split('@')[0] : chatId,
            isGroup: chatId.includes('g.us')
          };
          
          // Formatar as mensagens
          const formattedMessages = resultsByChat[chatId].map((msg: any) => {
            const isFromMe = msg.fromMe || msg.key?.fromMe || false;
            let content = msg.body || msg.message || msg.content?.text || msg.text || '';
            
            return {
              id: msg.id || msg.key?.id || `msg-${Date.now()}-${Math.random()}`,
              content,
              timestamp: new Date(msg.timestamp || msg.messageTimestamp || Date.now()).getTime(),
              fromMe: isFromMe
            };
          });
          
          return {
            chatId,
            chatName: chatInfo.name,
            chatNumber: chatInfo.displayNumber,
            isGroup: chatInfo.isGroup,
            profileImage: chatInfo.profileImage || '',
            messages: formattedMessages
          };
        });
        
        setGlobalSearchResults(formattedResults);
        
        if (formattedResults.length > 0) {
          const totalMessages = formattedResults.reduce((acc, curr) => acc + curr.messages.length, 0);
          toast.success(`Encontrado${totalMessages > 1 ? 's' : ''} ${totalMessages} resultado${totalMessages > 1 ? 's' : ''} em ${formattedResults.length} chat${formattedResults.length > 1 ? 's' : ''}`);
        } else {
          toast.error('Nenhum resultado encontrado');
        }
      } else {
        setGlobalSearchResults([]);
        toast.error('Nenhum resultado encontrado');
      }
    } catch (error) {
      console.error('Erro na busca global:', error);
      toast.error('Erro ao buscar mensagens');
    } finally {
      setSearchingGlobally(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">i9Place Atendimento</h1>
          {selectedInstance && (
            <button 
              onClick={() => setShowInstanceModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-md hover:bg-gray-50 text-gray-700"
            >
              <span>Trocar Instância</span>
              <Smartphone className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="text-sm text-gray-500">Gerencie suas conversas do WhatsApp</p>
        {isUsingMockData && (
          <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded-md">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-600">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span className="text-sm text-yellow-800">
                <strong>Modo Offline:</strong> Exibindo dados de exemplo devido a problemas na conexão com a API
              </span>
            </div>
            <div className="text-xs text-yellow-700 mt-1">
              <button 
                onClick={() => {
                  toast.loading('Tentando reconectar...');
                  loadChats();
                }}
                className="underline hover:text-yellow-900"
              >
                Tentar reconectar
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 border-r border-gray-200 flex flex-col bg-white">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex space-x-4">
                <button 
                  onClick={() => setActiveTab('chats')}
                  className={`pb-1 font-medium ${activeTab === 'chats' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500'}`}
                >
                  Conversas
                </button>
                <button 
                  onClick={() => setActiveTab('groups')}
                  className={`pb-1 font-medium ${activeTab === 'groups' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500'}`}
                >
                  Grupos
                </button>
              </div>
              
              <button 
                onClick={() => setShowGlobalSearch(!showGlobalSearch)}
                className="text-gray-600 hover:text-gray-800 p-1 rounded-full hover:bg-gray-100"
                title="Busca global de mensagens"
              >
                <Search className="h-5 w-5" />
              </button>
            </div>
            
            {showGlobalSearch ? (
              <div className="mb-4">
                <div className="flex items-center">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar em todas as conversas..."
                      className="pl-10 pr-10 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      value={globalSearchTerm}
                      onChange={(e) => setGlobalSearchTerm(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && searchAllChatMessages()}
                    />
                    {globalSearchTerm && (
                      <button
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={() => setGlobalSearchTerm('')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    )}
                  </div>
                  <button
                    className={`ml-2 p-2 rounded-lg ${
                      searchingGlobally
                        ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                        : 'bg-primary-600 text-white hover:bg-primary-700'
                    }`}
                    onClick={searchAllChatMessages}
                    disabled={searchingGlobally || !globalSearchTerm.trim()}
                  >
                    {searchingGlobally ? (
                      <div className="h-5 w-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 10 4 15 9 20"></polyline>
                        <path d="M20 4v7a4 4 0 0 1-4 4H4"></path>
                      </svg>
                    )}
                  </button>
                </div>
                
                {/* Resultados da busca global */}
                {globalSearchResults.length > 0 && (
                  <div className="mt-4 space-y-4 max-h-96 overflow-y-auto">
                    {globalSearchResults.map((result) => (
                      <div 
                        key={result.chatId}
                        className="bg-white p-3 rounded-lg shadow-sm border border-gray-100"
                      >
                        <div 
                          className="flex items-center gap-2 mb-2 cursor-pointer"
                          onClick={() => {
                            // Abrir o chat e limpar a busca global
                            const chatToOpen = chats.find(c => c.id === result.chatId);
                            if (chatToOpen) {
                              _handleSelectChat(chatToOpen);
                            } else {
                              // Se o chat não estiver na lista atual, criar um objeto temporário
                              const tempChat: Chat = {
                                id: result.chatId,
                                name: result.chatName,
                                number: result.chatNumber,
                                unreadCount: 0,
                                isGroup: result.isGroup,
                                profileImage: result.profileImage || ''
                              };
                              _handleSelectChat(tempChat);
                            }
                            setShowGlobalSearch(false);
                            setGlobalSearchResults([]);
                          }}
                        >
                          <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                            {result.profileImage ? (
                              <img 
                                src={result.profileImage} 
                                alt={result.chatName} 
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-gray-500">
                                {result.isGroup ? 
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="9" cy="7" r="4"></circle>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                  </svg>
                                  : 
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                  </svg>
                                }
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 text-sm truncate">
                              {result.chatName}
                            </h4>
                            <p className="text-xs text-gray-500 truncate">
                              {result.chatNumber}
                            </p>
                          </div>
                          <div className="text-xs text-gray-500">
                            {result.messages.length} resultados
                          </div>
                        </div>
                        
                        <div className="space-y-1 max-h-32 overflow-y-auto pl-10">
                          {result.messages.slice(0, 3).map((msg: any) => (
                            <div 
                              key={msg.id}
                              className="text-xs p-1.5 rounded border border-gray-100 hover:bg-gray-50"
                            >
                              <div className="flex justify-between mb-1">
                                <span className="font-medium">{msg.fromMe ? 'Você' : 'Contato'}</span>
                                <span className="text-gray-500">{formatTime(msg.timestamp)}</span>
                              </div>
                              <p className="text-gray-700 break-words">{msg.content}</p>
                            </div>
                          ))}
                          {result.messages.length > 3 && (
                            <div className="text-xs text-center text-primary-600">
                              + {result.messages.length - 3} mais resultados
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar conversa..."
                  className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
              </div>
            ) : error ? (
              <div className="p-4 text-center text-red-500">{error}</div>
            ) : activeTab === 'chats' ? (
              chats.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  Nenhuma conversa disponível
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {chats.map((chat) => (
                    <button
                      key={chat.id}
                      className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 ${
                        selectedChat?.id === chat.id ? 'bg-gray-50' : ''
                      }`}
                      onClick={() => _handleSelectChat(chat)}
                    >
                      <div className="relative flex-shrink-0">
                        {chat.profileImage ? (
                          <img
                            src={chat.profileImage}
                            alt={chat.name}
                            className="h-12 w-12 rounded-full object-cover"
                            onError={(e) => {
                              // Se a imagem falhar ao carregar, substituir pelo avatar padrão
                              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name)}&background=random&color=fff`;
                            }}
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                            <MessageCircle className="h-6 w-6 text-gray-500" />
                          </div>
                        )}
                        {chat.unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center">
                            {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-gray-900">{chat.name}</h3>
                          {chat.timestamp && (
                            <span className="text-xs text-gray-500">
                              {new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        {/* Exibir número formatado abaixo do nome */}
                        <p className="text-xs text-gray-500">{chat.displayNumber || ''}</p>
                        <p className="text-sm text-gray-500 truncate">{chat.lastMessage || "Nenhuma mensagem"}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )
            ) : (
              groups.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  Nenhum grupo disponível
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {groups.map((group) => (
                    <div
                      key={group.id}
                      className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50`}
                    >
                      <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary-100 text-primary-600">
                        <MessageCircle className="h-6 w-6" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <h3 className="font-medium text-gray-900 truncate">{group.name}</h3>
                        <p className="text-sm text-gray-500">
                          {group.participants.length} participantes
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
        
        <div className="flex-1 flex flex-col bg-[#e5ddd5] relative">
          {selectedChat ? (
            <>
              <div className="p-3 bg-gray-100 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center mr-3 overflow-hidden">
                    {selectedChat.profileImage ? (
                      <img src={selectedChat.profileImage} alt={selectedChat.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        {selectedChat.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-sm font-medium text-gray-900">{selectedChat.name}</h2>
                    <p className="text-xs text-gray-500">
                      {selectedChat.isGroup 
                        ? 'Grupo' 
                        : 'Último acesso ' + (selectedChat.lastSeen 
                          ? formatDateTime(selectedChat.lastSeen) 
                          : 'desconhecido')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <button 
                    className="text-gray-600 hover:text-gray-800"
                    onClick={() => setShowSearchMessages(!showSearchMessages)}
                  >
                    <Search className="h-5 w-5" />
                  </button>
                  <button className="text-gray-600 hover:text-gray-800">
                    <Phone className="h-5 w-5" />
                  </button>
                  <div className="relative">
                    <button 
                      className="text-gray-600 hover:text-gray-800"
                      onClick={() => {
                        const options = [
                          {label: 'Informações do contato', action: () => console.log('Ver informações')},
                          {label: 'Adicionar etiqueta', action: () => _handleAddLabelToChat(selectedChat.id)},
                          {label: 'Arquivar chat', action: () => console.log('Arquivar chat')},
                          {label: 'Silenciar notificações', action: () => console.log('Silenciar')},
                        ];
                        const action = prompt('Escolha uma ação:\n1. Informações do contato\n2. Adicionar etiqueta\n3. Arquivar chat\n4. Silenciar notificações');
                        if (action === '1') options[0].action();
                        if (action === '2') options[1].action();
                        if (action === '3') options[2].action();
                        if (action === '4') options[3].action();
                      }}
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 bg-[url('/whatsapp-bg.png')] bg-repeat"
              >
                {/* Exibir resultados da pesquisa se houver */}
                {searchResults.length > 0 ? (
                  <div className="mb-4">
                    <div className="bg-white rounded-lg shadow p-3 mb-2">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-medium text-gray-700">
                          Resultados da pesquisa: {searchResults.length} {searchResults.length === 1 ? 'mensagem encontrada' : 'mensagens encontradas'}
                        </h3>
                        <button
                          className="text-gray-500 hover:text-gray-700"
                          onClick={() => {
                            setSearchResults([]);
                            setMessageSearchTerm('');
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      </div>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {searchResults.map((result) => (
                          <div 
                            key={result.id}
                            className="bg-gray-50 p-2 rounded border border-gray-200 hover:bg-gray-100 cursor-pointer"
                            onClick={() => {
                              // Rolar para a mensagem original
                              const originalMsg = messages.find(m => m.id === result.id);
                              if (originalMsg) {
                                const msgElement = document.getElementById(`msg-${originalMsg.id}`);
                                if (msgElement) {
                                  msgElement.scrollIntoView({ behavior: 'smooth' });
                                  // Destacar brevemente a mensagem
                                  msgElement.classList.add('bg-yellow-100');
                                  setTimeout(() => {
                                    msgElement.classList.remove('bg-yellow-100');
                                  }, 2000);
                                }
                              }
                            }}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-medium">
                                {result.senderName || (result.fromMe ? 'Você' : 'Contato')}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDateTime(result.timestamp)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-800">
                              {result.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-2">
                      <MessageCircle className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-sm">Sem mensagens ainda</p>
                    <p className="text-gray-400 text-xs">Comece uma conversa agora</p>
                  </div>
                ) : (
                  messages.map((message: Message, index: number) => _renderMessage(message, index))
                )}
                <div ref={messagesEndRef} />
              </div>
              
              <div className="p-3 bg-gray-100">
                {/* Interface de resposta */}
                {replyingTo && (
                  <div className="flex items-center mb-2 p-2 bg-gray-200 rounded-lg">
                    <div className="flex-1 border-l-2 border-blue-500 pl-2">
                      <p className="text-xs font-medium">
                        Respondendo para {replyingTo.fromMe ? 'você mesmo' : 'contato'}
                      </p>
                      <p className="text-xs truncate">{replyingTo.content}</p>
                    </div>
                    <button
                      onClick={() => setReplyingTo(null)}
                      className="p-1 text-gray-500 hover:text-gray-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                )}

                <div className="flex items-center">
                  <div className="relative">
                    <button 
                      onClick={_handleAttachmentClick} 
                      className="p-2 rounded-full hover:bg-gray-200 text-gray-600"
                    >
                      <Paperclip className="h-5 w-5" />
                    </button>
                    
                    {showAttachmentOptions && (
                      <div className="absolute bottom-12 left-0 bg-white rounded-lg shadow-lg p-2 w-48 z-10">
                        <button
                          onClick={() => _handleFileSelect('image')}
                          className="flex items-center w-full p-2 hover:bg-gray-100 text-left"
                        >
                          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center mr-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                              <circle cx="8.5" cy="8.5" r="1.5"></circle>
                              <polyline points="21 15 16 10 5 21"></polyline>
                            </svg>
                          </div>
                          <span className="text-sm">Imagem</span>
                        </button>
                        
                        <button
                          onClick={() => _handleFileSelect('document')}
                          className="flex items-center w-full p-2 hover:bg-gray-100 text-left"
                        >
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                              <polyline points="14 2 14 8 20 8"></polyline>
                              <line x1="16" y1="13" x2="8" y2="13"></line>
                              <line x1="16" y1="17" x2="8" y2="17"></line>
                              <polyline points="10 9 9 9 8 9"></polyline>
                            </svg>
                          </div>
                          <span className="text-sm">Documento</span>
                        </button>
                        
                        <button
                          onClick={() => _handleSendLocation()}
                          className="flex items-center w-full p-2 hover:bg-gray-100 text-left"
                        >
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                              <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                          </div>
                          <span className="text-sm">Localização</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 mx-2">
                    <input
                      type="text"
                      placeholder="Digite uma mensagem"
                      className="w-full px-4 py-2 rounded-full border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                  </div>
                  {messageInput.trim() ? (
                    <button 
                      onClick={handleSendMessage} 
                      className="p-2 rounded-full bg-green-500 text-white"
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  ) : (
                    <button 
                      className="p-2 rounded-full hover:bg-gray-200 text-gray-600"
                      onClick={_handleRecordAudio}
                    >
                      <Mic className="h-5 w-5" />
                    </button>
                  )}
                </div>
                {/* Input file oculto para upload de arquivos */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={_handleFileUpload} 
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full bg-gray-50">
              <div className="w-64 h-64 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                <MessageCircle className="h-32 w-32 text-gray-400" />
              </div>
              <h2 className="text-2xl font-medium text-gray-700 mb-2">WhatsApp Web</h2>
              <p className="text-gray-500 text-center max-w-md mb-8">
                Selecione um chat para começar a conversar ou crie um novo grupo.
              </p>
            </div>
          )}
        </div>
      </div>
      
      {showInstanceModal && (
        <SelectInstanceModal
          onSelect={handleSelectInstance}
          onClose={() => setShowInstanceModal(false)}
        />
      )}
      
      {showContextMenu && (
        <div 
          className="fixed bg-white rounded-lg shadow-lg z-50 overflow-hidden"
          style={{
            left: `${showContextMenu.x}px`,
            top: `${showContextMenu.y}px`,
          }}
        >
          <div className="w-48">
            {/* Reações */}
            <div className="p-2 border-b border-gray-100">
              <div className="flex justify-between">
                {commonReactions.map((emoji) => (
                  <button 
                    key={emoji}
                    onClick={() => _handleReactToMessage(showContextMenu.messageId, emoji)}
                    className="p-1 hover:bg-gray-100 rounded text-lg"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            
            <button 
              onClick={() => {
                const messageObj = messages.find(m => m.id === showContextMenu.messageId);
                if (messageObj) handleReplyMessage(messageObj);
              }}
              className="flex items-center w-full p-2 hover:bg-gray-100 text-left"
            >
              <Reply className="h-4 w-4 mr-2" />
              <span className="text-sm">Responder</span>
            </button>
            <button 
              onClick={() => {
                const messageObj = messages.find((m: Message) => m.id === showContextMenu.messageId);
                if (messageObj) handleForwardMessage(messageObj);
              }}
              className="flex items-center w-full p-2 hover:bg-gray-100 text-left"
            >
              <Forward className="h-4 w-4 mr-2" />
              <span className="text-sm">Encaminhar</span>
            </button>
            <button 
              onClick={() => {
                const messageObj = messages.find((m: Message) => m.id === showContextMenu.messageId);
                if (messageObj && messageObj.mediaUrl) {
                  window.open(messageObj.mediaUrl, '_blank');
                }
              }}
              className="flex items-center w-full p-2 hover:bg-gray-100 text-left"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
              <span className="text-sm">Abrir</span>
            </button>
            <button 
              onClick={() => {
                const messageObj = messages.find((m: Message) => m.id === showContextMenu.messageId);
                if (messageObj) handleDeleteMessage(messageObj);
              }}
              className="flex items-center w-full p-2 hover:bg-gray-100 text-left text-red-500"
            >
              <Trash className="h-4 w-4 mr-2" />
              <span className="text-sm">Apagar</span>
            </button>
          </div>
        </div>
      )}
      
      {showSearchMessages && (
        <div className="p-2 bg-white border-b border-gray-200 flex items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar mensagens..."
              className="pl-10 pr-10 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              value={messageSearchTerm}
              onChange={(e) => setMessageSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchChatMessages()}
            />
            {messageSearchTerm && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setMessageSearchTerm('')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
          </div>
          <button
            className={`ml-2 px-3 py-2 rounded-lg ${
              searchingMessages
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
            onClick={searchChatMessages}
            disabled={searchingMessages || !messageSearchTerm.trim()}
          >
            {searchingMessages ? (
              <div className="h-5 w-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Buscar'
            )}
          </button>
          <button
            className="ml-2 p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
            onClick={() => {
              setShowSearchMessages(false);
              setMessageSearchTerm('');
              setSearchResults([]);
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}