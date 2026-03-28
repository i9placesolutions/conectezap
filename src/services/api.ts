import axios from 'axios';

// Função para obter configurações dinâmicas do servidor
let currentServerConfig = {
  url: 'https://i9place1.uazapi.com',
  adminToken: 'u1OUnI3tgoQwGII9Fw46XhFWeInWAAVNSO12x3sHwWuI5AkaH2'
};

export const getCurrentServerConfig = () => currentServerConfig;

export const updateServerConfig = (url: string, adminToken: string) => {
  currentServerConfig = { url, adminToken };
  console.log('🔧 Configuração do servidor atualizada:', {
    url,
    adminToken: adminToken.substring(0, 10) + '...'
  });
};

// Cria uma instância do Axios com a URL base e cabeçalhos padrão dinâmicos
const createApiClient = () => {
  const config = getCurrentServerConfig();
  return axios.create({
    baseURL: config.url,
    headers: {
      'Content-Type': 'application/json',
    }
  });
};

// Instância inicial da API
let api = createApiClient();

// Adiciona o token de autenticação a todas as requisições
const setupInterceptors = (apiInstance: ReturnType<typeof axios.create>) => {
  apiInstance.interceptors.request.use((config: import('axios').InternalAxiosRequestConfig) => {
    const serverConfig = getCurrentServerConfig();
    
    // Se for uma requisição de instância (que usa token específico), usa o token da instância
    // caso contrário, usa o adminToken do servidor selecionado
    if (config.url?.includes('/instance/')) {
      const instanceToken = localStorage.getItem('instanceToken');
      if (instanceToken) {
        config.headers.token = instanceToken;
      }
    } else {
      config.headers.token = serverConfig.adminToken;
    }
    
    return config;
  });
  
  return apiInstance;
};

// Configurar interceptors na instância inicial
setupInterceptors(api);

// Função para recriar a API quando o servidor mudar
export const recreateApi = () => {
  api = setupInterceptors(createApiClient());
  console.log('🔄 API recreada para o servidor:', getCurrentServerConfig().url);
};

export default api;
