-- =====================================================
-- SISTEMA DE GESTÃO DE LEADS
-- Arquitetura Híbrida: Supabase (gestão) + UAZAPI (WhatsApp)
-- =====================================================

-- 1. TABELA DE CONFIGURAÇÃO DE CAMPOS PERSONALIZADOS
-- Armazena os nomes/labels dos 20 campos customizáveis por instância
CREATE TABLE IF NOT EXISTS lead_field_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  instance_id TEXT NOT NULL,
  
  -- Nomes dos 20 campos personalizados
  lead_field_01 TEXT,
  lead_field_02 TEXT,
  lead_field_03 TEXT,
  lead_field_04 TEXT,
  lead_field_05 TEXT,
  lead_field_06 TEXT,
  lead_field_07 TEXT,
  lead_field_08 TEXT,
  lead_field_09 TEXT,
  lead_field_10 TEXT,
  lead_field_11 TEXT,
  lead_field_12 TEXT,
  lead_field_13 TEXT,
  lead_field_14 TEXT,
  lead_field_15 TEXT,
  lead_field_16 TEXT,
  lead_field_17 TEXT,
  lead_field_18 TEXT,
  lead_field_19 TEXT,
  lead_field_20 TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Um usuário só pode ter uma configuração por instância
  CONSTRAINT lead_field_configs_user_instance_unique UNIQUE(user_id, instance_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_lead_field_configs_user_id ON lead_field_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_field_configs_instance_id ON lead_field_configs(instance_id);

-- 2. TABELA PRINCIPAL DE LEADS
-- Armazena todos os dados de gestão dos leads
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  instance_id TEXT NOT NULL,
  
  -- ============================================
  -- IDENTIFICAÇÃO (vem do WhatsApp/UAZAPI)
  -- ============================================
  chat_id TEXT NOT NULL, -- 5511999999999@s.whatsapp.net (chave única)
  phone TEXT,
  wa_name TEXT, -- Nome salvo no WhatsApp
  wa_contact_name TEXT, -- Nome do contato
  profile_picture_url TEXT,
  is_group BOOLEAN DEFAULT false,
  
  -- ============================================
  -- DADOS DE GESTÃO (editáveis pelo usuário)
  -- ============================================
  lead_name TEXT,
  lead_full_name TEXT,
  lead_email TEXT,
  lead_personal_id TEXT, -- CPF/CNPJ
  lead_status TEXT DEFAULT 'novo',
  lead_tags TEXT[], -- Array de tags
  lead_notes TEXT,
  lead_is_ticket_open BOOLEAN DEFAULT false,
  lead_assigned_agent_id TEXT, -- ID do atendente
  lead_kanban_order INTEGER DEFAULT 0,
  
  -- ============================================
  -- CAMPOS PERSONALIZADOS (20 campos)
  -- ============================================
  lead_field_01 TEXT,
  lead_field_02 TEXT,
  lead_field_03 TEXT,
  lead_field_04 TEXT,
  lead_field_05 TEXT,
  lead_field_06 TEXT,
  lead_field_07 TEXT,
  lead_field_08 TEXT,
  lead_field_09 TEXT,
  lead_field_10 TEXT,
  lead_field_11 TEXT,
  lead_field_12 TEXT,
  lead_field_13 TEXT,
  lead_field_14 TEXT,
  lead_field_15 TEXT,
  lead_field_16 TEXT,
  lead_field_17 TEXT,
  lead_field_18 TEXT,
  lead_field_19 TEXT,
  lead_field_20 TEXT,
  
  -- ============================================
  -- METADADOS DA ÚLTIMA MENSAGEM
  -- ============================================
  last_message_at TIMESTAMPTZ,
  last_message_text TEXT,
  last_message_type TEXT, -- text, image, audio, etc.
  unread_count INTEGER DEFAULT 0,
  
  -- ============================================
  -- AUDITORIA
  -- ============================================
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: um chat_id é único por usuário e instância
  CONSTRAINT leads_user_instance_chat_unique UNIQUE(user_id, instance_id, chat_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_instance_id ON leads(instance_id);
CREATE INDEX IF NOT EXISTS idx_leads_chat_id ON leads(chat_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(lead_status);
CREATE INDEX IF NOT EXISTS idx_leads_tags ON leads USING GIN(lead_tags);
CREATE INDEX IF NOT EXISTS idx_leads_last_message_at ON leads(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_user_instance ON leads(user_id, instance_id);

-- 3. TABELA DE HISTÓRICO DE MUDANÇAS
-- Registra todas as alterações nos leads para auditoria
CREATE TABLE IF NOT EXISTS lead_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Tipo de mudança
  change_type TEXT NOT NULL, -- 'created', 'updated', 'status_changed', 'assigned', etc.
  
  -- Dados da mudança
  field_name TEXT, -- Campo que foi alterado
  old_value TEXT, -- Valor antigo (JSON string)
  new_value TEXT, -- Valor novo (JSON string)
  
  -- Metadados
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_lead_history_lead_id ON lead_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_history_changed_at ON lead_history(changed_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE lead_field_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_history ENABLE ROW LEVEL SECURITY;

-- Políticas para lead_field_configs
CREATE POLICY "Users can view own field configs"
  ON lead_field_configs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own field configs"
  ON lead_field_configs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own field configs"
  ON lead_field_configs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own field configs"
  ON lead_field_configs FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para leads
CREATE POLICY "Users can view own leads"
  ON leads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own leads"
  ON leads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own leads"
  ON leads FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own leads"
  ON leads FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para lead_history
CREATE POLICY "Users can view own lead history"
  ON lead_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_history.lead_id
      AND leads.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own lead history"
  ON lead_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_history.lead_id
      AND leads.user_id = auth.uid()
    )
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lead_field_configs_updated_at
  BEFORE UPDATE ON lead_field_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para registrar mudanças no histórico
CREATE OR REPLACE FUNCTION log_lead_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Registrar mudança de status
  IF OLD.lead_status IS DISTINCT FROM NEW.lead_status THEN
    INSERT INTO lead_history (lead_id, user_id, change_type, field_name, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'status_changed', 'lead_status', OLD.lead_status, NEW.lead_status);
  END IF;
  
  -- Registrar mudança de atendente
  IF OLD.lead_assigned_agent_id IS DISTINCT FROM NEW.lead_assigned_agent_id THEN
    INSERT INTO lead_history (lead_id, user_id, change_type, field_name, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'assigned', 'lead_assigned_agent_id', OLD.lead_assigned_agent_id, NEW.lead_assigned_agent_id);
  END IF;
  
  -- Registrar mudança de tags
  IF OLD.lead_tags IS DISTINCT FROM NEW.lead_tags THEN
    INSERT INTO lead_history (lead_id, user_id, change_type, field_name, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'tags_changed', 'lead_tags', OLD.lead_tags::text, NEW.lead_tags::text);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER log_lead_changes_trigger
  AFTER UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION log_lead_changes();

-- =====================================================
-- FUNÇÕES ÚTEIS
-- =====================================================

-- Função para buscar leads com filtros
CREATE OR REPLACE FUNCTION search_leads(
  p_user_id UUID,
  p_instance_id TEXT,
  p_status TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  chat_id TEXT,
  lead_name TEXT,
  lead_status TEXT,
  lead_tags TEXT[],
  last_message_at TIMESTAMPTZ,
  unread_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.chat_id,
    l.lead_name,
    l.lead_status,
    l.lead_tags,
    l.last_message_at,
    l.unread_count
  FROM leads l
  WHERE l.user_id = p_user_id
    AND l.instance_id = p_instance_id
    AND l.is_group = false
    AND (p_status IS NULL OR l.lead_status = p_status)
    AND (p_search IS NULL OR 
         l.lead_name ILIKE '%' || p_search || '%' OR
         l.lead_email ILIKE '%' || p_search || '%' OR
         l.phone ILIKE '%' || p_search || '%')
    AND (p_tags IS NULL OR l.lead_tags && p_tags)
  ORDER BY l.last_message_at DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para contar leads por status
CREATE OR REPLACE FUNCTION count_leads_by_status(
  p_user_id UUID,
  p_instance_id TEXT
)
RETURNS TABLE (
  status TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(l.lead_status, 'novo') as status,
    COUNT(*) as count
  FROM leads l
  WHERE l.user_id = p_user_id
    AND l.instance_id = p_instance_id
    AND l.is_group = false
  GROUP BY COALESCE(l.lead_status, 'novo');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMENTÁRIOS
-- =====================================================

COMMENT ON TABLE leads IS 'Tabela principal de leads - armazena dados de gestão separado do WhatsApp';
COMMENT ON TABLE lead_field_configs IS 'Configuração dos nomes dos campos personalizados por instância';
COMMENT ON TABLE lead_history IS 'Histórico de todas as mudanças nos leads para auditoria';

COMMENT ON COLUMN leads.chat_id IS 'ID único do chat no WhatsApp (ex: 5511999999999@s.whatsapp.net)';
COMMENT ON COLUMN leads.lead_status IS 'Status do lead no funil (novo, qualificado, negociacao, ganho, perdido)';
COMMENT ON COLUMN leads.lead_tags IS 'Array de tags para categorização';
COMMENT ON COLUMN leads.is_group IS 'Flag para filtrar grupos (false = apenas contatos individuais)';
