import { X } from 'lucide-react';
import { useState } from 'react';
import { Input } from '../ui/Input';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrCode: string | null;
  pairCode?: string | null;
  onPairCode?: (code: string) => Promise<void>;
  onGenerateWithPhone?: (phone: string) => Promise<void>;
}

export function QRCodeModal({ isOpen, onClose, qrCode, pairCode, onPairCode, onGenerateWithPhone }: QRCodeModalProps) {
  const [showPairCode, setShowPairCode] = useState(false);
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [manualPairCode, setManualPairCode] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  console.log('QRCodeModal props:', { isOpen, qrCode }); // Log para debug

  if (!isOpen) return null;

  const handlePairCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onPairCode) return;

    try {
      setIsLoading(true);
      await onPairCode(manualPairCode);
      setManualPairCode('');
      setShowPairCode(false);
    } catch (error) {
      console.error('Erro ao parear por código:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onGenerateWithPhone) return;

    try {
      setIsLoading(true);
      await onGenerateWithPhone(phone);
      setPhone('');
    } catch (error) {
      console.error('Erro ao gerar código com telefone:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Conectar WhatsApp</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4">
          {!showPairCode && !showPhoneInput && (
            <>
              {qrCode ? (
                <div className="space-y-4 w-full">
                  <div className="bg-white p-4 rounded-lg border flex items-center justify-center">
                    <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                  </div>
                  {pairCode && (
                    <div className="text-center">
                      <p className="font-medium text-gray-900">Código de Pareamento:</p>
                      <p className="text-2xl font-bold text-primary-600 mt-1">{pairCode}</p>
                    </div>
                  )}
                  <div className="text-sm text-gray-500 text-center">
                    <p>Abra o WhatsApp no seu celular e:</p>
                    <ol className="list-decimal list-inside mt-2">
                      <li>Acesse Configurações {'>'} Aparelhos conectados</li>
                      <li>Toque em Conectar um aparelho</li>
                      <li>
                        {pairCode 
                          ? 'Digite o código de pareamento acima'
                          : 'Aponte a câmera para o QR Code'
                        }
                      </li>
                    </ol>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 w-full">
                  <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
                  <p className="mt-4 text-sm text-gray-500">Gerando código de conexão...</p>
                </div>
              )}
            </>
          )}

          {showPairCode && (
            <form onSubmit={handlePairCode} className="w-full space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código de Pareamento
                </label>
                <Input
                  value={manualPairCode}
                  onChange={(e) => setManualPairCode(e.target.value)}
                  placeholder="Digite o código de 8 dígitos"
                  required
                  pattern="[0-9]{8}"
                  maxLength={8}
                />
                <p className="mt-1 text-sm text-gray-500">
                  Digite o código de 8 dígitos que aparece no seu WhatsApp
                </p>
              </div>
              <button
                type="submit"
                disabled={isLoading || manualPairCode.length !== 8}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50"
              >
                {isLoading ? 'Conectando...' : 'Conectar'}
              </button>
            </form>
          )}

          {showPhoneInput && (
            <form onSubmit={handlePhoneSubmit} className="w-full space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número do WhatsApp
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ex: 5511999999999"
                  required
                  pattern="[0-9]+"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Digite o número do WhatsApp com código do país e DDD (apenas números)
                </p>
              </div>
              <button
                type="submit"
                disabled={isLoading || !phone}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50"
              >
                {isLoading ? 'Gerando código...' : 'Gerar código de pareamento'}
              </button>
            </form>
          )}

          <div className="w-full border-t pt-4 mt-2 space-y-2">
            {!showPhoneInput && (
              <button
                onClick={() => {
                  setShowPairCode(!showPairCode);
                  setShowPhoneInput(false);
                }}
                className="w-full text-sm text-primary-600 hover:text-primary-700"
              >
                {showPairCode ? 'Voltar para QR Code' : 'Conectar usando código de pareamento'}
              </button>
            )}
            {!showPairCode && (
              <button
                onClick={() => {
                  setShowPhoneInput(!showPhoneInput);
                  setShowPairCode(false);
                }}
                className="w-full text-sm text-primary-600 hover:text-primary-700"
              >
                {showPhoneInput ? 'Voltar para QR Code' : 'Gerar código usando número do WhatsApp'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}