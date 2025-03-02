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
  label
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

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
  };

  const handleSSEEvent = (event: any) => {
    if (event.type === 'message' && event.event === 'received') {
      toast('Nova mensagem de ' + (event.data.notifyName || event.data.from));
      
      if (selectedChat && event.data.from === selectedChat.id) {
        loadMessages(selectedChat.id);
      }
      
      loadChats();
    }
  };

  const loadChats = async () => {
    if (!selectedInstance) return;

    try {
      setLoading(true);
      setError(null);

      const rawChats = await getChats(selectedInstance.id, searchTerm, selectedInstance.token);
      console.log('Chats carregados:', rawChats);

      const formattedChats: Chat[] = rawChats.map((chat: any) => {
        const chatId = chat.jid || chat.id;
        
        const isGroup = chat.isGroup || chatId.includes('g.us');
        
        let displayName = chat.name;
        if (!displayName || displayName === chatId.split('@')[0]) {
          displayName = isGroup ? 'Grupo' : 'Contato';
        }
        
        return {
          id: chatId,
          name: displayName,
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
      
      formattedChats.forEach(chat => {
        loadProfilePicture(chat.id);
      });
      
      setError(null);
    } catch (error: any) {
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
        sender: 'me',
        content: messageInput,
        timestamp: Date.now(),
        status: 'sending',
        fromMe: true
      };
      
      setMessages(prev => [...prev, newMessage]);
      scrollToBottom();
      
      const options: any = {};
      
      if (replyingTo) {
        const _result = await message.reply(
          selectedInstance.id,
          selectedChat.id,
          messageInput,
          replyingTo.messageId || '',
          options,
          selectedInstance.token
        );
        
        setReplyingTo(null);
      }
      else {
        await message.sendText(
          selectedInstance.id,
          selectedChat.id,
          messageInput,
          options,
          selectedInstance.token
        );
      }
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempId ? { ...msg, status: 'sent' } : msg
        )
      );
      
      setTimeout(() => {
        loadMessages(selectedChat.id);
      }, 1000);
      
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === `temp-${Date.now()}` ? { ...msg, status: 'failed' } : msg
        )
      );
      
      toast.error('Erro ao enviar mensagem. Tente novamente.');
    }
  };

  const _handleAttachmentClick = () => {
    // setShowAttachmentOptions(prev => !prev);
  };

  const _handleRecordAudio = () => {
    toast('Gravação de áudio não implementada ainda.');
  };

  const _handleFileSelect = (type: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
    // setShowAttachmentOptions(false);
  };

  const _handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files.length || !selectedChat || !selectedInstance) {
      return;
    }
    
    try {
      // setLoadingMedia(true);
      const file = event.target.files[0];
      const fileType = file.type.split('/')[0]; 
      
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        let _result;
        
        if (fileType === 'image') {
          const caption = prompt('Digite uma legenda para a imagem (opcional):') || '';
          _result = await message.sendImage(
            selectedInstance.id,
            selectedChat.id,
            dataUrl,
            caption,
            {},
            selectedInstance.token
          );
        } 
        else if (fileType === 'video') {
          const caption = prompt('Digite uma legenda para o vídeo (opcional):') || '';
          _result = await message.sendVideo(
            selectedInstance.id,
            selectedChat.id,
            dataUrl,
            caption,
            {},
            selectedInstance.token
          );
        } 
        else if (fileType === 'audio') {
          _result = await message.sendAudio(
            selectedInstance.id,
            selectedChat.id,
            dataUrl,
            {},
            selectedInstance.token
          );
        } 
        else {
          _result = await message.sendDocument(
            selectedInstance.id,
            selectedChat.id,
            dataUrl,
            file.name,
            '',
            {},
            selectedInstance.token
          );
        }
        
        toast.success('Arquivo enviado com sucesso!');
        
        await loadMessages(selectedChat.id);
        
      };
    } catch (error) {
      console.error('Erro ao enviar arquivo:', error);
      toast.error('Erro ao enviar arquivo. Tente novamente.');
    } finally {
      // setLoadingMedia(false);
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

  const _handleReactToMessage = async (messageId: string, emoji: string) => {
    const msg = messages.find((m) => m.id === messageId);
    
    if (!msg || !msg.messageId || !selectedInstance) return;
    
    try {
      await message.react(
        selectedInstance.id,
        msg.messageId,
        emoji,
        selectedInstance.token
      );
      
      toast.success(`Reação ${emoji} enviada!`);
      setShowContextMenu(null);
    } catch (error) {
      console.error('Erro ao reagir à mensagem:', error);
      toast.error('Erro ao reagir à mensagem. Tente novamente.');
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

      const rawMessages = await chat.fetchMessages(selectedInstance.id, chatId, 50, selectedInstance.token);
      console.log('Mensagens carregadas:', rawMessages);

      const formattedMessages = (rawMessages || []).map((msg: any) => {
        const isFromMe = msg.fromMe || false;
        let content = '';
        
        if (msg.type === 'chat' || msg.type === 'text') {
          content = msg.body || msg.message || '';
        } else if (msg.type === 'image') {
          content = '[Imagem]' + (msg.caption ? ': ' + msg.caption : '');
          msg.mediaType = 'image';
        } else if (msg.type === 'video') {
          content = '[Vídeo]' + (msg.caption ? ': ' + msg.caption : '');
          msg.mediaType = 'video';
        } else if (msg.type === 'document') {
          content = '[Documento]' + (msg.fileName ? ': ' + msg.fileName : '');
          msg.mediaType = 'document';
        } else if (msg.type === 'audio' || msg.type === 'ptt') {
          content = '[Áudio]';
          msg.mediaType = 'audio';
        } else if (msg.type === 'location') {
          content = '[Localização]';
        } else if (msg.type === 'sticker') {
          content = '[Sticker]';
          msg.mediaType = 'sticker';
        } else {
          content = msg.body || msg.message || `[${msg.type}]`;
        }
        
        return {
          id: msg.id || `msg-${Date.now()}-${Math.random()}`,
          messageId: msg.id, 
          sender: isFromMe ? 'me' : 'them',
          content,
          timestamp: new Date(msg.timestamp || msg.messageTimestamp || Date.now()).getTime(),
          status: msg.status || 'sent',
          read: msg.read || false,
          mediaType: msg.mediaType, 
          mediaUrl: null, 
          chatId: chatId,
          quotedMsg: msg.quotedMsg || null,
          isForwarded: msg.isForwarded || false
        };
      });

      setMessages(formattedMessages);

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

      loadProfilePicture(chatId);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      setError('Falha ao carregar mensagens. Tente novamente.');
    } finally {
      setLoading(false);
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
    if (!message.mediaUrl || !message.mediaType) return null;
    
    switch (message.mediaType) {
      case 'image':
        return (
          <div className="media-preview" onClick={() => {}}>
            <img src={message.mediaUrl} alt="Imagem" className="message-image" />
          </div>
        );
      case 'video':
        return (
          <div className="media-preview" onClick={() => {}}>
            <video src={message.mediaUrl} controls className="message-video" />
          </div>
        );
      case 'audio':
        return (
          <div className="media-preview">
            <audio src={message.mediaUrl} controls className="message-audio" />
          </div>
        );
      case 'document':
        return (
          <div className="media-preview">
            <a href={message.mediaUrl} target="_blank" rel="noopener noreferrer">
              <FileIcon className="w-10 h-10" />
              <span>Abrir documento</span>
            </a>
          </div>
        );
      default:
        return null;
    }
  };

  const handleSelectInstance = (instance: Instance) => {
    setSelectedInstance(instance);
    setShowInstanceModal(false);
    setSelectedChat(null);
    setMessages([]);
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
            </div>
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
                  <button className="text-gray-600 hover:text-gray-800">
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
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-2">
                      <MessageCircle className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-sm">Sem mensagens ainda</p>
                    <p className="text-gray-400 text-xs">Comece uma conversa agora</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isFromMe = msg.fromMe || msg.sender === 'me';
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}
                        onContextMenu={(e) => handleMessageContextMenu(e, msg.id)}
                      >
                        <div
                          className={`relative max-w-[80%] p-2 rounded-lg shadow-sm ${
                            isFromMe 
                              ? 'bg-[#dcf8c6] rounded-tr-none' 
                              : 'bg-white rounded-tl-none'
                          }`}
                        >
                          <p className="text-sm text-gray-800 break-words">{msg.content}</p>
                          
                          <div className="flex items-center justify-end mt-1 space-x-1">
                            <span className="text-[10px] text-gray-500">
                              {formatTime(msg.timestamp)}
                            </span>
                            
                            {isFromMe && (
                              <span>
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
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
              
              <div className="p-3 bg-gray-100">
                <div className="flex items-center">
                  <button 
                    onClick={_handleAttachmentClick} 
                    className="p-2 rounded-full hover:bg-gray-200 text-gray-600"
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>
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
          className="fixed bg-white rounded-lg shadow-lg z-50 p-1"
          style={{
            left: `${showContextMenu.x}px`,
            top: `${showContextMenu.y}px`,
          }}
        >
          <div className="w-48">
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
                const messageObj = messages.find(m => m.id === showContextMenu.messageId);
                if (messageObj) handleForwardMessage(messageObj);
              }}
              className="flex items-center w-full p-2 hover:bg-gray-100 text-left"
            >
              <Forward className="h-4 w-4 mr-2" />
              <span className="text-sm">Encaminhar</span>
            </button>
            <button 
              onClick={() => {
                const messageObj = messages.find(m => m.id === showContextMenu.messageId);
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
    </div>
  );
}