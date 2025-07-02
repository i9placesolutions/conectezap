import { useState } from 'react';
import { cn } from '../../lib/utils';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallbackClassName?: string;
}

const sizeClasses = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-base',
  xl: 'h-32 w-32 text-4xl'
};

export function Avatar({ 
  src, 
  alt, 
  name, 
  size = 'md', 
  className,
  fallbackClassName 
}: AvatarProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleImageError = () => {
    console.log('🖼️ Avatar: Falha ao carregar imagem, usando fallback', { src, name });
    setHasError(true);
    setIsLoading(false);
  };

  const handleImageLoad = () => {
    setHasError(false);
    setIsLoading(false);
  };

  // Função para gerar cor de fundo baseada no nome
  const getBackgroundColor = (text?: string) => {
    if (!text) return 'bg-gray-400';
    
    const colors = [
      'bg-red-400', 'bg-blue-400', 'bg-green-400', 'bg-yellow-400',
      'bg-purple-400', 'bg-pink-400', 'bg-indigo-400', 'bg-teal-400'
    ];
    
    const index = text.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Pegar primeira letra do nome para fallback
  const getInitials = (text?: string) => {
    if (!text) return '?';
    return text.charAt(0).toUpperCase();
  };

  const baseClasses = cn(
    'rounded-full flex items-center justify-center overflow-hidden flex-shrink-0',
    sizeClasses[size],
    className
  );

  // Se não tem imagem ou deu erro, mostra fallback
  if (!src || hasError) {
    return (
      <div className={cn(
        baseClasses,
        getBackgroundColor(name || alt),
        'text-white font-semibold',
        fallbackClassName
      )}>
        {getInitials(name || alt)}
      </div>
    );
  }

  return (
    <div className={baseClasses}>
      {isLoading && (
        <div className={cn(
          'absolute inset-0 flex items-center justify-center',
          getBackgroundColor(name || alt),
          'text-white font-semibold'
        )}>
          {getInitials(name || alt)}
        </div>
      )}
      <img
        src={src}
        alt={alt || name || 'Avatar'}
        className={cn(
          'h-full w-full object-cover',
          isLoading && 'opacity-0'
        )}
        onError={handleImageError}
        onLoad={handleImageLoad}
        loading="lazy"
      />
    </div>
  );
} 