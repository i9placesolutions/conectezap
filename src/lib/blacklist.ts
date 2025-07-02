// Sistema de blacklist automática para números problemáticos

interface BlacklistEntry {
  number: string;
  reason: 'error' | 'block' | 'invalid' | 'spam_report';
  timestamp: number;
  instanceId: string;
  retryCount: number;
}

class BlacklistManager {
  private storageKey = 'antispam_blacklist';
  
  // Adicionar número à blacklist
  addToBlacklist(number: string, reason: BlacklistEntry['reason'], instanceId: string): void {
    const blacklist = this.getBlacklist();
    const key = `${instanceId}_${number}`;
    
    const existing = blacklist.find(entry => entry.number === number && entry.instanceId === instanceId);
    
    if (existing) {
      existing.retryCount += 1;
      existing.timestamp = Date.now();
      existing.reason = reason; // Atualiza o motivo
    } else {
      blacklist.push({
        number,
        reason,
        timestamp: Date.now(),
        instanceId,
        retryCount: 1
      });
    }
    
    this.saveBlacklist(blacklist);
  }
  
  // Verificar se número está na blacklist
  isBlacklisted(number: string, instanceId: string): boolean {
    const blacklist = this.getBlacklist();
    const entry = blacklist.find(entry => entry.number === number && entry.instanceId === instanceId);
    
    if (!entry) return false;
    
    // Números com muitos erros ficam blacklisted por mais tempo
    const maxAge = entry.retryCount > 3 ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 7 dias vs 1 dia
    const age = Date.now() - entry.timestamp;
    
    if (age > maxAge) {
      this.removeFromBlacklist(number, instanceId);
      return false;
    }
    
    return true;
  }
  
  // Remover número da blacklist
  removeFromBlacklist(number: string, instanceId: string): void {
    const blacklist = this.getBlacklist();
    const filtered = blacklist.filter(entry => !(entry.number === number && entry.instanceId === instanceId));
    this.saveBlacklist(filtered);
  }
  
  // Obter blacklist completa
  getBlacklist(): BlacklistEntry[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
  
  // Obter blacklist por instância
  getBlacklistForInstance(instanceId: string): BlacklistEntry[] {
    return this.getBlacklist().filter(entry => entry.instanceId === instanceId);
  }
  
  // Filtrar números válidos (remove blacklisted)
  filterValidNumbers(numbers: string[], instanceId: string): { valid: string[], blacklisted: string[] } {
    const valid: string[] = [];
    const blacklisted: string[] = [];
    
    numbers.forEach(number => {
      if (this.isBlacklisted(number, instanceId)) {
        blacklisted.push(number);
      } else {
        valid.push(number);
      }
    });
    
    return { valid, blacklisted };
  }
  
  // Limpar blacklist antiga
  cleanOldEntries(): void {
    const blacklist = this.getBlacklist();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 dias
    const now = Date.now();
    
    const cleaned = blacklist.filter(entry => (now - entry.timestamp) < maxAge);
    this.saveBlacklist(cleaned);
  }
  
  // Obter estatísticas
  getStats(instanceId?: string): {
    total: number;
    byReason: Record<string, number>;
    recentlyAdded: number; // últimas 24h
  } {
    const blacklist = instanceId 
      ? this.getBlacklistForInstance(instanceId)
      : this.getBlacklist();
    
    const byReason: Record<string, number> = {};
    let recentlyAdded = 0;
    const last24h = Date.now() - (24 * 60 * 60 * 1000);
    
    blacklist.forEach(entry => {
      byReason[entry.reason] = (byReason[entry.reason] || 0) + 1;
      if (entry.timestamp > last24h) {
        recentlyAdded++;
      }
    });
    
    return {
      total: blacklist.length,
      byReason,
      recentlyAdded
    };
  }
  
  // Exportar blacklist para backup
  exportBlacklist(): string {
    return JSON.stringify(this.getBlacklist(), null, 2);
  }
  
  // Importar blacklist de backup
  importBlacklist(data: string): boolean {
    try {
      const imported = JSON.parse(data) as BlacklistEntry[];
      
      // Validar estrutura
      if (!Array.isArray(imported)) return false;
      
      const isValid = imported.every(entry => 
        typeof entry.number === 'string' &&
        typeof entry.reason === 'string' &&
        typeof entry.timestamp === 'number' &&
        typeof entry.instanceId === 'string' &&
        typeof entry.retryCount === 'number'
      );
      
      if (!isValid) return false;
      
      this.saveBlacklist(imported);
      return true;
    } catch {
      return false;
    }
  }
  
  private saveBlacklist(blacklist: BlacklistEntry[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(blacklist));
    } catch (error) {
      console.error('Erro ao salvar blacklist:', error);
    }
  }
}

// Instância singleton
export const blacklistManager = new BlacklistManager();

// Funções utilitárias
export const addToBlacklist = (number: string, reason: BlacklistEntry['reason'], instanceId: string) => {
  blacklistManager.addToBlacklist(number, reason, instanceId);
};

export const isBlacklisted = (number: string, instanceId: string): boolean => {
  return blacklistManager.isBlacklisted(number, instanceId);
};

export const filterValidNumbers = (numbers: string[], instanceId: string) => {
  return blacklistManager.filterValidNumbers(numbers, instanceId);
};

export const getBlacklistStats = (instanceId?: string) => {
  return blacklistManager.getStats(instanceId);
};

// Auto-limpeza ao carregar o módulo
blacklistManager.cleanOldEntries(); 