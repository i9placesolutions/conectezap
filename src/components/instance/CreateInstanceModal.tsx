import { useState } from 'react';
import { X, Loader2, QrCode } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface CreateInstanceModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateInstanceModal({ onClose, onSuccess }: CreateInstanceModalProps) {
  const [instanceName, setInstanceName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'qr' | 'connecting'>('form');

  const handleCreateInstance = async () => {
    if (!instanceName.trim()) {
      toast.error('Por favor, informe um nome para a instância');
      return;
    }

    try {
      setIsCreating(true);
      
      // Simulando criação de instância
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Avançar para o passo do QR code
      setQrCode('https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=WhatsAppMockQRCode');
      setStep('qr');
      
    } catch (error) {
      console.error('Erro ao criar instância:', error);
      toast.error('Ocorreu um erro ao criar a instância');
    } finally {
      setIsCreating(false);
    }
  };

  const handleManualConnect = async () => {
    try {
      setStep('connecting');
      
      // Simulando processo de conexão
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success('Instância conectada com sucesso!');
      onSuccess();
    } catch (error) {
      console.error('Erro ao conectar instância:', error);
      toast.error('Ocorreu um erro ao conectar a instância');
      setStep('qr');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {step === 'form' ? 'Nova Instância do WhatsApp' : 
             step === 'qr' ? 'Escaneie o QR Code' : 
             'Conectando...'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {step === 'form' && (
          <>
            <div className="mb-4">
              <label htmlFor="instanceName" className="block text-sm font-medium text-gray-700 mb-1">
                Nome da Instância
              </label>
              <input
                type="text"
                id="instanceName"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                placeholder="Ex: WhatsApp Vendas"
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
              />
            </div>

            <div className="flex justify-end mt-6">
              <button
                type="button"
                onClick={onClose}
                className="mr-3 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateInstance}
                disabled={isCreating}
                className="px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />
                    Criando...
                  </>
                ) : (
                  'Criar Instância'
                )}
              </button>
            </div>
          </>
        )}

        {step === 'qr' && qrCode && (
          <div className="text-center">
            <div className="bg-white p-4 mb-4 rounded-lg inline-block">
              <img src={qrCode} alt="QR Code para escaneamento" className="mx-auto" />
            </div>
            <p className="text-sm text-gray-600 mb-6">
              Abra o WhatsApp no seu celular e escaneie este QR Code
            </p>
            <div className="flex justify-center mt-4">
              <button
                onClick={handleManualConnect}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md shadow-sm hover:bg-green-700"
              >
                <QrCode className="h-4 w-4 mr-2" />
                Já escaneei o código
              </button>
            </div>
          </div>
        )}

        {step === 'connecting' && (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-green-600" />
            <p className="text-sm text-gray-600">
              Conectando sua instância do WhatsApp...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
