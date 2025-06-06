import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Tag, Trash2, Edit, Palette } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Label {
  id: string;
  name: string;
  color: string;
  createdAt?: string;
  chatCount?: number;
}

interface LabelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  labels: Label[];
  onLoadLabels: () => void;
  onCreateLabel: (name: string, color: string) => void;
  onDeleteLabel: (labelId: string) => void;
  loading: boolean;
}

const LABEL_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
];

export function LabelsModal({
  isOpen,
  onClose,
  labels,
  onLoadLabels,
  onCreateLabel,
  onDeleteLabel,
  loading
}: LabelsModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredLabels, setFilteredLabels] = useState<Label[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [selectedColor, setSelectedColor] = useState(LABEL_COLORS[0]);

  useEffect(() => {
    if (isOpen) {
      onLoadLabels();
    }
  }, [isOpen, onLoadLabels]);

  useEffect(() => {
    const filtered = labels.filter(label =>
      label.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredLabels(filtered);
  }, [labels, searchTerm]);

  const handleCreateLabel = () => {
    if (!newLabelName.trim()) {
      toast.error('Nome da etiqueta é obrigatório');
      return;
    }

    onCreateLabel(newLabelName.trim(), selectedColor);
    setNewLabelName('');
    setSelectedColor(LABEL_COLORS[0]);
    setShowCreateForm(false);
  };

  const handleDeleteLabel = (label: Label) => {
    if (window.confirm(`Tem certeza que deseja excluir a etiqueta "${label.name}"?`)) {
      onDeleteLabel(label.id);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <Tag className="h-5 w-5 text-yellow-600" />
            <h2 className="text-lg font-semibold">Gerenciar Etiquetas</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 border-b">
          <div className="flex items-center space-x-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar etiquetas..."
                className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Nova
            </button>
          </div>

          {showCreateForm && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome da Etiqueta
                  </label>
                  <input
                    type="text"
                    placeholder="Digite o nome da etiqueta"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateLabel()}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cor da Etiqueta
                  </label>
                  <div className="flex space-x-2">
                    {LABEL_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`w-8 h-8 rounded-full border-2 ${
                          selectedColor === color ? 'border-gray-800' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleCreateLabel}
                    className="px-3 py-1 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm"
                  >
                    Criar
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewLabelName('');
                      setSelectedColor(LABEL_COLORS[0]);
                    }}
                    className="px-3 py-1 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto max-h-96">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-yellow-600 border-t-transparent rounded-full" />
            </div>
          ) : filteredLabels.length === 0 ? (
            <div className="p-8 text-center">
              <div className="rounded-full bg-gray-100 h-16 w-16 flex items-center justify-center mx-auto mb-4">
                <Tag className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500 mb-2">
                {searchTerm ? 'Nenhuma etiqueta encontrada' : 'Nenhuma etiqueta criada'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-3 py-1 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm"
                >
                  Criar primeira etiqueta
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredLabels.map((label) => (
                <div key={label.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    <div>
                      <h3 className="font-medium text-gray-900">{label.name}</h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        {label.chatCount !== undefined && (
                          <span>{label.chatCount} chat(s)</span>
                        )}
                        {label.createdAt && (
                          <span>• Criada em {new Date(label.createdAt).toLocaleDateString('pt-BR')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDeleteLabel(label)}
                      className="flex items-center px-2 py-1 text-red-600 hover:bg-red-50 rounded-md"
                      title="Excluir etiqueta"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {filteredLabels.length} etiqueta(s) encontrada(s)
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}