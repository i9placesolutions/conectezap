import { useState } from 'react';
import { useServer, Server } from '../contexts/ServerContext';
import { updateServerConfig } from '../lib/wapi/api';
import { updateServerConfig as updateApiConfig, recreateApi } from '../services/api';
import { ChevronDown, Server as ServerIcon, Check } from 'lucide-react';

interface ServerSelectorProps {
  compact?: boolean;
}

export function ServerSelector({ compact = false }: ServerSelectorProps) {
  const { servers, selectedServer, setSelectedServer } = useServer();
  const [isOpen, setIsOpen] = useState(false);

  const handleServerChange = (server: Server) => {
    setSelectedServer(server);
    updateServerConfig(server.url, server.adminToken);
    updateApiConfig(server.url, server.adminToken);
    recreateApi();
    setIsOpen(false);
  };

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title={`Servidor: ${selectedServer.name}`}
        >
          <ServerIcon className="h-4 w-4" />
          <span className="hidden sm:inline">{selectedServer.name}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              <div className="p-2">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-2">
                  Selecionar Servidor
                </div>
                {servers.map((server) => (
                  <button
                    key={server.id}
                    onClick={() => handleServerChange(server)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors ${
                      selectedServer.id === server.id
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{server.name}</span>
                      <span className="text-xs text-gray-500">{server.url}</span>
                    </div>
                    {selectedServer.id === server.id && (
                      <Check className="h-4 w-4 text-primary-600" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Servidor UAZAPI
        </label>
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-300 rounded-lg text-left hover:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <div className="flex items-center gap-3">
              <ServerIcon className="h-5 w-5 text-gray-400" />
              <div>
                <div className="font-medium text-gray-900">{selectedServer.name}</div>
                <div className="text-sm text-gray-500">{selectedServer.url}</div>
              </div>
            </div>
            <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {isOpen && (
            <>
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setIsOpen(false)}
              />
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="p-2">
                  {servers.map((server) => (
                    <button
                      key={server.id}
                      onClick={() => handleServerChange(server)}
                      className={`w-full flex items-center justify-between px-3 py-3 text-left rounded-md transition-colors ${
                        selectedServer.id === server.id
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <ServerIcon className="h-5 w-5 text-gray-400" />
                        <div>
                          <div className="font-medium">{server.name}</div>
                          <div className="text-sm text-gray-500">{server.url}</div>
                        </div>
                      </div>
                      {selectedServer.id === server.id && (
                        <Check className="h-5 w-5 text-primary-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="h-2 w-2 rounded-full bg-blue-500 mt-2"></div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-blue-900">Servidor Ativo</h4>
            <p className="text-sm text-blue-700 mt-1">
              Todas as operações serão realizadas usando: <span className="font-medium">{selectedServer.name}</span>
            </p>
            <p className="text-xs text-blue-600 mt-1">
              URL: {selectedServer.url}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 