// Este arquivo substitui a integração com Supabase por um serviço simulado
// para autenticação e operações com dados

interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

// Simulação de serviço de autenticação
export const authService = {
  // Estado do usuário atual (em memória)
  currentUser: null as User | null,
  session: null as Session | null,

  // Simula o login
  async signInWithPassword({ email, password }: { email: string; password: string }) {
    try {
      // Simulação básica - aceita qualquer e-mail com senha "senha123"
      if (password !== 'senha123') {
        throw { 
          message: 'E-mail ou senha incorretos', 
          status: 400, 
          __isAuthError: true 
        };
      }

      // Cria um usuário simulado
      const user: User = {
        id: '1',
        email,
        user_metadata: {
          full_name: 'Usuário Teste',
          whatsapp: '5511999999999'
        },
        app_metadata: {},
        created_at: new Date().toISOString()
      };

      this.currentUser = user;
      this.session = { user };

      return { data: { user, session: { user } }, error: null };
    } catch (err) {
      const error = err as ApiError;
      return { data: { user: null, session: null }, error };
    }
  },

  // Simula o cadastro
  async signUp({ email, password, options }: { 
    email: string; 
    password: string; 
    options?: { 
      data?: Record<string, any> 
    } 
  }) {
    try {
      // Cria um usuário simulado
      const user: User = {
        id: '1',
        email,
        user_metadata: {
          full_name: options?.data?.full_name || 'Novo Usuário',
          whatsapp: options?.data?.whatsapp || null
        },
        app_metadata: {},
        created_at: new Date().toISOString()
      };

      return { data: { user }, error: null };
    } catch (err) {
      const error = err as ApiError;
      return { data: { user: null }, error };
    }
  },

  // Simula recuperação de senha
  async resetPasswordForEmail(email: string) {
    // Simula envio de e-mail
    return { data: {}, error: null };
  },

  // Simula recuperação da sessão atual
  async getSession() {
    return { 
      data: { 
        session: this.session 
      }, 
      error: null 
    };
  },

  // Simula o logout
  async signOut() {
    this.currentUser = null;
    this.session = null;
    return { error: null };
  },

  // Simula atualização do usuário
  async updateUser(updates: { password?: string }) {
    return { data: { user: this.currentUser }, error: null };
  },

  // Simula ouvir mudanças de estado de autenticação
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    // Retorna uma simulação de subscription com método unsubscribe
    return {
      data: {
        subscription: {
          unsubscribe: () => {}
        }
      }
    };
  }
};

// Simulação de serviço de armazenamento
export const storageService = {
  // Simulação de armazenamento de arquivos
  storage: {
    from(bucket: string) {
      return {
        // Simula upload de arquivo
        async upload(path: string, file: File) {
          return { 
            data: { path }, 
            error: null 
          };
        },
        // Simula obtenção de URL pública
        getPublicUrl(path: string) {
          return { 
            data: { 
              publicUrl: `https://exemplo-storage.com/${path}` 
            } 
          };
        },
        // Simula deleção de arquivo
        async remove(paths: string[]) {
          return { data: { count: paths.length }, error: null };
        }
      };
    }
  }
};

// Simulação de serviço de banco de dados
export const dbService = {
  // Simula operações de banco de dados com tabelas em memória
  _tables: {
    profiles: [
      {
        id: '1',
        email: 'user@example.com',
        full_name: 'Usuário Teste',
        whatsapp: '5511999999999',
        is_active: true,
        last_login: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        company_name: 'Empresa Teste',
        birth_date: '1990-01-01',
        avatar_url: 'https://exemplo-storage.com/avatars/default.jpg'
      }
    ],
    plans: [
      {
        id: '1',
        name: 'Plano Básico',
        price: 99.90,
        description: 'Plano básico com funcionalidades essenciais',
        features: ['1 instância', 'Atendimento 8x5', 'Suporte básico'],
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Plano Profissional',
        price: 199.90,
        description: 'Plano completo para empresas',
        features: ['3 instâncias', 'Atendimento 24x7', 'Suporte prioritário'],
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ],
    clients: [
      {
        id: '1',
        name: 'Cliente Teste',
        email: 'cliente@example.com',
        phone: '5511999999999',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]
  },

  // Métodos para simular consultas
  from<T extends keyof typeof this._tables>(tableName: T) {
    const table = this._tables[tableName] || [];
    
    let filteredData = [...table];
    let conditions: Array<{field: string; value: any; op: string}> = [];
    
    return {
      select(fields: string) {
        return this;
      },
      insert(data: Record<string, any>) {
        const newRecord = {
          id: String(Math.random()).slice(2, 10),
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        return {
          data: newRecord,
          error: null
        };
      },
      update(data: Record<string, any>) {
        return {
          data,
          error: null
        };
      },
      delete() {
        return {
          data: null,
          error: null
        };
      },
      eq(field: string, value: any) {
        conditions.push({field, value, op: 'eq'});
        return this;
      },
      limit(count: number) {
        return this;
      },
      single() {
        let result = null;
        
        // Aplica condições
        for (const condition of conditions) {
          filteredData = filteredData.filter(item => 
            (item as Record<string, any>)[condition.field] === condition.value
          );
        }
        
        if (filteredData.length > 0) {
          result = filteredData[0];
        }
        
        return {
          data: result as typeof table[0],
          error: null
        };
      },
      maybeSingle() {
        return this.single();
      }
    };
  }
};

// Tipos
export interface User {
  id: string;
  email: string;
  user_metadata: Record<string, any>;
  app_metadata: Record<string, any>;
  created_at: string;
}

export interface Session {
  user: User;
}

// Manipulação de erros
export const handleApiError = (error: unknown): Error => {
  if (!navigator.onLine) {
    return new Error('Sem conexão com a internet');
  }

  if (typeof error === 'object' && error !== null) {
    const apiError = error as { 
      message?: string; 
      __isAuthError?: boolean;
      status?: number;
      code?: string;
    };

    // Erros de autenticação
    if (apiError.__isAuthError) {
      switch (apiError.status) {
        case 400:
          if (apiError.message?.includes('Invalid login credentials')) {
            return new Error('E-mail ou senha incorretos');
          }
          return new Error('Dados de login inválidos');
        case 401:
          return new Error('Não autorizado. Por favor, faça login novamente');
        default:
          return new Error('Erro de autenticação');
      }
    }

    // Erros gerais
    if (apiError.message) {
      return new Error(apiError.message);
    }
  }

  return new Error('Erro desconhecido');
};

// Função para verificar conexão
export const checkApiConnection = async (): Promise<boolean> => {
  return navigator.onLine;
};