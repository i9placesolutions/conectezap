import { Smartphone, Copy, QrCode, Power, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'react-hot-toast';

interface InstanceCardProps {
  instance: {
    id: string;
    name: string;
    displayName?: string;
    status: 'connected' | 'disconnected' | 'connecting';
    token: string;
  };
  onGenerateQR: () => void;
  onDisconnect?: () => void;
  onDelete?: () => void;
}

export function InstanceCard({ 
  instance, 
  onGenerateQR,
  onDisconnect,
  onDelete
}: InstanceCardProps) {
  const copyToken = async () => {
    try {
      await navigator.clipboard.writeText(instance.token);
      toast.success('Token copiado!');
    } catch (error) {
      toast.error('Erro ao copiar token');
    }
  };

  return (
    <div className={cn(
      "bg-white rounded-lg border shadow-sm p-4",
      instance.status === 'connected' ? 'border-green-200' : 'border-gray-200'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-10 w-10 rounded-lg flex items-center justify-center",
            instance.status === 'connected' ? 'bg-green-100' : 'bg-gray-100'
          )}>
            <Smartphone className={cn(
              "h-5 w-5",
              instance.status === 'connected' ? 'text-green-600' : 'text-gray-600'
            )} />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{instance.displayName || instance.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <div className={cn(
                "h-2 w-2 rounded-full",
                instance.status === 'connected' ? 'bg-green-500' :
                instance.status === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
              )} />
              <span className="text-sm text-gray-500">
                {instance.status === 'connected' ? 'Conectado' :
                 instance.status === 'connecting' ? 'Conectando' : 'Desconectado'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Token Display */}
      <div className="flex items-center justify-between mt-4">
        <input
          type="text"
          readOnly
          value={instance.token}
          className="w-full px-3 py-2 border rounded-lg text-gray-700 bg-gray-100 focus:outline-none"
        />
        <button onClick={copyToken} className="ml-2 text-gray-500 hover:text-gray-700">
          <Copy className="h-5 w-5" />
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          {/* Disconnect Button */}
          {instance.status === 'connected' && onDisconnect && instance.id !== 'i9place' && (
            <button
              onClick={onDisconnect}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-amber-600 hover:bg-amber-50 rounded-lg"
              title="Desconectar"
            >
              <Power className="h-4 w-4" />
              <span>Desconectar</span>
            </button>
          )}

          {/* QR Code Button */}
          {instance.status !== 'connected' && instance.id !== 'i9place' && (
            <button
              onClick={onGenerateQR}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg"
              title="Gerar QR Code"
            >
              <QrCode className="h-4 w-4" />
              <span>QR Code</span>
            </button>
          )}
        </div>

        {/* Delete Button */}
        {onDelete && instance.id !== 'i9place' && instance.status === 'disconnected' && (
          <button
            onClick={onDelete}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
            title="Excluir instância"
          >
            <Trash2 className="h-4 w-4" />
            <span>Excluir</span>
          </button>
        )}
      </div>
    </div>
  );
}