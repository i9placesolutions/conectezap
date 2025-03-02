import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { toast } from 'react-hot-toast';

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  priceAnnual: number;
  maxInstances: number;
  features: string[];
  recommended?: boolean;
}

const plans: Plan[] = [
  {
    id: 'basic',
    name: 'Básico',
    description: 'Ideal para pequenas empresas',
    price: 97,
    priceAnnual: 970,
    maxInstances: 1,
    features: [
      '1 Instância do WhatsApp',
      'Mensagens ilimitadas',
      'Chatbot básico',
      'Suporte por email'
    ]
  },
  {
    id: 'pro',
    name: 'Profissional',
    description: 'Para empresas em crescimento',
    price: 197,
    priceAnnual: 1970,
    maxInstances: 3,
    recommended: true,
    features: [
      'Até 3 Instâncias do WhatsApp',
      'Mensagens ilimitadas',
      'Chatbot avançado',
      'Suporte prioritário',
      'Relatórios avançados',
      'API de integração'
    ]
  },
  {
    id: 'enterprise',
    name: 'Empresarial',
    description: 'Para grandes operações',
    price: 497,
    priceAnnual: 4970,
    maxInstances: 10,
    features: [
      'Até 10 Instâncias do WhatsApp',
      'Mensagens ilimitadas',
      'Chatbot personalizado',
      'Suporte 24/7',
      'API dedicada',
      'Treinamento personalizado',
      'SLA garantido'
    ]
  }
];

export function PlanSelector() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [instances, setInstances] = useState<number>(1);

  const handleSubscribe = async () => {
    try {
      if (!selectedPlan) {
        toast.error('Selecione um plano para continuar');
        return;
      }

      const plan = plans.find(p => p.id === selectedPlan);
      if (!plan) {
        toast.error('Plano inválido');
        return;
      }

      // Redirecionar para o checkout com os dados do plano
      navigate('/checkout', {
        state: {
          plan: {
            ...plan,
            instances,
            billingCycle,
            total: billingCycle === 'monthly' 
              ? plan.price * instances 
              : plan.priceAnnual * instances
          }
        }
      });
    } catch (error) {
      toast.error('Erro ao processar assinatura');
    }
  };

  return (
    <div className="space-y-6">
      {/* Billing Cycle Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md",
              billingCycle === 'monthly'
                ? "bg-white text-gray-900 shadow"
                : "text-gray-500 hover:text-gray-900"
            )}
          >
            Mensal
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md",
              billingCycle === 'annual'
                ? "bg-white text-gray-900 shadow"
                : "text-gray-500 hover:text-gray-900"
            )}
          >
            Anual
            <span className="ml-1 text-xs text-primary-600">
              (2 meses grátis)
            </span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              "relative rounded-2xl bg-white shadow-sm",
              plan.recommended ? "border-2 border-primary-600" : "border border-gray-200",
              selectedPlan === plan.id && "ring-2 ring-primary-600"
            )}
          >
            {plan.recommended && (
              <div className="absolute -top-5 left-0 right-0 mx-auto w-32 rounded-full bg-primary-600 px-3 py-2 text-center text-sm font-semibold text-white">
                Recomendado
              </div>
            )}

            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {plan.name}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {plan.description}
              </p>
              <div className="mt-4">
                <p className="text-3xl font-bold text-gray-900">
                  R$ {billingCycle === 'monthly' ? plan.price : plan.priceAnnual}
                </p>
                <p className="text-sm text-gray-500">
                  por {billingCycle === 'monthly' ? 'mês' : 'ano'}
                </p>
              </div>

              <ul className="mt-6 space-y-4">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary-600 flex-shrink-0" />
                    <span className="text-sm text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="mt-8 w-full"
                variant={selectedPlan === plan.id ? 'outline' : 'primary'}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {selectedPlan === plan.id ? 'Selecionado' : 'Selecionar'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Instance Selection */}
      {selectedPlan && (
        <div className="mt-8 rounded-lg bg-gray-50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Número de Instâncias
              </h3>
              <p className="text-sm text-gray-500">
                Selecione quantas instâncias do WhatsApp você precisa
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setInstances(Math.max(1, instances - 1))}
                className="h-8 w-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100"
              >
                -
              </button>
              <span className="text-lg font-medium text-gray-900 w-8 text-center">
                {instances}
              </span>
              <button
                onClick={() => setInstances(instances + 1)}
                className="h-8 w-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100"
              >
                +
              </button>
            </div>
          </div>

          {/* Warning for instance limit */}
          {selectedPlan && instances > plans.find(p => p.id === selectedPlan)!.maxInstances && (
            <div className="mt-4 rounded-lg bg-amber-50 p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="text-sm text-amber-700">
                    O plano selecionado permite no máximo {plans.find(p => p.id === selectedPlan)!.maxInstances} instâncias.
                    Considere fazer upgrade para um plano superior.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Total Price */}
          <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-6">
            <div>
              <p className="text-sm text-gray-500">Total {billingCycle === 'monthly' ? 'mensal' : 'anual'}</p>
              <p className="text-2xl font-bold text-gray-900">
                R$ {(billingCycle === 'monthly' 
                  ? plans.find(p => p.id === selectedPlan)!.price 
                  : plans.find(p => p.id === selectedPlan)!.priceAnnual
                ) * instances}
              </p>
            </div>
            <Button onClick={handleSubscribe}>
              Assinar Agora
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}