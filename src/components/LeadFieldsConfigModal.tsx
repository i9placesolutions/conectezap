import { useState } from 'react';
import { X, Save, Settings, Info } from 'lucide-react';

interface LeadFieldsConfig {
  lead_field_01?: string;
  lead_field_02?: string;
  lead_field_03?: string;
  lead_field_04?: string;
  lead_field_05?: string;
  lead_field_06?: string;
  lead_field_07?: string;
  lead_field_08?: string;
  lead_field_09?: string;
  lead_field_10?: string;
  lead_field_11?: string;
  lead_field_12?: string;
  lead_field_13?: string;
  lead_field_14?: string;
  lead_field_15?: string;
  lead_field_16?: string;
  lead_field_17?: string;
  lead_field_18?: string;
  lead_field_19?: string;
  lead_field_20?: string;
}

interface LeadFieldsConfigModalProps {
  currentConfig: LeadFieldsConfig;
  onSave: (config: LeadFieldsConfig) => void;
  onClose: () => void;
}

export default function LeadFieldsConfigModal({
  currentConfig,
  onSave,
  onClose
}: LeadFieldsConfigModalProps) {
  const [config, setConfig] = useState<LeadFieldsConfig>(currentConfig);

  const handleFieldChange = (fieldKey: keyof LeadFieldsConfig, value: string) => {
    setConfig(prev => ({
      ...prev,
      [fieldKey]: value.substring(0, 255) // Máximo 255 caracteres
    }));
  };

  const handleSave = () => {
    onSave(config);
  };

  const renderFieldInput = (fieldNumber: number) => {
    const fieldKey = `lead_field_${fieldNumber.toString().padStart(2, '0')}` as keyof LeadFieldsConfig;
    const value = config[fieldKey] || '';

    return (
      <div key={fieldKey} className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          Campo {fieldNumber}
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
          placeholder={`Ex: Setor, Cargo, Empresa...`}
          maxLength={255}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Settings className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Configurar Campos Personalizados
              </h2>
              <p className="text-sm text-gray-600">
                Defina os nomes dos 20 campos personalizados para seus leads
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Info */}
        <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Como funciona:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Defina nomes personalizados para até 20 campos extras</li>
                <li>Cada campo pode armazenar até 255 caracteres</li>
                <li>Use para informações como: Setor, Cargo, Empresa, Origem, Produto de Interesse, etc.</li>
                <li>Os campos configurados aparecerão ao editar leads</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 20 }, (_, i) => i + 1).map(fieldNumber =>
              renderFieldInput(fieldNumber)
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            Salvar Configuração
          </button>
        </div>
      </div>
    </div>
  );
}
