import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { CreditCard, Barcode as Qrcode, Ban as Bank, Check, Copy, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

type PaymentMethod = 'credit' | 'debit' | 'pix';

interface CardFormData {
  number: string;
  name: string;
  expiry: string;
  cvv: string;
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const planData = location.state?.plan;
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('credit');
  const [isLoading, setIsLoading] = useState(false);
  const [cardData, setCardData] = useState<CardFormData>({
    number: '',
    name: '',
    expiry: '',
    cvv: ''
  });

  useEffect(() => {
    if (!planData) {
      toast.error('Selecione um plano primeiro');
      navigate('/billing');
    }
  }, [planData, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Pagamento processado com sucesso!');
      navigate('/');
    } catch (error) {
      toast.error('Erro ao processar pagamento');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPix = () => {
    navigator.clipboard.writeText('00020126580014BR.GOV.BCB.PIX0136f5c3f8f9-dd25-4a21-8e5e-e6b742f3f8f952040000530398654040.005802BR5925CONECTEZAP TECNOLOGIA LTDA6009SAO PAULO62070503***63041D3C');
    toast.success('Código PIX copiado!');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Payment Methods */}
        <div className="lg:col-span-8 border-r border-gray-200">
          <div className="p-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Forma de Pagamento
            </h2>

            {/* Payment Method Selection */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <button
                onClick={() => setSelectedMethod('credit')}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-lg border transition-all",
                  selectedMethod === 'credit'
                    ? "border-primary-600 bg-primary-50 text-primary-700"
                    : "border-gray-200 hover:bg-gray-50"
                )}
              >
                <CreditCard className="h-6 w-6" />
                <span className="text-sm font-medium">Crédito</span>
              </button>

              <button
                onClick={() => setSelectedMethod('debit')}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-lg border transition-all",
                  selectedMethod === 'debit'
                    ? "border-primary-600 bg-primary-50 text-primary-700"
                    : "border-gray-200 hover:bg-gray-50"
                )}
              >
                <Bank className="h-6 w-6" />
                <span className="text-sm font-medium">Débito</span>
              </button>

              <button
                onClick={() => setSelectedMethod('pix')}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-lg border transition-all",
                  selectedMethod === 'pix'
                    ? "border-primary-600 bg-primary-50 text-primary-700"
                    : "border-gray-200 hover:bg-gray-50"
                )}
              >
                <Qrcode className="h-6 w-6" />
                <span className="text-sm font-medium">PIX</span>
              </button>
            </div>

            {/* Credit/Debit Card Form */}
            {(selectedMethod === 'credit' || selectedMethod === 'debit') && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    Número do Cartão
                  </label>
                  <Input
                    id="cardNumber"
                    placeholder="0000 0000 0000 0000"
                    value={cardData.number}
                    onChange={(e) => setCardData({ ...cardData, number: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="cardName" className="block text-sm font-medium text-gray-700 mb-1">
                    Nome no Cartão
                  </label>
                  <Input
                    id="cardName"
                    placeholder="Nome impresso no cartão"
                    value={cardData.name}
                    onChange={(e) => setCardData({ ...cardData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="cardExpiry" className="block text-sm font-medium text-gray-700 mb-1">
                      Validade
                    </label>
                    <Input
                      id="cardExpiry"
                      placeholder="MM/AA"
                      value={cardData.expiry}
                      onChange={(e) => setCardData({ ...cardData, expiry: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="cardCvv" className="block text-sm font-medium text-gray-700 mb-1">
                      CVV
                    </label>
                    <Input
                      id="cardCvv"
                      placeholder="123"
                      value={cardData.cvv}
                      onChange={(e) => setCardData({ ...cardData, cvv: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  isLoading={isLoading}
                >
                  Finalizar Pagamento
                </Button>
              </form>
            )}

            {/* PIX Payment */}
            {selectedMethod === 'pix' && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 p-4 bg-green-50 text-green-700 rounded-lg">
                  <Check className="h-5 w-5" />
                  <p className="text-sm">
                    Você receberá 5% de desconto pagando com PIX!
                  </p>
                </div>

                <div className="flex flex-col items-center">
                  <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg"
                      alt="QR Code PIX"
                      className="w-48 h-48"
                    />
                  </div>

                  <div className="w-full">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-4">
                      <span className="text-sm text-gray-600">Código PIX</span>
                      <button
                        onClick={handleCopyPix}
                        className="flex items-center gap-2 text-primary-600 hover:text-primary-700"
                      >
                        <Copy className="h-4 w-4" />
                        <span className="text-sm">Copiar código</span>
                      </button>
                    </div>

                    <div className="bg-amber-50 p-4 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm text-amber-700">
                            Importante: O pagamento via PIX é processado instantaneamente.
                            Após o pagamento, sua assinatura será ativada automaticamente.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-4 bg-gray-50">
          <div className="p-8 space-y-6 sticky top-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Resumo do Pedido
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Plano {planData?.name}</span>
                  <span className="font-medium text-gray-900">
                    R$ {planData?.price || 0}
                  </span>
                </div>

                {planData?.instances > 1 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {planData.instances} instâncias
                    </span>
                    <span className="font-medium text-gray-900">
                      x{planData.instances}
                    </span>
                  </div>
                )}

                {selectedMethod === 'pix' && (
                  <div className="flex items-center justify-between text-sm text-green-600 font-medium">
                    <span>Desconto PIX (5%)</span>
                    <span>- R$ {(planData?.total * 0.05).toFixed(2)}</span>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-medium text-gray-900">Total</span>
                    <span className="text-xl font-semibold text-gray-900">
                      R$ {selectedMethod === 'pix' 
                        ? (planData?.total * 0.95).toFixed(2) 
                        : planData?.total.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {planData?.billingCycle === 'monthly' ? 'por mês' : 'por ano'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-900 mb-4">
                Pagamento Seguro
              </h3>
              <p className="text-sm text-gray-500">
                Todas as transações são processadas com segurança usando criptografia SSL.
                Seus dados nunca são armazenados em nossos servidores.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}