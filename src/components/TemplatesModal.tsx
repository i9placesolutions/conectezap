import { useState, useEffect } from 'react';
import { X, Plus, Edit2, Trash2, MessageSquare, Star, Tag, Search, Folder } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';

interface Template {
  id: string;
  name: string;
  content: string;
  category: string;
  tags: string[];
  isFavorite: boolean;
  usageCount: number;
  createdAt: number;
  updatedAt: number;
}

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: Template) => void;
}

const defaultCategories = [
  'Saudações',
  'Despedidas', 
  'Informações',
  'Suporte',
  'Vendas',
  'Agendamentos',
  'FAQ',
  'Outros'
];

const defaultTemplates: Template[] = [
  {
    id: '1',
    name: 'Saudação Inicial',
    content: 'Olá! 😊 Seja bem-vindo(a) ao atendimento. Como posso ajudá-lo(a) hoje?',
    category: 'Saudações',
    tags: ['saudação', 'inicial', 'boas-vindas'],
    isFavorite: true,
    usageCount: 45,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000
  },
  {
    id: '2',
    name: 'Aguarde um momento',
    content: 'Aguarde um momento, por favor. Vou verificar essas informações para você. ⏳',
    category: 'Suporte',
    tags: ['aguardar', 'verificar', 'suporte'],
    isFavorite: true,
    usageCount: 32,
    createdAt: Date.now() - 172800000,
    updatedAt: Date.now() - 172800000
  },
  {
    id: '3',
    name: 'Horário de funcionamento',
    content: 'Nosso horário de atendimento é de segunda a sexta, das 8h às 18h. 🕘',
    category: 'Informações',
    tags: ['horário', 'funcionamento', 'atendimento'],
    isFavorite: false,
    usageCount: 28,
    createdAt: Date.now() - 259200000,
    updatedAt: Date.now() - 259200000
  },
  {
    id: '4',
    name: 'Despedida',
    content: 'Foi um prazer atendê-lo(a)! Se precisar de mais alguma coisa, estarei aqui. Tenha um ótimo dia! 🌟',
    category: 'Despedidas',
    tags: ['despedida', 'prazer', 'dia'],
    isFavorite: false,
    usageCount: 18,
    createdAt: Date.now() - 345600000,
    updatedAt: Date.now() - 345600000
  }
];

export function TemplatesModal({ isOpen, onClose, onSelectTemplate }: TemplatesModalProps) {
  const [templates, setTemplates] = useState<Template[]>(defaultTemplates);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    content: '',
    category: 'Outros',
    tags: ''
  });

  // Carregar templates do localStorage na inicialização
  useEffect(() => {
    const savedTemplates = localStorage.getItem('chat_templates');
    if (savedTemplates) {
      try {
        const parsed = JSON.parse(savedTemplates);
        setTemplates([...defaultTemplates, ...parsed]);
      } catch (error) {
        console.error('Erro ao carregar templates:', error);
      }
    }
  }, []);

  // Salvar templates no localStorage
  const saveTemplates = (templatesData: Template[]) => {
    const customTemplates = templatesData.filter(t => !defaultTemplates.some(dt => dt.id === t.id));
    localStorage.setItem('chat_templates', JSON.stringify(customTemplates));
  };

  const handleSelectTemplate = (template: Template) => {
    // Incrementar contador de uso
    const updatedTemplates = templates.map(t => 
      t.id === template.id 
        ? { ...t, usageCount: t.usageCount + 1 }
        : t
    );
    setTemplates(updatedTemplates);
    saveTemplates(updatedTemplates);
    
    onSelectTemplate(template);
    toast.success(`Template "${template.name}" aplicado`);
  };

  const handleSaveTemplate = () => {
    if (!newTemplate.name.trim() || !newTemplate.content.trim()) {
      toast.error('Nome e conteúdo são obrigatórios');
      return;
    }

    const template: Template = {
      id: editingTemplate?.id || Date.now().toString(),
      name: newTemplate.name,
      content: newTemplate.content,
      category: newTemplate.category,
      tags: newTemplate.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      isFavorite: editingTemplate?.isFavorite || false,
      usageCount: editingTemplate?.usageCount || 0,
      createdAt: editingTemplate?.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    let updatedTemplates;
    if (editingTemplate) {
      updatedTemplates = templates.map(t => t.id === template.id ? template : t);
      toast.success('Template atualizado');
    } else {
      updatedTemplates = [...templates, template];
      toast.success('Template criado');
    }

    setTemplates(updatedTemplates);
    saveTemplates(updatedTemplates);
    
    setIsEditing(false);
    setEditingTemplate(null);
    setNewTemplate({ name: '', content: '', category: 'Outros', tags: '' });
  };

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setNewTemplate({
      name: template.name,
      content: template.content,
      category: template.category,
      tags: template.tags.join(', ')
    });
    setIsEditing(true);
  };

  const handleDeleteTemplate = (templateId: string) => {
    // Não permitir deletar templates padrão
    if (defaultTemplates.some(dt => dt.id === templateId)) {
      toast.error('Não é possível deletar templates padrão');
      return;
    }

    const updatedTemplates = templates.filter(t => t.id !== templateId);
    setTemplates(updatedTemplates);
    saveTemplates(updatedTemplates);
    toast.success('Template deletado');
  };

  const toggleFavorite = (templateId: string) => {
    const updatedTemplates = templates.map(t => 
      t.id === templateId ? { ...t, isFavorite: !t.isFavorite } : t
    );
    setTemplates(updatedTemplates);
    saveTemplates(updatedTemplates);
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    
    const matchesFavorites = !showFavoritesOnly || template.isFavorite;
    
    return matchesSearch && matchesCategory && matchesFavorites;
  });

  // Ordenar por favoritos primeiro, depois por uso
  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return b.usageCount - a.usageCount;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-6 w-6 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? (editingTemplate ? 'Editar Template' : 'Novo Template') : 'Templates de Mensagem'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isEditing ? (
          /* Editor de Template */
          <div className="flex-1 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Template
              </label>
              <input
                type="text"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Ex: Saudação inicial"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Conteúdo
              </label>
              <textarea
                value={newTemplate.content}
                onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Digite o conteúdo da mensagem..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria
                </label>
                <select
                  value={newTemplate.category}
                  onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {defaultCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={newTemplate.tags}
                  onChange={(e) => setNewTemplate({ ...newTemplate, tags: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="saudação, inicial, boas-vindas"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSaveTemplate}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                {editingTemplate ? 'Atualizar' : 'Criar'} Template
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditingTemplate(null);
                  setNewTemplate({ name: '', content: '', category: 'Outros', tags: '' });
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          /* Lista de Templates */
          <>
            {/* Filtros */}
            <div className="p-6 border-b border-gray-200 space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  <Plus className="h-4 w-4" />
                  Novo Template
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Folder className="h-4 w-4 text-gray-500" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="all">Todas as categorias</option>
                    {defaultCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1 rounded-lg text-sm transition-colors",
                    showFavoritesOnly 
                      ? "bg-yellow-100 text-yellow-700" 
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  <Star className={cn("h-4 w-4", showFavoritesOnly && "fill-current")} />
                  Favoritos
                </button>
              </div>
            </div>

            {/* Lista de Templates */}
            <div className="flex-1 overflow-y-auto p-6">
              {sortedTemplates.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">Nenhum template encontrado</p>
                  <p className="text-sm text-gray-400">Tente ajustar os filtros ou criar um novo template</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {sortedTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors cursor-pointer"
                      onClick={() => handleSelectTemplate(template)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900">{template.name}</h3>
                          {template.isFavorite && (
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(template.id);
                            }}
                            className="p-1 text-gray-400 hover:text-yellow-500 rounded"
                          >
                            <Star className={cn("h-4 w-4", template.isFavorite && "fill-current text-yellow-500")} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditTemplate(template);
                            }}
                            className="p-1 text-gray-400 hover:text-primary-600 rounded"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          {!defaultTemplates.some(dt => dt.id === template.id) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTemplate(template.id);
                              }}
                              className="p-1 text-gray-400 hover:text-red-600 rounded"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{template.content}</p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                            {template.category}
                          </span>
                          <span className="text-xs text-gray-500">
                            {template.usageCount} usos
                          </span>
                        </div>

                        {template.tags.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Tag className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-500">
                              {template.tags.slice(0, 2).join(', ')}
                              {template.tags.length > 2 && '...'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
} 