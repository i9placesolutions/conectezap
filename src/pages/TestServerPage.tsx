import React from 'react';
import { ServerSelector } from '../components/ServerSelector';
import { useServer } from '../contexts/ServerContext';

export function TestServerPage() {
  const { selectedServer, servers } = useServer();

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Teste de Seleção de Servidor
        </h1>
        
        {/* Seletor de servidor */}
        <div className="mb-8">
          <ServerSelector />
        </div>

        {/* Informações atuais */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Informações do Servidor Atual
          </h2>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="font-medium text-gray-600">Nome:</span>
                <p className="text-gray-900">{selectedServer.name}</p>
              </div>
              
              <div>
                <span className="font-medium text-gray-600">URL:</span>
                <p className="text-gray-900 font-mono text-sm">{selectedServer.url}</p>
              </div>
              
              <div>
                <span className="font-medium text-gray-600">ID:</span>
                <p className="text-gray-900">{selectedServer.id}</p>
              </div>
              
              <div>
                <span className="font-medium text-gray-600">Token (primeiros 10 chars):</span>
                <p className="text-gray-900 font-mono text-sm">
                  {selectedServer.adminToken.substring(0, 10)}...
                </p>
              </div>
            </div>
          </div>

          {/* Lista de todos os servidores */}
          <h2 className="text-lg font-semibold text-gray-800 mt-8">
            Todos os Servidores Disponíveis
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {servers.map((server) => (
              <div 
                key={server.id}
                className={`border rounded-lg p-4 ${
                  server.id === selectedServer.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <h3 className="font-medium text-gray-900">{server.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{server.url}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Token: {server.adminToken.substring(0, 10)}...
                </p>
                {server.id === selectedServer.id && (
                  <span className="inline-block mt-2 px-2 py-1 text-xs bg-primary-100 text-primary-800 rounded">
                    Ativo
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 