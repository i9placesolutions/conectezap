# ConecteZap - Plataforma de gerenciamento de WhatsApp

ConecteZap é uma plataforma web para gerenciamento de mensagens e instâncias do WhatsApp, permitindo atendimento multicanal, campanhas de marketing e muito mais.

## ⚠️ IMPORTANTE: Modo de Demonstração ⚠️

Este projeto está configurado em **MODO DE DEMONSTRAÇÃO** com dados simulados. Não há conexão real com o WhatsApp ou com qualquer banco de dados externo. Todas as credenciais anteriores foram removidas.

### Login de demonstração
- **Email**: qualquer email
- **Senha**: senha123

## 🚀 Recursos

- Gerenciamento de múltiplas instâncias do WhatsApp
- Chat individual e multicanal
- Campanhas e envio em massa
- Gerenciamento de clientes
- Relatórios e estatísticas
- Painel administrativo completo

## 📋 Pré-requisitos

- Node.js (18.x ou superior)
- npm ou yarn

## 🔧 Instalação

1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/conectezap.git
cd conectezap
```

2. Instale as dependências
```bash
npm install
# ou
yarn install
```

3. Execute o projeto em modo de desenvolvimento
```bash
npm run dev
# ou
yarn dev
```

4. Acesse o projeto em http://localhost:5173

## 🛠️ Construído com

- [React](https://reactjs.org/) - Biblioteca JavaScript para interfaces
- [TypeScript](https://www.typescriptlang.org/) - Superset tipado de JavaScript
- [Vite](https://vitejs.dev/) - Build tool e servidor de desenvolvimento
- [Tailwind CSS](https://tailwindcss.com/) - Framework CSS utilitário
- [React Router](https://reactrouter.com/) - Navegação e roteamento
- [Lucide React](https://lucide.dev/) - Ícones

## ✅ Para produção

Para usar este aplicativo em produção, você precisará:

1. Implementar um backend real para autenticação e armazenamento de dados
2. Configurar uma API real de integração com o WhatsApp (como WA-JS, Baileys, etc.)
3. Configurar variáveis de ambiente adequadas
4. Implementar medidas de segurança

## 📝 Observações

- Esta versão usa armazenamento em memória e todas as alterações são perdidas ao recarregar a página
- As credenciais são simuladas e qualquer usuário pode entrar com a senha padrão "senha123"
- Os chats e mensagens são pré-definidos para demonstração

## 📄 Licença

Este projeto está sob a licença MIT - veja o arquivo LICENSE para detalhes

---
Desenvolvido com ❤️ por Rafael Mendes 