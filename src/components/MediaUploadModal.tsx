import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, Image, Video, FileText, Music, Trash2, Send, Loader } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';

interface MediaFile {
  id: string;
  file: File;
  type: 'image' | 'video' | 'audio' | 'document';
  preview?: string;
  caption?: string;
}

interface MediaUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMedia: (files: MediaFile[]) => Promise<void>;
  chatName: string;
}

export function MediaUploadModal({ 
  isOpen, 
  onClose, 
  onSendMedia, 
  chatName 
}: MediaUploadModalProps) {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentSending, setCurrentSending] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileType = (file: File): 'image' | 'video' | 'audio' | 'document' => {
    const type = file.type;
    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('video/')) return 'video';
    if (type.startsWith('audio/')) return 'audio';
    return 'document';
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image className="h-6 w-6" />;
      case 'video': return <Video className="h-6 w-6" />;
      case 'audio': return <Music className="h-6 w-6" />;
      default: return <FileText className="h-6 w-6" />;
    }
  };

  const createPreview = (file: File): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        resolve(undefined);
      }
    });
  };

  const addFiles = useCallback(async (files: FileList) => {
    const newMediaFiles: MediaFile[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validar tamanho do arquivo (máximo 50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`Arquivo ${file.name} é muito grande (máximo 50MB)`);
        continue;
      }

      const type = getFileType(file);
      const preview = await createPreview(file);
      
      const mediaFile: MediaFile = {
        id: `${Date.now()}_${i}`,
        file,
        type,
        preview,
        caption: ''
      };
      
      newMediaFiles.push(mediaFile);
    }

    if (newMediaFiles.length > 0) {
      setMediaFiles(prev => [...prev, ...newMediaFiles]);
      toast.success(`${newMediaFiles.length} arquivo(s) adicionado(s)`);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files);
    }
  }, [addFiles]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  const removeFile = (id: string) => {
    setMediaFiles(prev => prev.filter(file => file.id !== id));
  };

  const updateCaption = (id: string, caption: string) => {
    setMediaFiles(prev => prev.map(file => 
      file.id === id ? { ...file, caption } : file
    ));
  };

  const handleSend = async () => {
    if (mediaFiles.length === 0) {
      toast.error('Selecione pelo menos um arquivo');
      return;
    }

    try {
      setSending(true);
      await onSendMedia(mediaFiles);
      setMediaFiles([]);
      onClose();
      toast.success('Mídias enviadas com sucesso!');
    } catch (error) {
      console.error('Erro ao enviar mídias:', error);
      toast.error('Erro ao enviar mídias');
    } finally {
      setSending(false);
      setCurrentSending(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const reset = () => {
    setMediaFiles([]);
    setSending(false);
    setCurrentSending(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Enviar Mídia</h2>
              <p className="text-sm text-gray-500">Para: {chatName}</p>
            </div>
            <button
              onClick={() => {
                reset();
                onClose();
              }}
              disabled={sending}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 disabled:opacity-50"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Upload Area */}
        <div className="p-6 border-b border-gray-200">
          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              dragActive 
                ? "border-primary-500 bg-primary-50" 
                : "border-gray-300 hover:border-gray-400"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              Arraste arquivos aqui ou clique para selecionar
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Imagens, vídeos, áudios e documentos (máximo 50MB cada)
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              Selecionar Arquivos
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar"
              onChange={handleFileSelect}
              className="hidden"
              disabled={sending}
            />
          </div>
        </div>

        {/* Files List */}
        <div className="flex-1 overflow-y-auto p-6">
          {mediaFiles.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum arquivo selecionado</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">
                  Arquivos Selecionados ({mediaFiles.length})
                </h3>
                <button
                  onClick={() => setMediaFiles([])}
                  disabled={sending}
                  className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  Limpar Todos
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mediaFiles.map((mediaFile) => (
                  <div 
                    key={mediaFile.id} 
                    className={cn(
                      "border rounded-lg p-4 transition-all",
                      currentSending === mediaFile.id 
                        ? "border-primary-500 bg-primary-50" 
                        : "border-gray-200"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Preview/Icon */}
                      <div className="flex-shrink-0">
                        {mediaFile.preview ? (
                          <img 
                            src={mediaFile.preview} 
                            alt="Preview"
                            className="h-16 w-16 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="h-16 w-16 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                            {getFileIcon(mediaFile.type)}
                          </div>
                        )}
                      </div>

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {mediaFile.file.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatFileSize(mediaFile.file.size)} • {mediaFile.type}
                            </p>
                          </div>
                          
                          {/* Status/Actions */}
                          <div className="flex items-center gap-2 ml-3">
                            {currentSending === mediaFile.id && (
                              <Loader className="h-4 w-4 text-primary-600 animate-spin" />
                            )}
                            <button
                              onClick={() => removeFile(mediaFile.id)}
                              disabled={sending}
                              className="text-red-500 hover:text-red-700 disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Caption Input */}
                        <div className="mt-3">
                          <input
                            type="text"
                            placeholder="Legenda (opcional)"
                            value={mediaFile.caption}
                            onChange={(e) => updateCaption(mediaFile.id, e.target.value)}
                            disabled={sending}
                            className="w-full text-sm border border-gray-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {mediaFiles.length > 0 && (
                <span>
                  {mediaFiles.length} arquivo(s) • Serão enviados sequencialmente
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  reset();
                  onClose();
                }}
                disabled={sending}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSend}
                disabled={mediaFiles.length === 0 || sending}
                className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Enviar {mediaFiles.length > 0 && `(${mediaFiles.length})`}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 