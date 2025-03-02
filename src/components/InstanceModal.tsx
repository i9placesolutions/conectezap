import { useInstance } from '../contexts/InstanceContext';
import { cn } from '../lib/utils';

export function InstanceModal() {
  const { 
    instances, 
    showInstanceModal, 
    setShowInstanceModal,
    setSelectedInstance,
    loading 
  } = useInstance();

  if (!showInstanceModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">Selecione uma Instância</h2>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-2">
            {instances.map(instance => (
              <button
                key={instance.id}
                onClick={() => {
                  setSelectedInstance(instance);
                  setShowInstanceModal(false);
                }}
                className={cn(
                  "w-full p-4 rounded-lg border text-left transition-colors",
                  instance.status === 'connected' 
                    ? "border-green-200 bg-green-50 hover:bg-green-100"
                    : "border-red-200 bg-red-50 hover:bg-red-100"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{instance.name}</span>
                    {instance.isDefault && (
                      <span className="ml-2 text-xs bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full">
                        Padrão
                      </span>
                    )}
                  </div>
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs",
                    instance.status === 'connected' 
                      ? "bg-green-200 text-green-800"
                      : "bg-red-200 text-red-800"
                  )}>
                    {instance.status === 'connected' ? 'Conectado' : 'Desconectado'}
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