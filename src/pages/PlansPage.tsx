import { useState } from 'react';

import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  AlertTriangle,
  X,
  MessageCircle,
  Users,
  Bot,
  Headphones,
  BarChart3,
  Code,
  Clock,
  Zap,
  Smartphone,
  FileText,
  Webhook,
  Settings,
  BookOpen
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';

interface Feature {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  maxInstances: number;
  features: Feature[];
  isActive: boolean;
}

const defaultFeatures: Feature[] = [
  { 
    id: 'multi',
    name: 'Multi-atendimento',
    description: 'Atendimento simultâneo com múltiplos agentes',
    icon: Users,
    included: false
  },
  { 
    id: 'chatbot',
    name: 'Chatbot Automático',
    description: 'Respostas automáticas e fluxos de conversa',
    icon: Bot,
    included: false
  },
  { 
    id: 'support',
    name: 'Suporte Prioritário',
    description: 'Atendimento prioritário via WhatsApp e email',
    icon: Headphones,
    included: false
  },
  { 
    id: 'reports',
    name: 'Relatórios Avançados',
    description: 'Métricas detalhadas e análises de desempenho',
    icon: BarChart3,
    included: false
  },
  { 
    id: 'api',
    name: 'API de Integração',
    description: 'Integre com seus sistemas existentes',
    icon: Code,
    included: false
  },
  { 
    id: 'scheduling',
    name: 'Agendamento de Mensagens',
    description: 'Programe envios para datas específicas',
    icon: Clock,
    included: false
  },
  { 
    id: 'mass',
    name: 'Disparo em Massa',
    description: 'Envie mensagens para múltiplos contatos',
    icon: Zap,
    included: false
  },
  { 
    id: 'instances',
    name: 'Gestão de Instâncias',
    description: 'Gerencie múltiplas contas do WhatsApp',
    icon: Smartphone,
    included: false
  },
  { 
    id: 'templates',
    name: 'Templates de Mensagem',
    description: 'Modelos prontos para respostas rápidas',
    icon: FileText,
    included: false
  },
  { 
    id: 'webhooks',
    name: 'Webhooks',
    description: 'Receba notificações em tempo real',
    icon: Webhook,
    included: false
  },
  { 
    id: 'customization',
    name: 'Personalização Avançada',
    description: 'Configure o sistema conforme suas necessidades',
    icon: Settings,
    included: false
  },
  { 
    id: 'training',
    name: 'Treinamento',
    description: 'Capacitação para sua equipe',
    icon: BookOpen,
    included: false
  }
];

export function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState<Partial<Plan>>({
    name: '',
    description: '',
    monthlyPrice: 0,
    annualPrice: 0,
    maxInstances: 1,
    features: defaultFeatures,
    isActive: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const planData = {
        name: formData.name,
        description: formData.description,
        monthly_price: formData.monthlyPrice,
        annual_price: formData.annualPrice,
        max_instances: formData.maxInstances,
        features: formData.features,
        is_active: formData.isActive
      };

      if (isEditing) {
        const { error } = await supabase
          .from('plans')
          .update(planData)
          .eq('id', isEditing);

        if (error) throw error;
        toast.success('Plano atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('plans')
          .insert([planData]);

        if (error) throw error;
        toast.success('Plano criado com sucesso!');
      }

      setIsCreating(false);
      setIsEditing(null);
      loadPlans();
    } catch (error) {
      console.error('Erro ao salvar plano:', error);
      toast.error('Erro ao salvar plano');
    }
  };

  const handleDelete = async (planId: string) => {
    try {
      const { error } = await supabase
        .from('plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;

      toast.success('Plano excluído com sucesso!');
      setShowDeleteConfirm(null);
      loadPlans();
    } catch (error) {
      console.error('Erro ao excluir plano:', error);
      toast.error('Erro ao excluir plano');
    }
  };

  const loadPlans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('plans')
        .select('*');

      if (error) throw error;

      setPlans(data || []);
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
      toast.error('Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurar Planos</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gerencie os planos disponíveis para seus clientes
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Plano
        </Button>
      </div>

      {/* Warning Banner */}
      <div className="rounded-lg bg-amber-50 p-4">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-amber-800">
              Atenção ao modificar planos
            </h3>
            <p className="mt-1 text-sm text-amber-700">
              Alterações em planos existentes podem afetar usuários ativos.
              Considere criar um novo plano em vez de modificar um existente.
            </p>
          </div>
        </div>
      </div>

      {/* Plans List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto" />
            <p className="mt-4 text-gray-600">Carregando planos...</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="p-8 text-center">
            <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nenhum plano cadastrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Preço Mensal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Preço Anual
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Instâncias
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{plan.name}</div>
                      <div className="text-sm text-gray-500">{plan.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        R$ {plan.monthlyPrice.toLocaleString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        R$ {plan.annualPrice.toLocaleString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {plan.maxInstances}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        "px-2 py-1 text-xs font-medium rounded-full",
                        plan.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      )}>
                        {plan.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setFormData(plan);
                            setIsEditing(plan.id);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setShowDeleteConfirm(plan.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(isCreating || isEditing) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {isEditing ? 'Editar Plano' : 'Novo Plano'}
                </h3>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setIsEditing(null);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome do Plano
                    </label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Plano Básico"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descrição
                    </label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Ex: Ideal para pequenas empresas"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Preço Mensal (R$)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.monthlyPrice}
                      onChange={(e) => setFormData({ ...formData, monthlyPrice: Number(e.target.value) })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Preço Anual (R$)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.annualPrice}
                      onChange={(e) => setFormData({ ...formData, annualPrice: Number(e.target.value) })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Número Máximo de Instâncias
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.maxInstances}
                      onChange={(e) => setFormData({ ...formData, maxInstances: Number(e.target.value) })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.isActive ? 'active' : 'inactive'}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                    >
                      <option value="active">Ativo</option>
                      <option value="inactive">Inativo</option>
                    </select>
                  </div>
                </div>

                {/* Features */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    Recursos Incluídos
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {defaultFeatures.map((feature) => {
                      const Icon = feature.icon;
                      return (
                        <label
                          key={feature.id}
                          className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.features?.find(f => f.id === feature.id)?.included}
                            onChange={(e) => {
                              const newFeatures = formData.features?.map(f =>
                                f.id === feature.id ? { ...f, included: e.target.checked } : f
                              );
                              setFormData({ ...formData, features: newFeatures });
                            }}
                            className="h-4 w-4 mt-1 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Icon className="h-4 w-4 text-primary-600" />
                              <span className="text-sm font-medium text-gray-900">
                                {feature.name}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">
                              {feature.description}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreating(false);
                      setIsEditing(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {isEditing ? 'Salvar Alterações' : 'Criar Plano'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Confirmar exclusão
                </h3>
                <p className="text-sm text-gray-500">
                  Tem certeza que deseja excluir este plano? Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="ghost"
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={() => handleDelete(showDeleteConfirm)}
              >
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}