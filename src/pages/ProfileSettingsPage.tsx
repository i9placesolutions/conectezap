import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/ui/Input';
import { WhatsAppInput } from '../components/ui/WhatsAppInput';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { storageService } from '../lib/supabase-real';
import { Calendar, Eye, EyeOff, Camera } from 'lucide-react';
import { cn } from '../lib/utils';

interface ProfileForm {
  fullName: string;
  companyName: string;
  birthDate: string;
  whatsapp: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export function ProfileSettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const { user } = useAuth();
  
  const { register, handleSubmit, formState: { errors }, control, setValue, watch } = useForm<ProfileForm>({
    defaultValues: {
      whatsapp: '55'
    }
  });

  const newPassword = watch('newPassword');

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
          setValue('fullName', data.full_name || '');
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
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      setIsUploading(true);

      // Upload image
      const { error: uploadError } = await storageService.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = storageService.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      setProfileData((prev: any) => ({
        ...prev,
        avatar_url: publicUrl
      }));

      toast.success('Foto atualizada com sucesso!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Erro ao atualizar foto');
    } finally {
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

      // Update profile data
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: data.fullName,
          company_name: data.companyName,
          birth_date: data.birthDate,
          whatsapp: cleanWhatsApp,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);

      if (profileError) throw profileError;

      // Update password if provided
      if (data.currentPassword && data.newPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: data.newPassword
        });

        if (passwordError) throw passwordError;
        toast.success('Senha alterada com sucesso!');
      }

      toast.success('Perfil atualizado com sucesso!');
      setProfileData((prev: any) => ({
        ...prev,
        full_name: data.fullName,
        company_name: data.companyName,
        birth_date: data.birthDate,
        whatsapp: cleanWhatsApp
      }));

      // Clear password fields
      setValue('currentPassword', '');
      setValue('newPassword', '');
      setValue('confirmPassword', '');
    } catch (error) {
      console.error('Error updating profile:', error);
      let errorMsg = 'Erro ao atualizar perfil';
      
      if (error instanceof Error) {
        errorMsg = error.message;
      }
      
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Avatar Upload */}
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
                  "absolute -bottom-1 -right-1 rounded-full bg-primary-600 p-2 text-white shadow-lg hover:bg-primary-700 transition-colors cursor-pointer flex items-center justify-center",
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Profile Information */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Informações do Perfil</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    E-mail
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-gray-50"
                  />
                </div>

                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                    Nome completo
                  </label>
                  <Input
                    id="fullName"
                    placeholder="Seu nome completo"
                    error={errors.fullName?.message}
                    {...register('fullName', {
                      required: 'Nome completo é obrigatório',
                    })}
                  />
                </div>

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
              </div>
            </div>

            {/* Password Change */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Alterar Senha</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Senha atual
                  </label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      placeholder="Digite sua senha atual"
                      error={errors.currentPassword?.message}
                      {...register('currentPassword', {
                        minLength: {
                          value: 6,
                          message: 'A senha deve ter no mínimo 6 caracteres'
                        }
                      })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Nova senha
                  </label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Digite a nova senha"
                      error={errors.newPassword?.message}
                      {...register('newPassword', {
                        minLength: {
                          value: 6,
                          message: 'A senha deve ter no mínimo 6 caracteres'
                        }
                      })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmar nova senha
                  </label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirme a nova senha"
                      error={errors.confirmPassword?.message}
                      {...register('confirmPassword', {
                        validate: value => value === newPassword || 'As senhas não coincidem'
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
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                className="w-full md:w-auto"
                isLoading={isLoading}
              >
                Salvar alterações
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}