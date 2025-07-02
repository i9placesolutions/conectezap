import { useState, useEffect } from 'react';
import { FileText, Plus, Edit2, Trash2, Save, X, User, Clock, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'react-hot-toast';

interface Note {
  id: string;
  chatId: string;
  content: string;
  author: string;
  createdAt: number;
  updatedAt: number;
  isPrivate: boolean;
  tags: string[];
}

interface NotesPanelProps {
  chatId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function NotesPanel({ chatId, isOpen, onClose }: NotesPanelProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [newNote, setNewNote] = useState({
    content: '',
    isPrivate: false,
    tags: ''
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Carregar notas do localStorage
  useEffect(() => {
    if (chatId) {
      const savedNotes = localStorage.getItem(`chat_notes_${chatId}`);
      if (savedNotes) {
        try {
          setNotes(JSON.parse(savedNotes));
        } catch (error) {
          console.error('Erro ao carregar notas:', error);
        }
      }
    }
  }, [chatId]);

  // Salvar notas no localStorage
  const saveNotes = (notesData: Note[]) => {
    localStorage.setItem(`chat_notes_${chatId}`, JSON.stringify(notesData));
  };

  const handleSaveNote = () => {
    if (!newNote.content.trim()) {
      toast.error('O conteúdo da nota é obrigatório');
      return;
    }

    const note: Note = {
      id: editingNoteId || Date.now().toString(),
      chatId,
      content: newNote.content.trim(),
      author: 'Agente Atual', // Em produção, pegar do contexto de autenticação
      createdAt: editingNoteId ? notes.find(n => n.id === editingNoteId)?.createdAt || Date.now() : Date.now(),
      updatedAt: Date.now(),
      isPrivate: newNote.isPrivate,
      tags: newNote.tags.split(',').map(tag => tag.trim()).filter(Boolean)
    };

    let updatedNotes;
    if (editingNoteId) {
      updatedNotes = notes.map(n => n.id === editingNoteId ? note : n);
      toast.success('Nota atualizada');
    } else {
      updatedNotes = [note, ...notes];
      toast.success('Nota criada');
    }

    setNotes(updatedNotes);
    saveNotes(updatedNotes);
    
    // Resetar formulário
    setIsEditing(false);
    setEditingNoteId(null);
    setNewNote({ content: '', isPrivate: false, tags: '' });
  };

  const handleEditNote = (note: Note) => {
    setEditingNoteId(note.id);
    setNewNote({
      content: note.content,
      isPrivate: note.isPrivate,
      tags: note.tags.join(', ')
    });
    setIsEditing(true);
  };

  const handleDeleteNote = (noteId: string) => {
    if (confirm('Tem certeza que deseja deletar esta nota?')) {
      const updatedNotes = notes.filter(n => n.id !== noteId);
      setNotes(updatedNotes);
      saveNotes(updatedNotes);
      toast.success('Nota deletada');
    }
  };

  const filteredNotes = notes.filter(note => 
    note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Ontem';
    } else if (diffDays < 7) {
      return `${diffDays} dias atrás`;
    } else {
      return date.toLocaleDateString('pt-BR');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-gray-200 shadow-lg flex flex-col z-40">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary-600" />
          <h3 className="font-semibold text-gray-900">Notas Internas</h3>
          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
            {notes.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar notas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Add Note Button */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={() => setIsEditing(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nova Nota
        </button>
      </div>

      {/* Note Editor */}
      {isEditing && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="space-y-3">
            <textarea
              value={newNote.content}
              onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
              placeholder="Digite sua nota..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
            
            <div className="space-y-2">
              <input
                type="text"
                value={newNote.tags}
                onChange={(e) => setNewNote({ ...newNote, tags: e.target.value })}
                placeholder="Tags (separadas por vírgula)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newNote.isPrivate}
                  onChange={(e) => setNewNote({ ...newNote, isPrivate: e.target.checked })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-gray-600">Nota privada (apenas para mim)</span>
              </label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSaveNote}
                className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white text-sm rounded hover:bg-primary-700"
              >
                <Save className="h-3 w-3" />
                {editingNoteId ? 'Atualizar' : 'Salvar'}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditingNoteId(null);
                  setNewNote({ content: '', isPrivate: false, tags: '' });
                }}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto">
        {filteredNotes.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 mb-1">
              {searchTerm ? 'Nenhuma nota encontrada' : 'Nenhuma nota ainda'}
            </p>
            <p className="text-xs text-gray-400">
              {searchTerm ? 'Tente ajustar a busca' : 'Adicione a primeira nota para esta conversa'}
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                className="bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors"
              >
                {/* Note Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-600">{note.author}</span>
                    {note.isPrivate && (
                      <span className="bg-yellow-100 text-yellow-700 text-xs px-1.5 py-0.5 rounded">
                        Privada
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditNote(note)}
                      className="p-1 text-gray-400 hover:text-primary-600 rounded"
                      title="Editar nota"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded"
                      title="Deletar nota"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Note Content */}
                <p className="text-sm text-gray-900 mb-2 whitespace-pre-wrap">
                  {note.content}
                </p>

                {/* Note Footer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {formatDate(note.createdAt)}
                      {note.updatedAt !== note.createdAt && ' (editada)'}
                    </span>
                  </div>

                  {note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {note.tags.slice(0, 2).map((tag, index) => (
                        <span
                          key={index}
                          className="bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {note.tags.length > 2 && (
                        <span className="text-xs text-gray-400">
                          +{note.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 