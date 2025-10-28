import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [searchParams] = useSearchParams();
  const { signIn } = useAuth();

  // Verificar se chegou aqui por sessão expirada
  useEffect(() => {
    if (searchParams.get('expired') === 'true') {
      toast.error('⚠️ Sua sessão expirou. Faça login novamente.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('⚠️ Preencha todos os campos');
      return;
    }

    // Validação básica de email
    if (!email.includes('@') || !email.includes('.')) {
      toast.error('⚠️ Digite um email válido');
      return;
    }

    try {
      setIsLoading(true);
      await signIn(email, password);
      // Navegação é feita dentro do signIn após sucesso
    } catch (error) {
      // Erro já foi tratado e mostrado no AuthContext
      // Apenas log para debug
      console.error('Erro no login:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', textAlign: 'center' }}>
        Entrar na sua conta
      </h2>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            E-mail:
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: '0.25rem'
            }}
            required
          />
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            Senha:
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '0.5rem',
                paddingRight: '2.5rem',
                border: '1px solid #ccc',
                borderRadius: '0.25rem'
              }}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#6b7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {showPassword ? (
                <EyeOff style={{ width: '1.25rem', height: '1.25rem' }} />
              ) : (
                <Eye style={{ width: '1.25rem', height: '1.25rem' }} />
              )}
            </button>
          </div>
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.5rem',
              backgroundColor: '#7e22ce',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1
            }}
          >
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <p>
            Não tem uma conta?{' '}
            <Link to="/register" style={{ color: '#7e22ce' }}>
              Registre-se
            </Link>
          </p>
          <p style={{ marginTop: '0.5rem' }}>
            <Link to="/recover-password" style={{ color: '#7e22ce' }}>
              Esqueceu sua senha?
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}