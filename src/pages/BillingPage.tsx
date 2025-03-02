import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import { PlanSelector } from '../components/billing/PlanSelector';
import { PlanManager } from '../components/billing/PlanManager';
import { Building2, CreditCard, Package } from 'lucide-react';

export function BillingPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('plans');
  const isSuperAdmin = user?.user_metadata?.role === 'super_admin';

  return (
    <div className="space-y-6">
      {/* Description */}
      <div>
        <p className="text-sm text-gray-500">
          Gerencie seus planos e visualize o histórico de faturamento
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="plans">
            <Package className="h-4 w-4 mr-2" />
            Planos
          </TabsTrigger>
          {isSuperAdmin && (
            <TabsTrigger value="manage">
              <Building2 className="h-4 w-4 mr-2" />
              Gerenciar Planos
            </TabsTrigger>
          )}
          <TabsTrigger value="billing">
            <CreditCard className="h-4 w-4 mr-2" />
            Faturamento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plans">
          <PlanSelector />
        </TabsContent>

        {isSuperAdmin && (
          <TabsContent value="manage">
            <PlanManager />
          </TabsContent>
        )}

        <TabsContent value="billing">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Histórico de Faturamento
            </h2>
            {/* Add billing history component here */}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}