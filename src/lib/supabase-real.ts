import { createClient, AuthChangeEvent, Session } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variáveis de ambiente do Supabase não configuradas')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tipos
export interface User {
  id: string;
  email: string;
  user_metadata: Record<string, any>;
  app_metadata: Record<string, any>;
  created_at: string;
}

// Removido interface Session customizada - usando a do Supabase

// Serviço de autenticação real
export const authService = {
  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  },

  async signUp({ email, password, options }: { 
    email: string; 
    password: string; 
    options?: { 
      data?: Record<string, any> 
    } 
  }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options
    })
    return { data, error }
  },

  async resetPasswordForEmail(email: string) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email)
    return { data, error }
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession()
    return { data, error }
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  async updateUser(updates: { password?: string }) {
    const { data, error } = await supabase.auth.updateUser(updates)
    return { data, error }
  },

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback)
  }
}

// Serviço de armazenamento real
export const storageService = {
  storage: supabase.storage
}

// Serviço de banco de dados real
export const dbService = supabase

// Manipulação de erros
export const handleApiError = (error: unknown): Error => {
  if (!navigator.onLine) {
    return new Error('Sem conexão com a internet')
  }

  if (typeof error === 'object' && error !== null) {
    const apiError = error as { 
      message?: string; 
      status?: number;
      code?: string;
    }

    if (apiError.message) {
      return new Error(apiError.message)
    }
  }

  return new Error('Erro desconhecido')
}

// Função para verificar conexão
export const checkApiConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1)
    return !error
  } catch {
    return false
  }
}