Perfeito, Rafael! Segue um bloco de regras “cola-e-usa” para deixar claro (e prioridade máxima) como o Copilot deve agir no seu workspace. Você pode colocar isso em um arquivo na raiz do projeto (ex.: `AGENT_RULES.md`) e sempre colar o trecho curto no começo das conversas com o Copilot Chat.

---

# REGRAS ESTRITAS — GITHUB COPILOT (MCP FIRST)

**Idioma padrão:** Português do Brasil.
**Nível esperado:** Engenheiro **Sênior**. Erros amadores **não são tolerados**.

## 1) Prioridade: **MCP SEMPRE**

* **Usar MCP primeiro** para qualquer operação com serviços externos (ex.: Supabase).
* **Proibido** usar CLIs locais ou comandos fora do MCP sem autorização explícita.
* Se faltar um servidor MCP, **solicite** adicionar ao `mcp.json` e **pare** a alteração.

## 2) Layout e UI

* **NUNCA** alterar layout, componentes, cores, tipografia ou espaçamentos **sem pedido explícito**.
* Ajustes visuais só quando a tarefa pedir, e **apenas** no escopo pedido.
* **Responsividade obrigatória**: mobile-first, breakpoints claros, testes em telas pequenas e grandes.

## 3) Banco de Dados e Dados

* **JAMais** apagar tabelas, colunas, índices ou dados **sem pedido explícito** e plano de rollback.
* **NUNCA** renomear estruturas ou quebrar RLS/políticas.
* Migrações: somente aditivas; versões claras; script de rollback incluído.

## 4) Boas Práticas de Código

* Código limpo, tipado, pequeno e coeso.
* Tratamento de erros robusto; logs úteis (sem dados sensíveis).
* Funções puras quando possível; efeitos colaterais isolados.
* Nomes descritivos; comentários apenas quando **agregam contexto**.
* Testes: unitários para regras críticas; smoke tests quando criar endpoints.
* **Performance**: evitar N+1, usar cache/indices quando necessário.

## 5) Segurança

* Nunca vazar tokens/segredos.
* Validar entrada/saída; sanitizar dados; aplicar RLS e permissões corretamente.
* **Princípio do menor privilégio** em qualquer ação.

## 6) Fluxo de Trabalho (passo a passo obrigatório)

1. **Ler** `AGENT_RULES.md`, README e docs do projeto.
2. **Confirmar** servidores MCP relevantes e escopo da tarefa.
3. **Planejar**: descrever solução em 3–7 passos curtos antes de mexer no código.
4. **Implementar** mudanças mínimas e reversíveis.
5. **Testar** (local/unit) e listar o que foi testado.
6. **Gerar diff** pequeno, comentado e rastreável.

## 7) Proibições

* Não “refatorar por conta” fora do escopo.
* Não adicionar dependências desnecessárias.
* Não criar arquivos/pastas “exploratórios” dentro do repo.
* Não “otimizar” quebrando legibilidade ou contratos existentes.

## 8) Definição de Pronto (DoD)

* Passou nos testes locais e lint.
* Sem regressões de layout.
* Respeitou **todas** as regras deste arquivo.
* Passou por checklist final (abaixo).

---

## CHECKLIST FINAL (marcar **antes** de submeter)

* [ ] Usei **MCP** (não usei CLI) para tudo que dependia de serviço externo.
* [ ] Não alterei **layout** nem estilos fora do escopo solicitado.
* [ ] **Não** apaguei/renomeei estruturas de banco. Migração é **aditiva** e tem rollback.
* [ ] Código legível, testado, com tratamento de erros adequado.
* [ ] Responsividade verificada (mobile e desktop).
* [ ] Escopo mínimo, diffs pequenos e comentados.

---

## MENSAGEM PADRÃO (quando a tarefa pedir algo que viole as regras)

> “A ação solicitada viola as regras do projeto (ex.: alteração de layout sem pedido explícito / remoção de tabela). Posso propor um plano seguro e reversível ou aguardo autorização explícita para seguir com os riscos detalhados.”

---

## TRECHO CURTO PARA COLAR NO INÍCIO DE CADA CONVERSA COM O COPILOT CHAT

```
REGRAS RÁPIDAS (OBRIGATÓRIAS):
- MCP FIRST: use sempre MCP; proibido usar CLIs sem autorização.
- NUNCA mude layout fora do que foi pedido. Responsividade obrigatória.
- Jamais apagar/renomear tabelas/colunas/dados sem pedido explícito + rollback.
- Código nível SÊNIOR: limpo, testado, seguro e performático.
- Escopo mínimo, diffs pequenos, sem regressões.
Qualquer violação: interrompa e peça autorização. Erros amadores = reprovação.
```