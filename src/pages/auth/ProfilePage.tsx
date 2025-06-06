import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../../components/ui/Input';
import { WhatsAppInput } from '../../components/ui/WhatsAppInput';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import { Calendar, Camera } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ProfileForm {
  companyName: string;
  birthDate: string;
  whatsapp: string;
}

export function ProfilePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const { register, handleSubmit, formState: { errors }, control, setValue } = useForm<ProfileForm>({
    defaultValues: {
      whatsapp: '55'
    }
  });

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (data) {
          setProfileData(data);
          setValue('companyName', data.company_name || '');
          setValue('birthDate', data.birth_date ? new Date(data.birth_date).toISOString().split('T')[0] : '');
          setValue('whatsapp', data.whatsapp || '55');
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        toast.error('Erro ao carregar perfil');
      }
    };

    loadProfile();
  }, [user, setValue]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || !event.target.files[0]) return;

      const file = event.target.files[0];
      setIsUploading(true);

      // Simulado - não estamos realmente fazendo upload
      setTimeout(() => {
        // Atualizando o perfil simulado com uma URL simulada
        setProfileData((prev: any) => ({
          ...prev,
          avatar_url: URL.createObjectURL(file)
        }));
        
        toast.success('Foto atualizada com sucesso! (simulado)');
        setIsUploading(false);
      }, 1000);
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Erro ao atualizar foto');
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: ProfileForm) => {
    try {
      setIsLoading(true);
      
      const cleanWhatsApp = data.whatsapp.replace(/\D/g, '');
      
      if (cleanWhatsApp.length !== 13) {
        throw new Error('O número deve ter 13 dígitos (55 + DDD + número)');
      }
      
      if (!/^55[1-9][1-9]\d{9}$/.test(cleanWhatsApp)) {
        throw new Error('Número de WhatsApp inválido');
      }
      
      const { error } = await supabase
        .from('profiles')
        .update({
          company_name: data.companyName,
          birth_date: data.birthDate,
          whatsapp: cleanWhatsApp,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (error) throw error;

      toast.success('Perfil atualizado com sucesso!');
      navigate('/');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar perfil');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Complete seu perfil</h1>
        <p className="mt-2 text-sm text-gray-600">
          Precisamos de mais algumas informações para continuar.
        </p>
      </div>

      <div className="flex items-center justify-center">
        <div className="relative">
          <div className="h-32 w-32 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden">
            {profileData?.avatar_url ? (
              <img
                src={profileData.avatar_url}
                alt="Profile"
                className="h-32 w-32 object-cover"
              />
            ) : (
              <span className="text-4xl font-semibold text-primary-600">
                {profileData?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <label
            htmlFor="avatar-upload"
            className={cn(
              "absolute bottom-0 right-0 rounded-full bg-primary-600 p-2 text-white shadow-lg hover:bg-primary-700 transition-colors cursor-pointer",
              isUploading && "opacity-50 cursor-not-allowed"
            )}
          >
            <input
              id="avatar-upload"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handleAvatarUpload}
              disabled={isUploading}
            />
            <Camera className="h-5 w-5" />
            <span className="sr-only">Alterar foto</span>
          </label>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
            Nome da empresa
          </label>
          <Input
            id="companyName"
            placeholder="Nome da sua empresa"
            error={errors.companyName?.message}
            {...register('companyName', {
              required: 'Nome da empresa é obrigatório',
            })}
          />
        </div>

        <div>
          <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700 mb-1">
            WhatsApp
          </label>
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

        <div>
          <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700 mb-1">
            Data de nascimento
          </label>
          <div className="relative">
            <Input
              id="birthDate"
              type="date"
              error={errors.birthDate?.message}
              className="pl-10 bg-white hover:bg-gray-50 cursor-pointer appearance-none"
              {...register('birthDate', {
                required: 'Data de nascimento é obrigatória',
              })}
            />
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary-500 pointer-events-none" />
            <style>{`
              input[type="date"]::-webkit-calendar-picker-indicator {
                background: transparent;
                bottom: 0;
                color: transparent;
                cursor: pointer;
                height: auto;
                left: 0;
                position: absolute;
                right: 0;
                top: 0;
                width: auto;
              }
              input[type="date"]::-webkit-datetime-edit {
                color: #374151;
              }
              input[type="date"]::-webkit-datetime-edit-fields-wrapper {
                padding: 0;
              }
              input[type="date"]::-webkit-datetime-edit-text {
                color: #374151;
                padding: 0 0.2em;
              }
              input[type="date"]::-webkit-datetime-edit-month-field,
              input[type="date"]::-webkit-datetime-edit-day-field,
              input[type="date"]::-webkit-datetime-edit-year-field {
                color: #374151;
                padding: 0;
              }
              input[type="date"]:focus {
                outline: none;
                border-color: #9333ea;
                box-shadow: 0 0 0 2px rgba(147, 51, 234, 0.1);
              }
            `}</style>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
          isLoading={isLoading}
        >
          Salvar e continuar
        </Button>
      </form>
    </div>
  );
}