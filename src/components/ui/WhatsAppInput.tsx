// Este é um componente de entrada para números de WhatsApp
import React from 'react';

interface WhatsAppInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export const WhatsAppInput: React.FC<WhatsAppInputProps> = ({ value, onChange, error }) => {
  return (
    <div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Número do WhatsApp"
        className={`input ${error ? 'input-error' : ''}`}
      />
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}; 