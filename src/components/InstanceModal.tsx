import React, { useState, useEffect } from 'react';
import { useInstance } from '../contexts/InstanceContext';
import { cn } from '../lib/utils';
import { getInstances } from '../lib/wapi/api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

interface ApiInstance {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'connecting';
  token: string;
  phoneConnected: string;
  profileName: string;
  systemName: string;
}

export function InstanceModal() {
  const { 
    showInstanceModal, 
    setShowInstanceModal,
    setSelectedInstance
  } = useInstance();
  
  const [apiInstances, setApiInstances] = useState<ApiInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (showInstanceModal) {
      loadConnectedInstances();
    }
  }, [showInstanceModal]);

  const loadConnectedInstances = async () => {
    try {
      setLoading(true);
      const instances = await getInstances();
      
      // Filtrar apenas instâncias conectadas
      const connectedInstances = instances.filter(instance => 
        instance.status === 'connected'
      );
      
      setApiInstances(connectedInstances);
      
      if (connectedInstances.length === 0) {
        toast.error('Nenhuma instância conectada encontrada');
      }
    } catch (error) {
      console.error('Erro ao carregar instâncias:', error);
      toast.error('Erro ao carregar instâncias conectadas');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectInstance = (instance: ApiInstance) => {
    // Converter para o formato esperado pelo contexto
    const formattedInstance = {
      id: instance.id,
      name: instance.name,
      status: instance.status,
      isDefault: false,
      token: instance.token,
      phoneConnected: instance.phoneConnected,
      profileName: instance.profileName,
      systemName: instance.systemName
    };
    
    setSelectedInstance(formattedInstance);
    setShowInstanceModal(false);
    
    // Navegar para a página de disparo em massa
    navigate('/messages/mass');
  };

  if (!showInstanceModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Selecione uma Instância</h2>
          <button
            onClick={() => setShowInstanceModal(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
            <span className="ml-2 text-gray-600">Carregando instâncias...</span>
          </div>
        ) : apiInstances.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-4">
              Nenhuma instância conectada encontrada
            </div>
            <p className="text-sm text-gray-400">
              Conecte uma instância primeiro para usar o disparo em massa
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-600 mb-4">
              Escolha uma instância conectada para continuar:
            </p>
            {apiInstances.map(instance => (
              <button
                key={instance.id}
                onClick={() => handleSelectInstance(instance)}
                className="w-full p-4 rounded-lg border border-green-200 bg-green-50 hover:bg-green-100 text-left transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{instance.name}</div>
                    {instance.profileName && (
                      <div className="text-sm text-gray-600">{instance.profileName}</div>
                    )}
                    {instance.phoneConnected && (
                      <div className="text-xs text-gray-500">{instance.phoneConnected}</div>
                    )}
                  </div>
                  <span className="px-2 py-1 rounded-full text-xs bg-green-200 text-green-800">
                    Conectado
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}