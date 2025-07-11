import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, handleApiError, logUserAccess, logUserLogout } from '../lib/supabase';
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
  sendPasswordResetCode: (email: string) => Promise<void>;
  verifyPasswordResetCode: (email: string, code: string) => Promise<boolean>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
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
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted && session?.user) {
          setUser(session.user);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;

      if (session?.user) {
        setUser(session.user);
      } else {
        setUser(null);
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
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (profileError) {
        console.error('Error checking profile:', profileError);
      } else if (profile && !profile.is_active) {
        throw new Error('Sua conta está desativada. Entre em contato com o suporte.');
      }

      // Attempt to sign in
      const { error: signInError, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;
      if (!data.user) throw new Error('Usuário não encontrado');

      // Atualiza o estado do usuário
      setUser(data.user);

      // Registra o acesso do usuário
      try {
        await logUserAccess(
          data.user.id,
          undefined, // IP será capturado pelo servidor
          navigator.userAgent,
          'email'
        );
      } catch (error) {
        console.error('Erro ao registrar acesso:', error);
      }

      // Redireciona para a homepage após login bem-sucedido
      navigate('/');

      // Get profile data for notification
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
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
      const message = handleApiError(error);
      toast.error(message);
      throw error;
    }
  };

  const signUp = async ({ email, password, fullName, whatsapp }: SignUpData) => {
    try {
      const cleanWhatsApp = whatsapp?.replace(/\D/g, '') || null;
      
      const { data: { user: newUser }, error: signUpError } = await supabase.auth.signUp({
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

      toast.success('Conta criada com sucesso! Verifique seu email para confirmar a conta e depois faça login.', {
        duration: 8000
      });
    } catch (error) {
      console.error('Error during signup:', error);
      const message = handleApiError(error);
      toast.error(message);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // Registra o logout antes de sair
      if (user) {
        try {
          await logUserLogout(user.id);
        } catch (error) {
          console.error('Erro ao registrar logout:', error);
        }
      }

      const { error } = await supabase.auth.signOut();
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

  const sendPasswordResetCode = async (email: string) => {
    try {
      const { error } = await supabase.rpc('generate_password_reset_code', {
        user_email: email
      });

      if (error) throw error;
      
      toast.success('Código de recuperação enviado para seu email!');
    } catch (error) {
      console.error('Error sending password reset code:', error);
      const message = handleApiError(error);
      toast.error(message);
      throw error;
    }
  };

  const verifyPasswordResetCode = async (email: string, code: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.rpc('verify_password_reset_code', {
        user_email: email,
        reset_code: code
      });

      if (error) throw error;
      
      return data === true;
    } catch (error) {
      console.error('Error verifying password reset code:', error);
      return false;
    }
  };

  const resetPassword = async (email: string, code: string, newPassword: string) => {
    try {
      // Call the Edge Function to reset password
      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: {
          email,
          code,
          newPassword
        }
      });

      if (error) {
        throw new Error(error.message || 'Erro ao redefinir senha');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success('Senha redefinida com sucesso!');
    } catch (error) {
      console.error('Error resetting password:', error);
      const message = handleApiError(error);
      toast.error(message);
      throw error;
    }
  };

  const contextValue = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    sendPasswordResetCode,
    verifyPasswordResetCode,
    resetPassword
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