import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { authService } from '../../lib/supabase';

interface RecoverPasswordForm {
  email: string;
  password?: string;
  confirmPassword?: string;
}

export function RecoverPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors }, reset } = useForm<RecoverPasswordForm>();

  const password = watch('password');

  const onSubmit = async (data: RecoverPasswordForm) => {
    try {
      setIsLoading(true);

      const { error } = await authService.resetPasswordForEmail(data.email);

      if (error) throw error;

      toast.success('Link de recuperação enviado para seu e-mail');
      navigate('/login');
    } catch (error) {
      console.error('Error in password recovery:', error);
      const message = error instanceof Error ? error.message : 'Erro ao enviar e-mail de recuperação';
      toast.error(message);
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
        <h1 className="text-2xl font-bold text-gray-900">Recuperar senha</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Input
            type="email"
            placeholder="Seu e-mail"
            error={errors.email?.message}
            {...register('email', {
              required: 'E-mail é obrigatório',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'E-mail inválido',
              },
            })}
          />
          <p className="mt-2 text-sm text-gray-500">
            Enviaremos um link de recuperação para seu e-mail.
          </p>
        </div>

        <Button
          type="submit"
          className="w-full"
          isLoading={isLoading}
        >
          Enviar link de recuperação
        </Button>
      </form>
    </div>
  );
}