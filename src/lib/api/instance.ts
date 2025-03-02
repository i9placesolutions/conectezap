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
      if (state === 'connected') {
        throw new Error('Instância já está conectada');
      }

      // Try to initialize
      const initResponse = await fetch(`${API_URL}/instance/init/${instanceId}`, {
        method: 'GET',
        headers: this.headers
      });

      if (!initResponse.ok) {
        throw new Error('Erro ao inicializar instância. Tente novamente em alguns instantes.');
      }

      // Wait a moment for the instance to initialize
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get QR code
      const qrResponse = await fetch(`${API_URL}/instance/qrcode/${instanceId}`, {
        method: 'GET',
        headers: this.headers
      });

      if (!qrResponse.ok) {
        throw new Error('Erro ao gerar QR code. Tente novamente.');
      }

      const qrData = await qrResponse.json();
      const qrCode = qrData.qrcode?.base64 || qrData.base64 || qrData.qr;

      if (!qrCode) {
        throw new Error('QR code não disponível. Tente novamente em alguns instantes.');
      }

      return { 
        qrCode: `data:image/png;base64,${qrCode}`
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
      // Try logout first
      const logoutResponse = await fetch(`${API_URL}/instance/logout/${instanceId}`, {
        method: 'DELETE',
        headers: this.headers
      });

      if (!logoutResponse.ok) {
        throw new Error('Erro ao fazer logout. Tente novamente.');
      }

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 1000));

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
    
    // Map various connected states
    if (['connected', 'open', 'online', 'active'].includes(state)) {
      return 'connected';
    }
    
    // Map various connecting states
    if (['connecting', 'loading', 'qrcode', 'starting', 'initializing'].includes(state)) {
      return 'connecting';
    }
    
    // Everything else is considered disconnected
    return 'disconnected';
  }
}

export const instanceAPI = new InstanceAPI();