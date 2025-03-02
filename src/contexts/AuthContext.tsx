import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService, dbService, User, handleApiError } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { useNotification } from './NotificationContext';
import { formatDateTime } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  signOut: () => Promise<void>;
}

interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  whatsapp?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { sendNotification } = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        // Definimos um usuário temporário para desenvolvimento
        const tempUser = {
          id: '1',
          email: 'dev@example.com',
          user_metadata: { full_name: 'Usuário de Desenvolvimento' },
          app_metadata: { role: 'admin' },
          created_at: new Date().toISOString()
        };
        
        // Configurar usuário
        setUser(tempUser);
        
        // Armazena a sessão no localStorage
        localStorage.setItem('userSession', JSON.stringify({ user: tempUser }));
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = authService.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      if (session?.user) {
        setUser(session.user);
        // Atualiza a sessão no localStorage
        localStorage.setItem('userSession', JSON.stringify(session));
      } else {
        setUser(null);
        localStorage.removeItem('userSession');
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const signIn = async (email: string, password: string) => {
    try {
      // First check if user exists
      const { data: profile, error: profileError } = await dbService.from('profiles')
        .eq('email', email)
        .maybeSingle();

      if (profileError) {
        console.error('Error checking profile:', profileError);
      } else if (profile && !profile.is_active) {
        throw new Error('Sua conta está desativada. Entre em contato com o suporte.');
      }

      // Attempt to sign in
      const { error: signInError, data } = await authService.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;
      if (!data.user) throw new Error('Usuário não encontrado');

      // Atualiza o estado do usuário
      setUser(data.user);

      // Redireciona para a homepage após login bem-sucedido
      navigate('/');

      // Get profile data for notification
      const { data: userProfile } = await dbService.from('profiles')
        .eq('id', data.user.id)
        .single();

      if (userProfile?.whatsapp) {
        try {
          const message = [
            `Olá, *${userProfile.full_name}*! 😊\n`,
            `Você acabou de acessar o sistema *CONECTEZAP* 🟢`,
            `⏰ Data e Hora: *${formatDateTime(new Date())}*\n`,
            `⚠️ Não foi você? Entre em contato com o suporte imediatamente! 📞❗\n`,
            `Estamos aqui para ajudar! 🤝`
          ].join('\n');
          
          await sendNotification({
            phoneNumber: userProfile.whatsapp,
            text: message
          });
        } catch (error) {
          console.error('Error sending notification:', error);
        }
      }
      
      toast.success('Login realizado com sucesso!');
    } catch (error) {
      console.error('Error during login:', error);
      const handledError = handleApiError(error);
      const message = handledError instanceof Error ? handledError.message : 'Erro ao fazer login';
      toast.error(message);
      throw handledError;
    }
  };

  const signUp = async ({ email, password, fullName, whatsapp }: SignUpData) => {
    try {
      const cleanWhatsApp = whatsapp?.replace(/\D/g, '') || null;
      
      const { data: { user: newUser }, error: signUpError } = await authService.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            whatsapp: cleanWhatsApp,
          },
        },
      });

      if (signUpError) throw signUpError;
      if (!newUser) throw new Error('Erro ao criar usuário');

      // Send welcome message if WhatsApp is provided
      if (cleanWhatsApp) {
        try {
          const welcomeMessage = [
            `🎉 *Parabéns, ${fullName}* 🎉\n`,
            `Você acabou de se cadastrar no *CONECTEZAP*! 🟢🚀`,
            `📅 *Data e Hora:* ${formatDateTime(new Date())}\n`,
            `Estamos muito felizes por tê-lo conosco! 🤗\n`,
            `Agora você tem acesso a todas as funcionalidades que vão transformar sua comunicação no WhatsApp! 💬✨\n`,
            `Qualquer dúvida, conte com nosso suporte! 📞🤝`
          ].join('\n');

          await sendNotification({
            phoneNumber: cleanWhatsApp,
            text: welcomeMessage
          });
        } catch (error) {
          console.error('Error sending welcome message:', error);
        }
      }

      toast.success('Conta criada com sucesso! Por favor, faça login.');
    } catch (error) {
      console.error('Error during signup:', error);
      const handledError = handleApiError(error);
      const message = handledError instanceof Error ? handledError.message : 'Erro ao criar conta';
      toast.error(message);
      throw handledError;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await authService.signOut();
      if (error) throw error;
      setUser(null);
      navigate('/login');
      toast.success('Logout realizado com sucesso!');
    } catch (error) {
      console.error('Error during logout:', error);
      const message = error instanceof Error ? error.message : 'Erro ao sair';
      toast.error(message);
      throw error;
    }
  };

  const contextValue = {
    user,
    loading,
    signIn,
    signUp,
    signOut
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}