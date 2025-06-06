// Este é um componente de entrada para números de WhatsApp
import React from 'react';
import { cn } from '../../lib/utils';

interface WhatsAppInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  className?: string;
}

const formatWhatsApp = (value: string) => {
  // Remove todos os caracteres não numéricos
  const numbers = value.replace(/\D/g, '');
  
  // Remove o código 55 se estiver presente para trabalhar apenas com DDD + número
  const localNumbers = numbers.startsWith('55') ? numbers.slice(2) : numbers;
  
  // Aplica a máscara brasileira: 55 (11) 99999-9999
  if (localNumbers.length === 0) {
    return '55 ';
  } else if (localNumbers.length <= 2) {
    return `55 (${localNumbers}`;
  } else if (localNumbers.length <= 7) {
    return `55 (${localNumbers.slice(0, 2)}) ${localNumbers.slice(2)}`;
  } else {
    return `55 (${localNumbers.slice(0, 2)}) ${localNumbers.slice(2, 7)}-${localNumbers.slice(7, 11)}`;
  }
};

export const WhatsAppInput = React.forwardRef<HTMLInputElement, WhatsAppInputProps>(({ value, onChange, error, className, ...props }, ref) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // Remove tudo exceto números
    const numbersOnly = inputValue.replace(/\D/g, '');
    
    // Remove o código 55 se estiver presente para trabalhar apenas com DDD + número
    const localNumbers = numbersOnly.startsWith('55') ? numbersOnly.slice(2) : numbersOnly;
    
    // Limita a 11 dígitos (DDD + número brasileiro)
    if (localNumbers.length <= 11) {
      // Sempre adiciona o código do país 55
      onChange(`55${localNumbers}`);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">
        WhatsApp
      </label>
      <div className="relative">
        <input
          ref={ref}
          type="text"
          value={formatWhatsApp(value)}
          onChange={handleChange}
          placeholder="55 (11) 99999-9999"
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500 focus-visible:ring-red-500",
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        )}
      </div>
    </div>
  );
});

WhatsAppInput.displayName = 'WhatsAppInput';