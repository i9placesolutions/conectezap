import { useState, useEffect } from 'react';
import { X, Search, Plus, Tag, Trash2, Edit, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Label {
  id: string;
  name: string;
  color: number; // ✅ API usa número de 0-19
  createdAt?: string;
  chatCount?: number;
}

interface LabelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  labels: Label[];
  onLoadLabels: () => void;
  onCreateLabel: (name: string, color: number) => void;
  onEditLabel: (labelId: string, name: string, color: number) => void;
  onDeleteLabel: (labelId: string) => void;
  loading: boolean;
}

// ✅ Cores do WhatsApp (0-19 conforme API)
const WHATSAPP_LABEL_COLORS = [
  { index: 0, hex: '#FF6B6B', name: 'Vermelho' },
  { index: 1, hex: '#FF8C42', name: 'Laranja' },
  { index: 2, hex: '#FFD93D', name: 'Amarelo' },
  { index: 3, hex: '#6BCF7F', name: 'Verde claro' },
  { index: 4, hex: '#4ECDC4', name: 'Turquesa' },
  { index: 5, hex: '#45B7D1', name: 'Azul claro' },
  { index: 6, hex: '#5F9BFF', name: 'Azul' },
  { index: 7, hex: '#9B59B6', name: 'Roxo' },
  { index: 8, hex: '#E91E63', name: 'Rosa' },
  { index: 9, hex: '#795548', name: 'Marrom' },
  { index: 10, hex: '#607D8B', name: 'Cinza azulado' },
  { index: 11, hex: '#26C281', name: 'Verde esmeralda' },
  { index: 12, hex: '#16A085', name: 'Verde mar' },
  { index: 13, hex: '#2ECC71', name: 'Verde' },
  { index: 14, hex: '#3498DB', name: 'Azul céu' },
  { index: 15, hex: '#9C88FF', name: 'Lavanda' },
  { index: 16, hex: '#F39C12', name: 'Laranja escuro' },
  { index: 17, hex: '#E74C3C', name: 'Vermelho escuro' },
  { index: 18, hex: '#95A5A6', name: 'Cinza' },
  { index: 19, hex: '#34495E', name: 'Cinza escuro' },
];

export function LabelsModal({
  isOpen,
  onClose,
  labels,
  onLoadLabels,
  onCreateLabel,
  onEditLabel,
  onDeleteLabel,
  loading
}: LabelsModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredLabels, setFilteredLabels] = useState<Label[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingLabel, setEditingLabel] = useState<Label | null>(null);
  const [newLabelName, setNewLabelName] = useState('');
  const [selectedColor, setSelectedColor] = useState(0); // ✅ Índice da cor (0-19)

  useEffect(() => {
    if (isOpen) {
      console.log('🏷️ [LabelsModal] Modal aberto! Carregando etiquetas...');
      onLoadLabels();
    } else {
      console.log('🏷️ [LabelsModal] Modal fechado');
    }
  }, [isOpen, onLoadLabels]);

  useEffect(() => {
    const filtered = labels.filter(label =>
      label.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredLabels(filtered);
    console.log('🏷️ [LabelsModal] Etiquetas filtradas:', filtered.length, '/', labels.length);
  }, [labels, searchTerm]);

  const handleCreateLabel = () => {
    if (!newLabelName.trim()) {
      toast.error('Nome da etiqueta é obrigatório');
      return;
    }

    onCreateLabel(newLabelName.trim(), selectedColor);
    setNewLabelName('');
    setSelectedColor(0);
    setShowCreateForm(false);
  };

  const handleStartEdit = (label: Label) => {
    setEditingLabel(label);
    setNewLabelName(label.name);
    setSelectedColor(label.color);
    setShowCreateForm(false);
  };

  const handleUpdateLabel = () => {
    if (!editingLabel) return;
    
    if (!newLabelName.trim()) {
      toast.error('Nome da etiqueta é obrigatório');
      return;
    }

    onEditLabel(editingLabel.id, newLabelName.trim(), selectedColor);
    setEditingLabel(null);
    setNewLabelName('');
    setSelectedColor(0);
  };

  const handleCancelEdit = () => {
    setEditingLabel(null);
    setNewLabelName('');
    setSelectedColor(0);
    setShowCreateForm(false);
  };

  const handleDeleteLabel = (label: Label) => {
    if (window.confirm(`Tem certeza que deseja excluir a etiqueta "${label.name}"?`)) {
      onDeleteLabel(label.id);
    }
  };

  // ✅ Converter índice de cor para hex
  const getColorHex = (colorIndex: number): string => {
    const color = WHATSAPP_LABEL_COLORS.find(c => c.index === colorIndex);
    return color?.hex || WHATSAPP_LABEL_COLORS[0].hex;
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
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
            {!editingLabel && (
              <button
                onClick={() => {
                  setShowCreateForm(!showCreateForm);
                  setEditingLabel(null);
                }}
                className="flex items-center px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
              >
                <Plus className="h-4 w-4 mr-1" />
                Nova
              </button>
            )}
          </div>

          {/* Formulário de Criar/Editar */}
          {(showCreateForm || editingLabel) && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {editingLabel ? 'Editar Etiqueta' : 'Nome da Etiqueta'}
                  </label>
                  <input
                    type="text"
                    placeholder="Digite o nome da etiqueta"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (editingLabel ? handleUpdateLabel() : handleCreateLabel())}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cor da Etiqueta (WhatsApp)
                  </label>
                  <div className="grid grid-cols-10 gap-2">
                    {WHATSAPP_LABEL_COLORS.map((colorOption) => (
                      <button
                        key={colorOption.index}
                        onClick={() => setSelectedColor(colorOption.index)}
                        className={`w-8 h-8 rounded-full border-2 relative transition-all ${
                          selectedColor === colorOption.index ? 'border-gray-800 ring-2 ring-offset-2 ring-yellow-500' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: colorOption.hex }}
                        title={colorOption.name}
                      >
                        {selectedColor === colorOption.index && (
                          <Check className="h-4 w-4 text-white absolute inset-0 m-auto" strokeWidth={3} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={editingLabel ? handleUpdateLabel : handleCreateLabel}
                    className="px-3 py-1 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm"
                  >
                    {editingLabel ? 'Salvar' : 'Criar'}
                  </button>
                  <button
                    onClick={handleCancelEdit}
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
                      className="w-6 h-6 rounded-full border border-gray-200"
                      style={{ backgroundColor: getColorHex(label.color) }}
                      title={`Cor ${label.color}`}
                    />
                    <div>
                      <h3 className="font-medium text-gray-900">{label.name}</h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <span>ID: {label.id}</span>
                        {label.chatCount !== undefined && (
                          <span>• {label.chatCount} chat(s)</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleStartEdit(label)}
                      className="flex items-center px-2 py-1 text-blue-600 hover:bg-blue-50 rounded-md"
                      title="Editar etiqueta"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
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