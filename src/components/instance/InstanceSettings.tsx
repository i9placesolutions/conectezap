import { useState, useEffect } from 'react';
import { X, RefreshCw, Power, Copy, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { cn } from '../../lib/utils';

interface InstanceSettingsProps {
  instanceId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface InstanceSettings {
  rejectCall: boolean;
  msgCall: string;
  groupsIgnore: boolean;
  alwaysOnline: boolean;
  readMessages: boolean;
  syncFullHistory: boolean;
  readStatus: boolean;
}

export function InstanceSettings({ instanceId, isOpen, onClose }: InstanceSettingsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [settings, setSettings] = useState<InstanceSettings>({
    rejectCall: false,
    msgCall: '',
    groupsIgnore: false,
    alwaysOnline: true,
    readMessages: true,
    syncFullHistory: false,
    readStatus: true
  });
  const [instanceData, setInstanceData] = useState<any>(null);

  useEffect(() => {
    loadInstanceData();
  }, [instanceId]);

  const loadInstanceData = async () => {
    try {
      setIsLoading(true);
      
      // Simular chamada à API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Dados mockados para exemplo
      setInstanceData({
        name: 'i9place',
        description: 'i9Place - Marketing e App Solutions',
        status: 'connected',
        apiKey: '0d27a0851b7fb780de4de28a714d9b680bcc2d5d27c588bd39c0d6ab19478dcc'
      });

      setSettings({
        rejectCall: false,
        msgCall: 'Desculpe, não posso atender chamadas no momento.',
        groupsIgnore: false,
        alwaysOnline: true,
        readMessages: true,
        syncFullHistory: false,
        readStatus: true
      });
    } catch (error) {
      console.error('Error loading instance data:', error);
      toast.error('Erro ao carregar dados da instância');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Simular chamada à API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Configurações salvas com sucesso!');
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  const copyApiKey = async () => {
    try {
      await navigator.clipboard.writeText(instanceData?.apiKey || '');
      toast.success('Chave API copiada para a área de transferência!');
    } catch (error) {
      toast.error('Erro ao copiar chave API');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-2xl max-w-2xl w-full p-6 z-50 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Configurações da Instância
            </h2>
            {!isLoading && instanceData && (
              <p className="text-sm text-gray-500 mt-1">
                {instanceData.name}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Instance Info */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    instanceData?.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                  )} />
                  <span className="text-sm text-gray-900">
                    {instanceData?.status === 'connected' ? 'Conectado' : 'Desconectado'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chave API
                </label>
                <div className="relative">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    value={instanceData?.apiKey}
                    readOnly
                    className="pr-20"
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title={showApiKey ? 'Ocultar chave' : 'Mostrar chave'}
                    >
                      {showApiKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={copyApiKey}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="Copiar chave"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Settings Form */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Message Settings */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-4">
                    Configurações de Mensagens
                  </h3>
                  <div className="space-y-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.readMessages}
                        onChange={(e) => setSettings({ ...settings, readMessages: e.target.checked })}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">Marcar mensagens como lidas</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.readStatus}
                        onChange={(e) => setSettings({ ...settings, readStatus: e.target.checked })}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">Enviar confirmação de leitura</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.syncFullHistory}
                        onChange={(e) => setSettings({ ...settings, syncFullHistory: e.target.checked })}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">Sincronizar histórico completo</span>
                    </label>
                  </div>
                </div>

                {/* Call Settings */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-4">
                    Configurações de Chamadas
                  </h3>
                  <div className="space-y-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.rejectCall}
                        onChange={(e) => setSettings({ ...settings, rejectCall: e.target.checked })}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">Rejeitar chamadas automaticamente</span>
                    </label>

                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Mensagem de rejeição
                      </label>
                      <Input
                        value={settings.msgCall}
                        onChange={(e) => setSettings({ ...settings, msgCall: e.target.value })}
                        placeholder="Mensagem enviada ao rejeitar chamadas"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Group Settings */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-4">
                  Configurações de Grupos
                </h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.groupsIgnore}
                      onChange={(e) => setSettings({ ...settings, groupsIgnore: e.target.checked })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Ignorar mensagens de grupos</span>
                  </label>
                </div>
              </div>

              {/* Presence Settings */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-4">
                  Configurações de Presença
                </h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.alwaysOnline}
                      onChange={(e) => setSettings({ ...settings, alwaysOnline: e.target.checked })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Manter sempre online</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                isLoading={isSaving}
              >
                Salvar Alterações
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}