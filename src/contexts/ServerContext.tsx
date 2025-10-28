import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Server {
  id: string;
  name: string;
  url: string;
  adminToken: string;
  isDefault?: boolean;
}

interface ServerContextType {
  servers: Server[];
  selectedServer: Server;
  setSelectedServer: (server: Server) => void;
  currentServerUrl: string;
  currentAdminToken: string;
}

const defaultServers: Server[] = [
  {
    id: 'i9place1',
    name: 'Servidor 1 (Principal)',
    url: 'https://i9place1.uazapi.com',
    adminToken: 'u1OUnI3tgoQwGII9Fw46XhFWeInWAAVNSO12x3sHwWuI5AkaH2',
    isDefault: true
  },
  {
    id: 'i9place2',
    name: 'Servidor 2',
    url: 'https://i9place2.uazapi.com',
    adminToken: 'AK3N5j5huyLmzdnyNUpOjBH1eYZCEfhg3Cj5uBhxACu9bPtnOJ'
  },
  {
    id: 'i9place3',
    name: 'Servidor 3',
    url: 'https://i9place3.uazapi.com',
    adminToken: '43TUukVMHTIQV5j4iqbX52ZhM63b7s2slt3q04vjygM3lpMf06'
  }
];

const ServerContext = createContext<ServerContextType | undefined>(undefined);

export function ServerProvider({ children }: { children: ReactNode }) {
  const [servers] = useState<Server[]>(defaultServers);
  const [selectedServer, setSelectedServerState] = useState<Server>(defaultServers[0]);

  // Sempre inicializar com o Servidor 1 (Principal) a cada carregamento da página
  useEffect(() => {
    // Forçar sempre o Servidor 1 na inicialização
    setSelectedServerState(defaultServers[0]);
    localStorage.setItem('selectedServerId', defaultServers[0].id);
    
    console.log('🏠 Página carregada - Servidor definido para:', {
      name: defaultServers[0].name,
      url: defaultServers[0].url,
      id: defaultServers[0].id
    });
  }, []); // Array vazio para executar apenas uma vez na montagem

  // Salvar servidor selecionado no localStorage
  const setSelectedServer = (server: Server) => {
    // Nota: A validação de permissão é feita no componente ServerSelector
    // para evitar dependência circular com AuthContext
    
    setSelectedServerState(server);
    localStorage.setItem('selectedServerId', server.id);
    
    // Log para debug
    console.log('🔄 Servidor selecionado:', {
      name: server.name,
      url: server.url,
      id: server.id
    });
  };

  const contextValue: ServerContextType = {
    servers,
    selectedServer,
    setSelectedServer,
    currentServerUrl: selectedServer.url,
    currentAdminToken: selectedServer.adminToken
  };

  return (
    <ServerContext.Provider value={contextValue}>
      {children}
    </ServerContext.Provider>
  );
}

export function useServer() {
  const context = useContext(ServerContext);
  if (context === undefined) {
    throw new Error('useServer must be used within a ServerProvider');
  }
  return context;
} 