// Este é um componente de entrada para instâncias de WhatsApp
import React from 'react';

interface WhatsAppInstanceInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export const WhatsAppInstanceInput: React.FC<WhatsAppInstanceInputProps> = ({ value, onChange, error }) => {
  return (
    <div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Instância do WhatsApp"
        className={`input ${error ? 'input-error' : ''}`}
      />
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}; 