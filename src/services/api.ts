import axios from 'axios';

// Cria uma instância do Axios com a URL base e cabeçalhos padrão
const api = axios.create({
  baseURL: 'https://i9place1.uazapi.com',
  headers: {
    'Content-Type': 'application/json',
  }
});

// Adiciona o token de autenticação a todas as requisições
api.interceptors.request.use(config => {
  // Tokens para diferentes tipos de requisições
  // O adminToken é obtido do arquivo UAZAPI.JSON
  const adminToken = 'u1OUnI3tgoQwGII9Fw46XhFWeInWAAVNSO12x3sHwWuI5AkaH2';
  
  // Se for uma requisição de instância (que usa token específico), usa o token da instância
  // caso contrário, usa o adminToken
  if (config.url?.includes('/instance/')) {
    const instanceToken = localStorage.getItem('instanceToken');
    if (instanceToken) {
      config.headers.token = instanceToken;
    }
  } else {
    config.headers.token = adminToken;
  }
  
  return config;
});

export default api;
