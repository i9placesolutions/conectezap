import React, { useState, useRef } from 'react';
import { Download, Play, Pause, Volume2, VolumeX, FileText, Image as ImageIcon, Video, Music } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { uazapiService } from '../services/uazapiService';

interface MediaRendererProps {
  message: {
    id: string;
    type: string;
    content: string;
    mediaUrl?: string;
    fromMe: boolean;
  };
  instanceToken: string;
}

export function MediaRenderer({ message, instanceToken }: MediaRendererProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadedUrl, setDownloadedUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Debug inicial do componente
  console.log('🎬 MediaRenderer renderizado:', {
    messageId: message.id,
    messageType: message.type,
    hasMediaUrl: !!message.mediaUrl,
    mediaUrl: message.mediaUrl?.substring(0, 50) + '...',
    hasInstanceToken: !!instanceToken,
    fromMe: message.fromMe,
    content: typeof message.content === 'string' ? message.content.substring(0, 50) + '...' : message.content
  });

  // Função para baixar mídia
  const handleDownload = async () => {
    console.log('🖱️ CLIQUE NA MÍDIA - Iniciando handleDownload:', {
      messageId: message.id,
      messageType: message.type,
      isDownloading: isDownloading,
      hasDownloadedUrl: !!downloadedUrl,
      downloadedUrl: downloadedUrl?.substring(0, 50) + '...',
      hasInstanceToken: !!instanceToken,
      instanceTokenPreview: instanceToken?.substring(0, 10) + '...'
    });
    
    if (isDownloading) {
      console.log('⏳ Download já em andamento, ignorando clique');
      return;
    }
    
    setIsDownloading(true);
    try {
      console.log('📥 Iniciando processo de download da mídia:', {
        messageId: message.id,
        type: message.type,
        hasExistingUrl: !!downloadedUrl
      });
      
      // Se já tem URL baixada, usar ela
      if (downloadedUrl) {
        console.log('✨ Usando URL já baixada:', downloadedUrl.substring(0, 50) + '...');
        downloadFile(downloadedUrl, getFileName());
        return;
      }

      console.log('🌐 Chamando API downloadMessageMedia com parâmetros:', {
        instanceToken: instanceToken.substring(0, 10) + '...',
        messageId: message.id,
        transcribe: message.type === 'audio'
      });

      // Chamar API para baixar o arquivo
      const response = await uazapiService.downloadMessageMedia(
        instanceToken,
        message.id,
        message.type === 'audio' // Transcrever se for áudio
      );

      console.log('📨 Resposta da API downloadMessageMedia:', {
        hasResponse: !!response,
        responseType: typeof response,
        hasUrl: !!(response && response.url),
        hasFileURL: !!(response && response.fileURL),
        url: response?.url?.substring(0, 50) + '...',
        fileURL: response?.fileURL?.substring(0, 50) + '...',
        hasTranscription: !!(response && response.transcription),
        hasError: !!(response && response.error),
        error: response?.error,
        allKeys: response ? Object.keys(response) : 'sem resposta'
      });

      // A API UAZAPI pode retornar 'url' ou 'fileURL'
      const downloadUrl = response?.url || response?.fileURL;
      
      if (response && downloadUrl) {
        console.log('✅ URL de download obtida:', downloadUrl.substring(0, 50) + '...');
        setDownloadedUrl(downloadUrl);
        downloadFile(downloadUrl, getFileName());
        
        // Se for áudio e houve transcrição, mostrar
        if (response.transcription) {
          console.log('🎤 Transcrição obtida:', response.transcription.substring(0, 100) + '...');
          toast.success(`Transcrição: ${response.transcription}`);
        }
        
        toast.success('Arquivo baixado com sucesso!');
      } else {
        console.error('❌ Resposta da API não contém URL válida:', response);
        throw new Error('URL do arquivo não encontrada na resposta da API');
      }
      
    } catch (error: any) {
      console.error('❌ ERRO DETALHADO ao baixar mídia:', {
        message: error.message,
        stack: error.stack,
        response: error.response,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      
      const errorMessage = error.message || 'Erro desconhecido ao baixar arquivo';
      toast.error(`Erro ao baixar arquivo: ${errorMessage}`);
    } finally {
      console.log('🔚 Finalizando processo de download');
      setIsDownloading(false);
    }
  };

  // Função auxiliar para baixar arquivo
  const downloadFile = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Gerar nome do arquivo baseado no tipo e timestamp
  const getFileName = () => {
    const timestamp = new Date().getTime();
    const extension = getFileExtension();
    return `message_${message.id}_${timestamp}.${extension}`;
  };

  const getFileExtension = () => {
    switch (message.type) {
      case 'image': return 'jpg';
      case 'video': return 'mp4';
      case 'audio': return 'mp3';
      case 'document': return 'pdf';
      default: return 'bin';
    }
  };

  // Controles de áudio
  const toggleAudioPlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleAudioMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Controles de vídeo
  const toggleVideoPlay = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleVideoProgress = () => {
    if (!videoRef.current) return;
    const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
    setProgress(progress);
  };

  const handleAudioProgress = () => {
    if (!audioRef.current) return;
    const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
    setProgress(progress);
  };

  // Renderizar diferentes tipos de mídia
  const renderMediaContent = () => {
    const hasUrl = message.mediaUrl || downloadedUrl;

    switch (message.type) {
      case 'image':
        return (
          <div className="relative group max-w-xs">
            {hasUrl ? (
              <img 
                src={downloadedUrl || message.mediaUrl}
                alt="Imagem"
                className="rounded-lg max-w-full h-auto cursor-pointer"
                onClick={handleDownload}
                onError={() => {
                  console.error('Erro ao carregar imagem:', message.mediaUrl);
                }}
              />
            ) : (
              <div 
                className="w-64 h-40 bg-gray-200 rounded-lg flex items-center justify-center cursor-pointer"
                onClick={handleDownload}
              >
                <div className="text-center">
                  <ImageIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">🖼️ Imagem</p>
                  <p className="text-xs text-gray-400">Clique para baixar</p>
                </div>
              </div>
            )}
            
            {/* Overlay com botão de download */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload();
                }}
                disabled={isDownloading}
                className="p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
        );

      case 'video':
        return (
          <div className="relative group max-w-sm">
            {hasUrl ? (
              <div className="relative">
                <video
                  ref={videoRef}
                  src={downloadedUrl || message.mediaUrl}
                  className="rounded-lg max-w-full h-auto"
                  controls
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onTimeUpdate={handleVideoProgress}
                  onError={() => {
                    console.error('Erro ao carregar vídeo:', message.mediaUrl);
                  }}
                >
                  Seu navegador não suporta reprodução de vídeo.
                </video>
                
                {/* Controles customizados podem ser adicionados aqui */}
              </div>
            ) : (
              <div 
                className="w-80 h-48 bg-gray-200 rounded-lg flex items-center justify-center cursor-pointer"
                onClick={handleDownload}
              >
                <div className="text-center">
                  <Video className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">🎥 Vídeo</p>
                  <p className="text-xs text-gray-400">Clique para baixar</p>
                </div>
              </div>
            )}
            
            {/* Botão de download */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload();
                }}
                disabled={isDownloading}
                className="p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
        );

      case 'audio':
      case 'ptt':
        return (
          <div className="flex items-center gap-3 bg-gray-100 rounded-lg p-3 max-w-xs">
            <div className="flex items-center gap-2">
              {hasUrl ? (
                <button
                  onClick={toggleAudioPlay}
                  className="p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700"
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </button>
              ) : (
                <div className="p-2 bg-gray-300 rounded-full">
                  <Music className="h-4 w-4 text-gray-500" />
                </div>
              )}
              
              {hasUrl && (
                <button
                  onClick={toggleAudioMute}
                  className="p-1 text-gray-500 hover:text-gray-700"
                >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </button>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {message.type === 'ptt' ? '🎤 Áudio' : '🎵 Áudio'}
              </p>
              
              {hasUrl ? (
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              ) : (
                <p className="text-xs text-gray-500">Clique em baixar para reproduzir</p>
              )}
            </div>
            
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
            </button>
            
            {/* Player de áudio oculto */}
            {hasUrl && (
              <audio
                ref={audioRef}
                src={downloadedUrl || message.mediaUrl}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onTimeUpdate={handleAudioProgress}
                onEnded={() => setIsPlaying(false)}
                onError={() => {
                  console.error('Erro ao carregar áudio:', message.mediaUrl);
                }}
              />
            )}
          </div>
        );

      case 'document':
        return (
          <div 
            className="flex items-center gap-3 bg-gray-100 rounded-lg p-3 max-w-xs cursor-pointer hover:bg-gray-200"
            onClick={handleDownload}
          >
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                📄 Documento
              </p>
              <p className="text-xs text-gray-500">
                Clique para baixar
              </p>
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
              disabled={isDownloading}
              className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        );

      default:
        return (
          <div className="flex items-center gap-2 text-gray-500 bg-gray-100 rounded-lg p-3">
            <FileText className="h-4 w-4" />
            <span className="text-sm">Tipo de mídia não suportado</span>
          </div>
        );
    }
  };

  return (
    <div className="relative">
      {renderMediaContent()}
      
      {/* Indicador de download */}
      {isDownloading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
          <div className="bg-white rounded-lg p-3 flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-primary-600 border-t-transparent rounded-full"></div>
            <span className="text-sm text-gray-700">Baixando...</span>
          </div>
        </div>
      )}
    </div>
  );
} 