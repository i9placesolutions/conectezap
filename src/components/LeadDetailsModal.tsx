import { useState } from 'react';
import { X, Save, User, Phone, Tag, FileText, Briefcase } from 'lucide-react';
import { Lead } from '../services/supabase-leads';

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

interface LeadDetailsModalProps {
  lead: Lead;
  fieldsConfig: LeadFieldsConfig;
  onSave: (leadData: Partial<Lead>) => void;
  onClose: () => void;
}

const DEFAULT_STATUSES = ['novo', 'qualificado', 'negociacao', 'ganho', 'perdido'];

export default function LeadDetailsModal({
  lead,
  fieldsConfig,
  onSave,
  onClose
}: LeadDetailsModalProps) {
  const [formData, setFormData] = useState({
    id: lead.id,
    lead_name: lead.lead_name || '',
    lead_full_name: lead.lead_full_name || '',
    lead_email: lead.lead_email || '',
    lead_personal_id: lead.lead_personal_id || '',
    lead_status: lead.lead_status || 'novo',
    lead_notes: lead.lead_notes || '',
    lead_tags: Array.isArray(lead.lead_tags) ? lead.lead_tags.join(', ') : '',
    lead_is_ticket_open: lead.lead_is_ticket_open || false,
    // Campos personalizados
    ...Object.keys(fieldsConfig).reduce((acc, key) => {
      acc[key] = (lead as any)[key] || '';
      return acc;
    }, {} as Record<string, string>)
  });

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    console.log('📝 Dados do formulário:', formData);
    
    // Converter tags de string para array
    const tagsArray = formData.lead_tags
      ? formData.lead_tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      : [];

    const leadData: any = {
      id: formData.id,
      lead_name: formData.lead_name,
      lead_full_name: formData.lead_full_name,
      lead_email: formData.lead_email,
      lead_personal_id: formData.lead_personal_id,
      lead_status: formData.lead_status,
      lead_notes: formData.lead_notes,
      lead_tags: tagsArray,
      lead_is_ticket_open: formData.lead_is_ticket_open
    };

    // Adicionar campos personalizados
    Object.keys(fieldsConfig).forEach(key => {
      if (formData[key as keyof typeof formData]) {
        leadData[key] = formData[key as keyof typeof formData];
      }
    });

    console.log('💾 Dados que serão salvos:', leadData);
    onSave(leadData);
  };

  const displayName = lead.lead_name || lead.wa_contact_name || lead.wa_name || 'Sem nome';
  const phoneNumber = lead.phone || lead.chat_id?.split('@')[0] || '';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-lg">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {phoneNumber}
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

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Informações Básicas */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Informações Básicas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={formData.lead_name}
                    onChange={(e) => handleChange('lead_name', e.target.value)}
                    placeholder="Nome do lead"
                    maxLength={255}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    value={formData.lead_full_name}
                    onChange={(e) => handleChange('lead_full_name', e.target.value)}
                    placeholder="Nome completo"
                    maxLength={255}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.lead_email}
                    onChange={(e) => handleChange('lead_email', e.target.value)}
                    placeholder="email@exemplo.com"
                    maxLength={255}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    CPF/CNPJ
                  </label>
                  <input
                    type="text"
                    value={formData.lead_personal_id}
                    onChange={(e) => handleChange('lead_personal_id', e.target.value)}
                    placeholder="000.000.000-00"
                    maxLength={255}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Status e Tags */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Status e Tags
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    value={formData.lead_status}
                    onChange={(e) => handleChange('lead_status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {DEFAULT_STATUSES.map(status => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Tags (separadas por vírgula)
                  </label>
                  <input
                    type="text"
                    value={formData.lead_tags}
                    onChange={(e) => handleChange('lead_tags', e.target.value)}
                    placeholder="vip, suporte, urgente"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.lead_is_ticket_open}
                    onChange={(e) => handleChange('lead_is_ticket_open', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Ticket Aberto
                  </span>
                </label>
              </div>
            </div>

            {/* Observações */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Observações
              </h3>
              <textarea
                value={formData.lead_notes}
                onChange={(e) => handleChange('lead_notes', e.target.value)}
                placeholder="Anotações sobre o lead..."
                maxLength={255}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Campos Personalizados */}
            {Object.keys(fieldsConfig).filter(key => fieldsConfig[key as keyof LeadFieldsConfig]).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  Campos Personalizados
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.keys(fieldsConfig).map(fieldKey => {
                    const fieldName = fieldsConfig[fieldKey as keyof LeadFieldsConfig];
                    if (!fieldName) return null;

                    return (
                      <div key={fieldKey} className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">
                          {fieldName}
                        </label>
                        <input
                          type="text"
                          value={formData[fieldKey as keyof typeof formData] as string || ''}
                          onChange={(e) => handleChange(fieldKey, e.target.value)}
                          placeholder={`Digite ${fieldName.toLowerCase()}`}
                          maxLength={255}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
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
            Salvar Lead
          </button>
        </div>
      </div>
    </div>
  );
}
