import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface RecoverPasswordForm {
  email: string;
  password?: string;
  confirmPassword?: string;
}

export function RecoverPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<RecoverPasswordForm>();
  const { sendPasswordResetCode } = useAuth();

  const onSubmit = async (data: RecoverPasswordForm) => {
    try {
      setIsLoading(true);

      await sendPasswordResetCode(data.email);

      // Redireciona para a página de inserir código
      navigate('/reset-password', { state: { email: data.email } });
    } catch (error) {
      console.error('Error in password recovery:', error);
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