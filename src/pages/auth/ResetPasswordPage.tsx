import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

interface ResetPasswordForm {
  code: string;
  password: string;
  confirmPassword: string;
}

export function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { resetPassword } = useAuth();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<ResetPasswordForm>();

  const password = watch('password');
  const email = location.state?.email;

  useEffect(() => {
    // Verifica se temos o email do estado anterior
    if (!email) {
      toast.error('Acesso inválido. Solicite um novo código de recuperação.');
      navigate('/recover-password');
    }
  }, [email, navigate]);

  const onSubmit = async (data: ResetPasswordForm) => {
    try {
      setIsLoading(true);

      if (data.password !== data.confirmPassword) {
        throw new Error('As senhas não coincidem');
      }

      if (!email) {
        throw new Error('Email não encontrado');
      }

      await resetPassword(email, data.code, data.password);
      navigate('/login');
    } catch (error) {
      console.error('Error resetting password:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Redefinir senha</h1>
          <p className="mt-2 text-sm text-gray-600">
            Digite o código enviado para {email} e sua nova senha.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Input
            type="text"
            placeholder="Código de verificação"
            error={errors.code?.message}
            {...register('code', {
              required: 'Código é obrigatório',
              pattern: {
                value: /^[0-9]{6}$/,
                message: 'Código deve ter 6 dígitos',
              },
            })}
          />
        </div>
        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="Nova senha"
            error={errors.password?.message}
            {...register('password', {
              required: 'Nova senha é obrigatória',
              minLength: {
                value: 6,
                message: 'A senha deve ter no mínimo 6 caracteres',
              },
            })}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </div>

        <div className="relative">
          <Input
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Confirme a nova senha"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword', {
              required: 'Confirmação de senha é obrigatória',
              validate: value => value === password || 'As senhas não coincidem'
            })}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showConfirmPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </div>

        <Button
          type="submit"
          className="w-full"
          isLoading={isLoading}
        >
          Redefinir senha
        </Button>
      </form>
    </div>
  );
}