import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, MessageCircle, Phone, Paperclip, Send, MoreVertical, Smartphone, 
  Trash, Check, Reply, Forward, Mic
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SelectInstanceModal } from '../components/instance/SelectInstanceModal';
import { 
  getProfileInfo,
  getGroups,
  Group,
  downloadMessageMedia,
  chat,
  message,
  connectToSSE,
  searchMessages,
  getAllMessagesFromChat,
  markMessageAsRead,
  searchAllMessages,
  API_URL
} from '../lib/wapi/api';
import type { ChatFilters } from '../lib/wapi/types';

interface Instance {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'connecting';
  token: string;
}

interface Chat {
  id: string;
  name: string;
  displayNumber: string;
  lastMessage?: string;
  timestamp: number;
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

interface ChatResponse {
  id?: string;
  wa_chatid?: string;
  wa_contactName?: string;
  wa_name?: string;
  name?: string;
  phone?: string;
  wa_lastMessageTextVote?: string;
  lastMessage?: string;
  wa_lastMsgTimestamp?: number;
  wa_unreadCount?: number;
  wa_isGroup?: boolean;
  image?: string;
  imagePreview?: string;
  wa_lastSeen?: number;
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
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [sseConnection, setSseConnection] = useState<any>(null);
  const [showContextMenu, setShowContextMenu] = useState<{x: number, y: number, messageId: string} | null>(null);
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const [showSearchMessages, setShowSearchMessages] = useState(false);
  const [messageSearchTerm, setMessageSearchTerm] = useState('');
  const [searchingMessages, setSearchingMessages] = useState(false);
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
  const [searchingGlobally, setSearchingGlobally] = useState(false);
  const [isUsingMockData] = useState(false);
  const [showDiagnosticInfo, setShowDiagnosticInfo] = useState(false);
  const [apiRequestStatus, setApiRequestStatus] = useState<{lastCall: string, status: string}>({ lastCall: '', status: 'nenhuma' });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Emojis de reação comuns
  const commonReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  useEffect(() => {
    if (selectedInstance) {
      loadChats();
      loadGroups();
      const cleanup = setupSSE();
      
      return () => {
        if (cleanup) cleanup();
      };
    }
  }, [selectedInstance]);

  useEffect(() => {
    setShowInstanceModal(true);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (selectedChat && selectedInstance) {
      loadMessages(selectedChat.id);
    }
  }, [selectedChat?.id, selectedInstance?.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const setupSSE = () => {
    if (!selectedInstance) return;

    console.log('Configurando SSE para a instância:', selectedInstance.id);

    try {
      const connection = connectToSSE(
        selectedInstance.id,
        handleSSEEvent,
        selectedInstance.token
      );

      // Armazenar a conexão para limpeza posterior
      setSseConnection(connection);

      return () => {
        if (connection) {
          console.log('Fechando conexão SSE anterior');
          connection.close();
        }
      };
    } catch (error) {
      console.error('Erro ao configurar SSE:', error);
      toast.error('Erro ao conectar com o servidor de eventos');
    }
  };

  const handleSSEEvent = (event: any) => {
    console.log('Evento SSE recebido:', event);

    // Verificar se o evento é uma mensagem
    if (event.type === 'message') {
      // Recarregar mensagens se o chat atual for o destinatário
      if (selectedChat && event.chatId === selectedChat.id) {
        loadMessages(selectedChat.id);
      }
      // Recarregar lista de chats para atualizar últimas mensagens
      loadChats();
    }
    
    // Verificar se é um evento de status da instância
    if (event.type === 'status') {
      if (selectedInstance && event.instanceId === selectedInstance.id) {
        setSelectedInstance(prev => prev ? {
          ...prev,
          status: event.status as 'connected' | 'disconnected' | 'connecting'
        } : null);
      }
    }
  };

  const loadChats = async () => {
    try {
      if (!selectedInstance || !selectedInstance.token) {
         console.error('[UI_ERROR] Tentando carregar chats sem instância selecionada ou token.');
         setError('Instância inválida ou não selecionada.');
         setLoading(false);
         return;
      }

      setLoading(true);
      setError(null);
      setApiRequestStatus({ lastCall: `chat.getAll(${selectedInstance.id}) via POST /chat/find`, status: 'iniciada' });

      console.log('[UI_LOG] Iniciando busca de chats (POST /chat/find) para a instância:', selectedInstance.id);

      // Preparar parâmetros de busca se houver searchTerm
      const searchParams = searchTerm ? { lead_name: `~${searchTerm}` } : {};

      // Buscar chats usando o endpoint corrigido (POST /chat/find)
      const chatResponse = await chat.getAll(selectedInstance.id, selectedInstance.token, searchParams);

      console.log('[UI_LOG] Resposta recebida de chat.getAll (POST /chat/find):', chatResponse);
      setApiRequestStatus(prev => ({ ...prev, status: chatResponse?.chats?.length > 0 ? 'sucesso' : 'falha ou vazio' }));

      if (chatResponse && Array.isArray(chatResponse.chats)) {
        console.log(`[UI_LOG] Processando ${chatResponse.chats.length} chats recebidos de POST /chat/find`);
        
        // Log do primeiro chat para análise da estrutura (vindo de /chat/find)
        if (chatResponse.chats.length > 0) {
          console.log('[UI_LOG] Estrutura do primeiro chat (de /chat/find):', JSON.stringify(chatResponse.chats[0], null, 2));
          
          // Log específico para o chat "Rafael Mendes" se encontrado
          const chatTargetId = 'r3672040bcbc676';
          const rafaelChatData = chatResponse.chats.find((c: any) => c.id === chatTargetId || c.wa_chatid === chatTargetId);
          if (rafaelChatData) {
            console.log(`[UI_LOG] DADOS CRUS DO CHAT ${chatTargetId} recebidos de /chat/find:`, JSON.stringify(rafaelChatData, null, 2));
          }
        }

        // O filtro já foi aplicado na API se searchParams foi enviado
        // Se não, podemos filtrar localmente se necessário, mas idealmente a API filtra.
        let processedChats = chatResponse.chats;

        const formattedChats = processedChats.map((chatData: any): Chat => {
          // Mapeamento baseado na estrutura esperada de /chat/find
          const isGroup = Boolean(chatData.wa_isGroup);
          
          // Nome: wa_contactName (preferencial), wa_name, ou name (lead_name)
          const name = chatData.wa_contactName || chatData.wa_name || chatData.lead_name || 
                      (isGroup ? 'Grupo' : 'Contato Desconhecido');
          
          // ID do chat: PRIORIZAR wa_chatid, depois id. Garantir que não seja nulo.
          const chatId = chatData.wa_chatid || chatData.id || `chat-${Math.random()}-${Date.now()}`;

          // Número (parte antes do @ ou telefone) - Usar o chatId (preferencialmente wa_chatid)
          const number = chatData.phone || (chatId.includes('@') ? chatId.split('@')[0] : chatId);
          
          // Última mensagem: wa_lastMessageTextVote ou lastMessage
          const lastMessageText = chatData.wa_lastMessageTextVote || chatData.lastMessage || '';
          
          // Timestamp: wa_lastMsgTimestamp (em segundos, precisa multiplicar por 1000)
          const timestamp = chatData.wa_lastMsgTimestamp ? Number(chatData.wa_lastMsgTimestamp) * 1000 : Date.now();

           // Imagem: Tentar múltiplos campos possíveis
           const profileImage = chatData.image || 
                                chatData.imagePreview || 
                                chatData.imgUrl || 
                                chatData.picture || 
                                chatData.profilePic || 
                                ''; // Default vazio se nenhum for encontrado

           // Log da URL da imagem encontrada para este chat
           // console.log(`[UI_LOG] Chat ID: ${chatId}, Nome: ${name}, profileImage URL: ${profileImage || 'Nenhuma'}`);

          const formattedChat: Chat = {
            id: chatId,
            name: name,
            displayNumber: number,
            lastMessage: lastMessageText,
            timestamp: isNaN(timestamp) ? Date.now() : timestamp,
            unreadCount: chatData.wa_unreadCount || 0,
            isGroup: isGroup,
            profileImage: profileImage,
            number: number,
            lastSeen: chatData.wa_lastSeen ? Number(chatData.wa_lastSeen) * 1000 : 0
          };
          return formattedChat;
        });

        console.log('[UI_LOG] Chats finais formatados (de /chat/find):', formattedChats);
        setChats(formattedChats);
        if (formattedChats.length === 0 && chatResponse.chats.length > 0) {
           console.warn('[UI_LOG] Nenhum chat visível, mas a API retornou chats. Verifique o mapeamento.');
        } else if (formattedChats.length === 0) {
           console.warn('[UI_LOG] Nenhum chat retornado pela API /chat/find.');
        }

      } else {
        console.warn('[UI_LOG] Formato de resposta inesperado ou array de chats vazio (POST /chat/find):', chatResponse);
        setChats([]);
        setApiRequestStatus(prev => ({ ...prev, status: 'falha: formato inesperado ou vazio' }));
      }
    } catch (error: any) {
      console.error('[UI_ERROR] Erro ao carregar chats (POST /chat/find):', error);
      setError('Falha ao carregar chats. Verifique o console (F12).');
      setChats([]);
      setApiRequestStatus(prev => ({ ...prev, status: `erro: ${error.message}` }));
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

  useEffect(() => {
    if (selectedInstance) {
      if (activeTab === 'chats') {
        loadChats();
      } else {
        loadGroups();
      }
    }
  }, [searchTerm, selectedInstance, activeTab]);

  // Efeito para buscar imagens de perfil faltantes após carregar os chats
  useEffect(() => {
    if (!selectedInstance || !selectedInstance.token || chats.length === 0) {
      return; // Sai se não houver instância, token ou chats
    }

    // Função assíncrona para buscar e atualizar imagens
    const fetchMissingProfileImages = async () => {
      console.log('[UI_LOG] Iniciando verificação de imagens de perfil faltantes...');
      let updatedNeeded = false;
      const promises = chats.map(async (currentChat) => {
        // Se já tem imagem ou se o ID parece inválido, pula
        if (currentChat.profileImage || !currentChat.id || currentChat.id.startsWith('chat-')) {
          return currentChat;
        }

        try {
          // console.log(`[UI_LOG] Buscando imagem para ID: ${currentChat.id} (${currentChat.name})`);
          // A API espera o JID (ex: numero@s.whatsapp.net)
          const profileInfo = await chat.getNameAndImageURL(
            selectedInstance.id,
            currentChat.id, // Passa o ID do chat (que deve ser o wa_chatid)
            selectedInstance.token
          );

          // console.log(`[UI_LOG] Resposta getNameAndImageURL para ${currentChat.id}:`, profileInfo);

          if (profileInfo && profileInfo.success && profileInfo.imageUrl) {
            // Verifica se a URL encontrada é diferente da que já pode existir (evita updates desnecessários)
            if (currentChat.profileImage !== profileInfo.imageUrl) {
                console.log(`[UI_LOG] Imagem encontrada/atualizada para ${currentChat.id}: ${profileInfo.imageUrl}`);
                updatedNeeded = true;
                return { ...currentChat, profileImage: profileInfo.imageUrl };
            }
          } else if (profileInfo && !profileInfo.success) {
             // Loga apenas se a API retornou sucesso=false
             console.warn(`[UI_LOG] Falha ao obter imagem para ${currentChat.id} (API retornou erro):`, profileInfo.error);
          }
          // Se não encontrou imagem ou já tinha a mesma, retorna o chat original
          return currentChat;
        } catch (error) {
          console.error(`[UI_ERROR] Erro GERAL ao buscar imagem para ${currentChat.id}:`, error);
          return currentChat; // Retorna original em caso de erro
        }
      });

      // Aguarda todas as promessas
      const updatedChats = await Promise.all(promises);

      // Atualiza o estado apenas se houve mudança
      if (updatedNeeded) {
        console.log('[UI_LOG] Atualizando estado de chats com novas imagens.');
        setChats(updatedChats);
      }
    };

    // Executa a busca (talvez com um pequeno delay para não sobrecarregar logo de início)
    const timerId = setTimeout(fetchMissingProfileImages, 500);

    // Limpa o timeout se o componente desmontar ou as dependências mudarem
    return () => clearTimeout(timerId);

  }, [chats, selectedInstance]); // Re-executa se a lista de chats ou a instância mudar

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

  const handleForwardMessage = () => {
    setShowContextMenu(null);
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
      if (!selectedInstance || !selectedInstance.token) {
        console.error('[UI_ERROR] Tentando carregar mensagens sem instância ou token.');
        setError('Instância inválida ou não selecionada.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      setMessages([]); // Limpa mensagens antigas ao carregar novas
      setApiRequestStatus({ lastCall: `getAllMessagesFromChat(${chatId}) via POST /message/find`, status: 'iniciada' });

      console.log('[UI_LOG] Carregando mensagens (POST /message/find) para o chat:', chatId);

      // Chamar a função corrigida que usa POST /message/find
      const messagesResponse = await getAllMessagesFromChat(
        selectedInstance.id, 
        chatId, 
        selectedInstance.token
      );
      
      console.log('[UI_LOG] Resposta recebida de getAllMessagesFromChat (POST /message/find):', messagesResponse);
      
      if (messagesResponse.success && Array.isArray(messagesResponse.messages)) {
        console.log(`[UI_LOG] Processando ${messagesResponse.messages.length} mensagens recebidas de POST /message/find`);

        // Log da primeira mensagem para análise da estrutura (vindo de /message/find)
        if (messagesResponse.messages.length > 0) {
          console.log('[UI_LOG] Estrutura da primeira mensagem (de /message/find):', JSON.stringify(messagesResponse.messages[0], null, 2));
        }

        // Ordenar mensagens pelo timestamp (a função da API já deve retornar formatado)
        const sortedMessages = [...messagesResponse.messages].sort((a: Message, b: Message) => {
          return (a.timestamp || 0) - (b.timestamp || 0);
        });

        console.log('[UI_LOG] Mensagens finais formatadas e ordenadas (de /message/find):', sortedMessages);
        setMessages(sortedMessages);
        setApiRequestStatus(prev => ({ ...prev, status: `sucesso: ${sortedMessages.length} mensagens` }));

        // Marcar mensagens como lidas
        const unreadMessages = sortedMessages.filter((msg: Message) => !msg.fromMe && !msg.read);
        if (unreadMessages.length > 0) {
          console.log(`[UI_LOG] Marcando ${unreadMessages.length} mensagens como lidas.`);
          // ... (código para marcar como lido)
        }

        // Rolar para o final
        setTimeout(scrollToBottom, 100);

      } else {
        console.error('[UI_ERROR] Erro na resposta da API de mensagens (POST /message/find) ou formato inválido:', messagesResponse.error || messagesResponse);
        toast.error(`Erro ao carregar mensagens: ${messagesResponse.error || 'Formato inválido'}`);
        setError(messagesResponse.error || 'Erro ao carregar mensagens');
        setMessages([]);
        setApiRequestStatus(prev => ({ ...prev, status: `falha: ${messagesResponse.error || 'formato inválido'}` }));
      }

    } catch (error: any) {
      console.error('[UI_ERROR] Erro ao carregar mensagens (POST /message/find):', error);
      toast.error(`Falha ao carregar mensagens: ${error.message || 'Erro desconhecido'}`);
      setError('Falha ao carregar mensagens. Verifique o console (F12).');
      setMessages([]);
      setApiRequestStatus(prev => ({ ...prev, status: `erro: ${error.message}` }));
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

  const _handleSelectChat = (chat: Chat) => {
    console.log('[UI_LOG] Selecionando chat:', chat);
    if (selectedChat?.id === chat.id) {
      console.log('[UI_LOG] Chat já selecionado, recarregando mensagens...');
    } else {
      setSelectedChat(chat);
      setMessages([]); // Limpar mensagens anteriores
    }
    setLoading(true); // Indicar que está carregando
    loadMessages(chat.id);
    
    // Tentar marcar como lido aqui pode ser prematuro, melhor após loadMessages
    // try {
    //   console.log('Marcando mensagens como lidas para o chat:', chat.id);
    // } catch (error) {
    //   console.error('Erro ao marcar mensagens como lidas:', error);
    // }
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
            isGroup: chatId.includes('g.us'),
            profileImage: ''
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

  const _renderMessage = (message: Message) => {
    return (
      <div
        key={message.id}
        id={`msg-${message.id}`}
        className={`flex ${message.fromMe ? 'justify-end' : 'justify-start'} mb-3`}
        onContextMenu={(e) => handleMessageContextMenu(e, message.id)}
      >
        {!message.fromMe && (
          <div className="h-8 w-8 rounded-full mr-2 overflow-hidden flex-shrink-0">
            {message.senderProfileImage ? (
              <img 
                src={message.senderProfileImage} 
                alt={message.senderName || 'Contato'} 
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gray-300 flex items-center justify-center text-xs">
                {(message.senderName || '?').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        )}
        <div
          className={`relative max-w-[80%] p-2 rounded-lg shadow-sm ${
            message.fromMe 
              ? 'bg-[#dcf8c6] rounded-tr-none' 
              : 'bg-white rounded-tl-none'
          }`}
        >
          {/* Mostrar o nome do remetente se não for uma mensagem minha */}
          {!message.fromMe && message.senderName && (
            <div className="text-xs font-medium text-primary-600 mb-1">
              {message.senderName}
            </div>
          )}
          
          {/* Se for mensagem encaminhada */}
          {message.isForwarded && (
            <div className="text-xs text-gray-500 mb-1 flex items-center">
              <Forward className="h-3 w-3 mr-1" />
              Encaminhada
            </div>
          )}
          
          {/* Se for resposta a outra mensagem */}
          {message.quotedMsg && (
            <div className="bg-gray-100 p-1 rounded mb-1 border-l-2 border-gray-300 text-xs text-gray-600">
              <div className="font-medium">{message.quotedMsg.fromMe ? 'Você' : message.quotedMsg.sender}</div>
              <div className="truncate">{message.quotedMsg.content}</div>
            </div>
          )}
          
          {/* Conteúdo da mensagem */}
          {message.content && (
            <p className="text-sm text-gray-800 break-words whitespace-pre-wrap">{message.content}</p>
          )}
          
          {/* Informações de hora e status */}
          <div className="flex items-center justify-end mt-1 space-x-1">
            <span className="text-[10px] text-gray-500">
              {formatTime(message.timestamp)}
            </span>
            
            {message.fromMe && (
              <span>
                {message.status === 'sending' && <div className="h-3 w-3 text-gray-400">⌛</div>}
                {message.status === 'sent' && <Check className="h-3 w-3 text-gray-400" />}
                {message.status === 'delivered' && (
                  <div className="flex">
                    <Check className="h-3 w-3 text-gray-400" />
                    <Check className="h-3 w-3 text-gray-400 -ml-1" />
                  </div>
                )}
                {message.status === 'read' && (
                  <div className="flex">
                    <Check className="h-3 w-3 text-blue-500" />
                    <Check className="h-3 w-3 text-blue-500 -ml-1" />
                  </div>
                )}
                {message.status === 'failed' && (
                  <div className="text-red-500 text-[10px]">Falha</div>
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Adicionar este renderização condicional para o painel de diagnóstico antes do return final
  const renderDiagnosticPanel = () => {
    if (!showDiagnosticInfo) return null;
    
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 z-50 text-xs font-mono max-h-60 overflow-auto">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold">Diagnóstico de API</h3>
          <button 
            onClick={() => setShowDiagnosticInfo(false)}
            className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
          >
            Fechar
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <strong>Status da Instância:</strong> {selectedInstance ? selectedInstance.status : 'nenhuma'}
          </div>
          <div>
            <strong>Instância ID:</strong> {selectedInstance?.id || 'nenhuma'}
          </div>
          <div>
            <strong>Chat selecionado:</strong> {selectedChat?.id || 'nenhum'}
          </div>
          <div>
            <strong>Mensagens carregadas:</strong> {messages.length}
          </div>
          <div>
            <strong>Status de carregamento:</strong> {loading ? 'carregando...' : 'pronto'}
          </div>
          <div>
            <strong>Erro:</strong> {error || 'nenhum'}
          </div>
          <div className="col-span-2">
            <strong>Última chamada API:</strong> {apiRequestStatus.lastCall}
          </div>
          <div className="col-span-2">
            <strong>Status da chamada:</strong> {apiRequestStatus.status}
          </div>
        </div>
        <div className="mt-2">
          <button 
            onClick={() => {
              if (selectedChat) {
                toast.loading('Recarregando mensagens...');
                loadMessages(selectedChat.id);
              }
            }}
            disabled={!selectedChat}
            className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded mr-2 disabled:opacity-50"
          >
            Recarregar Mensagens
          </button>
          <button 
            onClick={() => {
              loadChats();
            }}
            className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded mr-2"
          >
            Recarregar Chats
          </button>
          <button
            onClick={() => {
              console.clear();
              toast.success('Console limpo');
            }}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded"
          >
            Limpar Console
          </button>
        </div>
      </div>
    );
  };

  // Função para reselecionar a instância atual
  const handleReopenInstanceSelection = () => {
    setShowInstanceModal(true);
  };

  return (
    <div className="h-screen max-h-screen overflow-hidden flex flex-col bg-gray-100">
      {showInstanceModal && (
        <SelectInstanceModal 
          onClose={() => setShowInstanceModal(false)}
          onSelect={handleSelectInstance}
        />
      )}
      
      <div className="bg-white shadow-sm p-4 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-gray-800">
            {selectedInstance ? selectedInstance.name : 'ChatZap'}
          </h1>
          {selectedInstance && (
            <div className="inline-flex items-center text-sm">
              <span className={`w-2 h-2 rounded-full mr-2 ${
                selectedInstance.status === 'connected' ? 'bg-green-500' : 
                selectedInstance.status === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
              }`}></span>
              <span className="text-gray-600">
                {selectedInstance.status === 'connected' ? 'Conectado' : 
                selectedInstance.status === 'connecting' ? 'Conectando...' : 'Desconectado'}
              </span>
            </div>
          )}
          
          {/* Botão para mostrar/esconder diagnóstico */}
          <button 
            onClick={() => setShowDiagnosticInfo(!showDiagnosticInfo)}
            className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
            title="Mostrar informações de diagnóstico"
          >
            {showDiagnosticInfo ? 'Ocultar Diagnóstico' : 'Diagnóstico'}
          </button>
          
          {/* Botão para trocar de instância */}
          <button 
            onClick={() => setShowInstanceModal(true)}
            className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded flex items-center"
            title="Trocar instância"
          >
            <Smartphone className="h-3 w-3 mr-1" />
            Trocar Instância
          </button>
        </div>
        
        {/* Painel de diagnóstico */}
        {renderDiagnosticPanel()}
      </div>
      
      {/* Layout principal - Lista de chats e mensagens */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Lista de chats */}
        <div className="w-80 border-r border-gray-200 flex flex-col bg-white flex-shrink-0 min-h-0">
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
          
          <div className="flex-1 overflow-y-auto min-h-0">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
              </div>
            ) : error ? (
              <div className="p-4 text-center">
                <div className="text-red-500 mb-2">{error}</div>
                <button 
                  onClick={loadChats}
                  className="px-3 py-1 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm"
                >
                  Tentar novamente
                </button>
              </div>
            ) : activeTab === 'chats' ? (
              chats.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="rounded-full bg-gray-100 h-16 w-16 flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 mb-2">
                    {isUsingMockData ? 
                      'Nenhuma conversa encontrada. Os dados mostrados são exemplos.' : 
                      'Nenhuma conversa encontrada. Verifique a conexão com a API uazapiGO.'}
                  </p>
                  <div className="flex justify-center space-x-2">
                    <button 
                      onClick={loadChats}
                      className="px-3 py-1 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm"
                    >
                      Atualizar
                    </button>
                    <button 
                      onClick={() => setShowDiagnosticInfo(!showDiagnosticInfo)}
                      className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                    >
                      Diagnóstico
                    </button>
                    <button 
                      onClick={handleReopenInstanceSelection}
                      className="px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 text-sm"
                    >
                      Trocar Instância
                    </button>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {chats.map((chat) => (
                    <button
                      key={chat.id}
                      className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 ${
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
                              const target = e.target as HTMLImageElement;
                              target.onerror = null;
                              target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name)}&background=random&color=fff&size=128`;
                            }}
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                            {chat.isGroup ? (
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                              </svg>
                            ) : (
                              <div className="text-gray-500 text-lg font-semibold">
                                {chat.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        )}
                        {chat.unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center">
                            {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-900 truncate text-left">{chat.name || 'Nome Indisponível'}</h3>
                              <div className="text-xs text-gray-500 truncate text-left">{chat.displayNumber || ''}</div>
                              <div className="text-sm text-gray-500 truncate text-left mt-0.5">{chat.lastMessage || "Nenhuma mensagem"}</div>
                            </div>
                            {chat.timestamp && (
                              <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                                {new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )
            ) : (
              groups.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="rounded-full bg-gray-100 h-16 w-16 flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 mb-2">Nenhum grupo encontrado</p>
                  <button 
                    onClick={loadGroups}
                    className="px-3 py-1 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm"
                  >
                    Atualizar
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {/* Lista de grupos */}
                </div>
              )
            )}
          </div>
        </div>
        
        {/* Área de mensagens */}
        <div className="flex-1 flex flex-col bg-[#e5ddd5] min-h-0">
          {selectedChat ? (
            <div className="flex flex-col h-full min-h-0">
              <div className="p-3 bg-gray-100 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center mr-3 overflow-hidden">
                    {selectedChat.profileImage ? (
                      <img 
                        src={selectedChat.profileImage} 
                        alt={selectedChat.name} 
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          // Se a imagem falhar ao carregar, substituir pelo avatar padrão
                          const target = e.target as HTMLImageElement;
                          target.onerror = null; // Previne loop infinito
                          target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedChat.name)}&background=random&color=fff&size=128`;
                        }}
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        {selectedChat.isGroup ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                          </svg>
                        ) : (
                          <div className="text-gray-500 text-lg font-semibold">
                            {selectedChat.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-sm font-medium text-gray-900">{selectedChat.name}</h2>
                    <p className="text-xs text-gray-500">
                      {selectedChat.isGroup 
                        ? 'Grupo' 
                        : 'Último acesso ' + (selectedChat.lastSeen 
                          ? formatDateTime(Number(selectedChat.lastSeen)) 
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
                  <button 
                    className="text-gray-600 hover:text-gray-800"
                    onClick={() => {
                      const options = [
                        {label: 'Informações do contato', action: () => loadProfileInfo(selectedChat.id)},
                        {label: 'Atualizar chat', action: () => loadMessages(selectedChat.id)},
                      ];
                      const action = prompt('Escolha uma ação:\n1. Informações do contato\n2. Atualizar chat');
                      if (action === '1') options[0].action();
                      if (action === '2') options[1].action();
                    }}
                  >
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 bg-[url('/whatsapp-bg.png')] bg-repeat min-h-0"
              >
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin h-10 w-10 border-4 border-primary-600 border-t-transparent rounded-full" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-2">
                      <MessageCircle className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-sm">Sem mensagens ainda</p>
                    <button
                      onClick={() => loadMessages(selectedChat.id)}
                      className="mt-4 px-3 py-1 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm"
                    >
                      Atualizar mensagens
                    </button>
                  </div>
                ) : (
                  searchResults.length > 0 ? (
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
                        {/* Resultados da pesquisa aqui */}
                      </div>
                    </div>
                  ) : (
                    <>
                      {messages.map((message: Message) => _renderMessage(message))}
                      <div ref={messagesEndRef} />
                    </>
                  )
                )}
              </div>
              
              <div className="p-3 bg-gray-100 flex-shrink-0">
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
                        {/* Opções de anexo */}
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
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full bg-gray-50">
              <div className="w-64 h-64 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                <MessageCircle className="h-32 w-32 text-gray-400" />
              </div>
              <h2 className="text-2xl font-medium text-gray-700 mb-2">ChatZap</h2>
              <p className="text-gray-500 text-center max-w-md mb-8">
                Selecione um chat para começar a conversar.
              </p>
              <div className="text-center">
                <button
                  onClick={loadChats}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Atualizar lista de chats
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}