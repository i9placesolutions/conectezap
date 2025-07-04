import { toast } from 'react-hot-toast';

const API_URL = 'https://api.i9place.com.br';
const API_KEY = '0d27a0851b7fb780de4de28a714d9b680bcc2d5d27c588bd39c0d6ab19478dcc';

export interface Instance {
  id: string;
  name: string;
  displayName?: string;
  status: 'connected' | 'disconnected' | 'connecting';
  apiKey: string;
}

class InstanceAPI {
  private headers = {
    'Content-Type': 'application/json',
    'apikey': API_KEY,
    'Cache-Control': 'no-cache',
    'Accept': '*/*',
    'Connection': 'keep-alive'
  };

  private instanceNames: Record<string, string> = {
    'i9place': 'i9Place - Marketing e App Solutions',
    'n8n': 'n8n - Automação de Processos',
    'suporte': 'Suporte ao Cliente',
    'vendas': 'Equipe de Vendas',
    'marketing': 'Marketing Digital',
    'atendimento': 'Atendimento ao Cliente'
  };

  async getInstances(): Promise<Instance[]> {
    try {
      // Get states for both instances
      const [i9placeState, n8nState] = await Promise.all([
        this.getConnectionState('i9place'),
        this.getConnectionState('n8n')
      ]);
      
      // Return array with both instances
      return [
        {
          id: 'i9place',
          name: 'i9place',
          displayName: this.instanceNames['i9place'],
          status: this.mapConnectionState(i9placeState),
          apiKey: API_KEY
        },
        {
          id: 'n8n',
          name: 'n8n',
          displayName: this.instanceNames['n8n'],
          status: this.mapConnectionState(n8nState),
          apiKey: API_KEY
        }
      ];
    } catch (error) {
      console.error('Error fetching instances:', error);
      // Always return both instances even on error
      return [
        {
          id: 'i9place',
          name: 'i9place',
          displayName: this.instanceNames['i9place'],
          status: 'connected', // i9place always connected
          apiKey: API_KEY
        },
        {
          id: 'n8n',
          name: 'n8n',
          displayName: this.instanceNames['n8n'],
          status: 'disconnected', // Default to disconnected for n8n
          apiKey: API_KEY
        }
      ];
    }
  }

  async getConnectionState(instanceId: string): Promise<string> {
    try {
      // i9place is always connected
      if (instanceId === 'i9place') {
        return 'connected';
      }

      // Primeiro tenta o endpoint /instance/status (padrão UAZAPI)
      try {
        const statusResponse = await fetch(`${API_URL}/instance/status`, {
          method: 'GET',
          headers: {
            ...this.headers,
            'token': API_KEY // UAZAPI usa 'token' no header
          }
        });

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          console.log(`Status da instância ${instanceId}:`, statusData);
          return statusData.status || statusData.state || 'disconnected';
        }
      } catch (statusError) {
        console.warn('Erro no endpoint /instance/status, tentando connectionState:', statusError);
      }

      // Fallback para o endpoint antigo
      const response = await fetch(`${API_URL}/instance/connectionState/${instanceId}`, {
        method: 'GET',
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error('Erro ao verificar estado da conexão');
      }

      const data = await response.json();
      return data.state || 'disconnected';
    } catch (error) {
      console.error('Error getting connection state:', error);
      return instanceId === 'i9place' ? 'connected' : 'disconnected';
    }
  }

  async connectInstance(instanceId: string): Promise<{ qrCode?: string }> {
    try {
      if (instanceId === 'i9place') {
        throw new Error('A instância i9place já está conectada');
      }

      // First check if already connected
      const state = await this.getConnectionState(instanceId);
      if (state === 'connected' || state === 'open') {
        throw new Error('Instância já está conectada');
      }

      // Usar o endpoint padrão da UAZAPI para conectar
      const connectResponse = await fetch(`${API_URL}/instance/connect`, {
        method: 'POST',
        headers: {
          ...this.headers,
          'token': API_KEY
        },
        body: JSON.stringify({})
      });

      if (!connectResponse.ok) {
        // Fallback para o método antigo se o novo não funcionar
        console.warn('Endpoint /instance/connect falhou, tentando método antigo');
        
        const initResponse = await fetch(`${API_URL}/instance/init/${instanceId}`, {
          method: 'GET',
          headers: this.headers
        });

        if (!initResponse.ok) {
          throw new Error('Erro ao inicializar instância. Tente novamente em alguns instantes.');
        }

        // Wait a moment for the instance to initialize
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Get QR code usando o endpoint padrão da UAZAPI
      const qrResponse = await fetch(`${API_URL}/instance/qrcode`, {
        method: 'GET',
        headers: {
          ...this.headers,
          'token': API_KEY
        }
      });

      if (!qrResponse.ok) {
        // Fallback para o método antigo
        const qrResponseOld = await fetch(`${API_URL}/instance/qrcode/${instanceId}`, {
          method: 'GET',
          headers: this.headers
        });

        if (!qrResponseOld.ok) {
          throw new Error('Erro ao gerar QR code. Tente novamente.');
        }

        const qrDataOld = await qrResponseOld.json();
        const qrCodeOld = qrDataOld.qrcode?.base64 || qrDataOld.base64 || qrDataOld.qr;

        if (!qrCodeOld) {
          throw new Error('QR code não disponível. Tente novamente em alguns instantes.');
        }

        return { 
          qrCode: `data:image/png;base64,${qrCodeOld}`
        };
      }

      const qrData = await qrResponse.json();
      const qrCode = qrData.qrcode?.base64 || qrData.base64 || qrData.qr || qrData.code;

      if (!qrCode) {
        throw new Error('QR code não disponível. Tente novamente em alguns instantes.');
      }

      return { 
        qrCode: qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`
      };
    } catch (error) {
      console.error('Error connecting instance:', error);
      throw error;
    }
  }

  async disconnectInstance(instanceId: string): Promise<void> {
    if (instanceId === 'i9place') {
      throw new Error('Não é possível desconectar a instância principal');
    }

    try {
      // Usar o endpoint padrão da UAZAPI para desconectar
      const disconnectResponse = await fetch(`${API_URL}/instance/disconnect`, {
        method: 'POST',
        headers: {
          ...this.headers,
          'token': API_KEY
        }
      });

      if (disconnectResponse.ok) {
        toast.success('Instância desconectada com sucesso!');
        return;
      }

      // Fallback para o método antigo se o novo não funcionar
      console.warn('Endpoint /instance/disconnect falhou, tentando método antigo');
      
      // Try logout first
      const logoutResponse = await fetch(`${API_URL}/instance/logout/${instanceId}`, {
        method: 'DELETE',
        headers: this.headers
      });

      if (!logoutResponse.ok) {
        console.warn('Logout falhou, tentando fechar diretamente');
      } else {
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Then close
      const closeResponse = await fetch(`${API_URL}/instance/close/${instanceId}`, {
        method: 'POST',
        headers: this.headers
      });

      if (!closeResponse.ok) {
        throw new Error('Erro ao fechar instância. Tente novamente.');
      }

      toast.success('Instância desconectada com sucesso!');
    } catch (error) {
      console.error('Error disconnecting instance:', error);
      throw new Error('Erro ao desconectar instância. Tente novamente.');
    }
  }

  async deleteInstance(instanceId: string): Promise<void> {
    if (instanceId === 'i9place' || instanceId === 'n8n') {
      throw new Error('Não é possível excluir esta instância');
    }

    try {
      // First try to disconnect
      await this.disconnectInstance(instanceId).catch(() => {
        // Ignore disconnect errors, proceed with delete
        console.log('Disconnect failed, proceeding with delete');
      });

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Then delete
      const response = await fetch(`${API_URL}/instance/delete/${instanceId}`, {
        method: 'DELETE',
        headers: this.headers
      });

      if (!response.ok) {
        throw new Error('Erro ao excluir instância. Tente novamente.');
      }

      toast.success('Instância excluída com sucesso!');
    } catch (error) {
      console.error('Error deleting instance:', error);
      throw new Error('Erro ao excluir instância. Tente novamente.');
    }
  }

  private mapConnectionState(state: string): Instance['status'] {
    if (!state) return 'disconnected';
    state = state.toLowerCase();
    
    // Map various connected states - instância totalmente conectada
    if (['connected', 'open', 'online', 'active'].includes(state)) {
      return 'connected';
    }
    
    // Map various connecting states - instância em processo de conexão
    if (['connecting', 'loading', 'qrcode', 'qr', 'starting', 'initializing', 'pairing', 'authenticating'].includes(state)) {
      return 'connecting';
    }
    
    // Map disconnected states - instância desconectada ou com erro
    if (['disconnected', 'closed', 'offline', 'inactive', 'error', 'failed', 'timeout'].includes(state)) {
      return 'disconnected';
    }
    
    // Estados específicos da UAZAPI
    if (state === 'close') return 'disconnected';
    if (state === 'opening') return 'connecting';
    
    // Everything else is considered disconnected by default
    return 'disconnected';
  }
}

export const instanceAPI = new InstanceAPI();