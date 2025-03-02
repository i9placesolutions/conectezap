import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Eye, EyeOff } from 'lucide-react';
import { authService } from '../../lib/supabase';

interface ResetPasswordForm {
  password: string;
  confirmPassword: string;
}

export function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<ResetPasswordForm>();

  const password = watch('password');

  useEffect(() => {
    // Check if we have a valid recovery token (simulado)
    const checkRecoveryToken = async () => {
      const { data: { session }, error } = await authService.getSession();
      
      if (error || !session?.user) {
        toast.error('Link de recuperação inválido ou expirado');
        navigate('/recover-password');
      }
    };

    checkRecoveryToken();
  }, [navigate]);

  const onSubmit = async (data: ResetPasswordForm) => {
    try {
      setIsLoading(true);

      if (data.password !== data.confirmPassword) {
        throw new Error('As senhas não coincidem');
      }

      // Simulado - já que não estamos realmente mudando senha em uma API real
      // Em um ambiente real, usaríamos algo como authService.updateUser({ password })
      const { error } = { error: null }; // Simula sucesso

      if (error) throw error;

      toast.success('Senha alterada com sucesso!');
      navigate('/login');
    } catch (error) {
      console.error('Error resetting password:', error);
      const message = error instanceof Error ? error.message : 'Erro ao redefinir senha';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Redefinir senha</h1>
        <p className="mt-2 text-sm text-gray-600">
          Digite sua nova senha abaixo.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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