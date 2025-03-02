import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../../components/ui/Input';
import { WhatsAppInput } from '../../components/ui/WhatsAppInput';
import { Button } from '../../components/ui/Button';
import { Eye, EyeOff } from 'lucide-react';

interface RegisterForm {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  whatsapp: string;
}

export function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors }, control } = useForm<RegisterForm>({
    defaultValues: {
      whatsapp: '55'
    }
  });

  const password = watch('password');

  const onSubmit = async (data: RegisterForm) => {
    try {
      if (data.password !== data.confirmPassword) {
        toast.error('As senhas não coincidem');
        return;
      }

      const cleanWhatsApp = data.whatsapp.replace(/\D/g, '');
      
      if (cleanWhatsApp.length !== 13) {
        toast.error('O número deve ter 13 dígitos (55 + DDD + número)');
        return;
      }
      
      if (!/^55[1-9][1-9]\d{9}$/.test(cleanWhatsApp)) {
        toast.error('Número de WhatsApp inválido');
        return;
      }

      setIsLoading(true);
      await signUp({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        whatsapp: cleanWhatsApp,
      });
      navigate('/profile');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao criar conta');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Criar nova conta</h1>
        <p className="mt-2 text-sm text-gray-600">
          Já tem uma conta?{' '}
          <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
            Faça login
          </Link>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Input
            placeholder="Nome completo"
            error={errors.fullName?.message}
            {...register('fullName', {
              required: 'Nome é obrigatório',
            })}
          />
        </div>

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
        </div>

        <div>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Sua senha"
              error={errors.password?.message}
              {...register('password', {
                required: 'Senha é obrigatória',
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
        </div>

        <div>
          <div className="relative">
            <Input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirme sua senha"
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
        </div>

        <div>
          <Controller
            name="whatsapp"
            control={control}
            rules={{
              required: 'WhatsApp é obrigatório',
              validate: {
                validFormat: (value) => {
                  const clean = value.replace(/\D/g, '');
                  if (clean.length !== 13) {
                    return 'O número deve ter 13 dígitos (55 + DDD + número)';
                  }
                  if (!/^55[1-9][1-9]\d{9}$/.test(clean)) {
                    return 'Número de WhatsApp inválido';
                  }
                  return true;
                },
              },
            }}
            render={({ field }) => (
              <WhatsAppInput
                {...field}
                error={errors.whatsapp?.message}
              />
            )}
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          isLoading={isLoading}
        >
          Criar conta
        </Button>
      </form>
    </div>
  );
}