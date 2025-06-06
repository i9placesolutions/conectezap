import { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface EndpointProps {
  title: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  description: string;
  parameters?: {
    name: string;
    type: string;
    required: boolean;
    description: string;
  }[];
  requestExample?: string;
  responseExample?: string;
}

function Endpoint({ title, method, endpoint, description, parameters, requestExample, responseExample }: EndpointProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Código copiado para a área de transferência!');
    setTimeout(() => setCopied(false), 2000);
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-blue-100 text-blue-700';
      case 'POST': return 'bg-green-100 text-green-700';
      case 'PUT': return 'bg-amber-100 text-amber-700';
      case 'DELETE': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="mb-12 border rounded-lg overflow-hidden shadow-sm">
      <div className="p-4 bg-white border-b">
        <div className="flex items-center gap-3">
          <span className={`px-2 py-1 rounded text-xs font-bold ${getMethodColor(method)}`}>
            {method}
          </span>
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <p className="mt-2 text-gray-500">{description}</p>
        <div className="mt-2 p-2 bg-gray-50 rounded border font-mono text-sm flex items-center">
          {endpoint}
        </div>
      </div>

      {parameters && parameters.length > 0 && (
        <div className="p-4 bg-white border-t">
          <h4 className="text-sm font-semibold mb-2">Parâmetros</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Obrigatório</th>
                  <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {parameters.map((param, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 text-sm font-mono">{param.name}</td>
                    <td className="px-4 py-2 text-sm">{param.type}</td>
                    <td className="px-4 py-2 text-sm">{param.required ? 'Sim' : 'Não'}</td>
                    <td className="px-4 py-2 text-sm">{param.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {requestExample && (
        <div className="p-4 bg-white border-t">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-semibold">Exemplo de Requisição</h4>
            <button
              onClick={() => handleCopy(requestExample)}
              className="text-gray-500 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100"
              title="Copiar código"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto text-sm">
            <code>{requestExample}</code>
          </pre>
        </div>
      )}

      {responseExample && (
        <div className="p-4 bg-white border-t">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-semibold">Exemplo de Resposta</h4>
            <button
              onClick={() => handleCopy(responseExample)}
              className="text-gray-500 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100"
              title="Copiar código"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto text-sm">
            <code>{responseExample}</code>
          </pre>
        </div>
      )}
    </div>
  );
}

export function DocumentationPage() {
  const endpoints: EndpointProps[] = [
    {
      title: 'Enviar Mensagem de Texto',
      method: 'POST',
      endpoint: '/api/v2/send/text',
      description: 'Envia uma mensagem de texto simples para um contato.',
      parameters: [
        { name: 'token', type: 'string', required: true, description: 'Token de autenticação da API' },
        { name: 'number', type: 'string', required: true, description: 'Número do destinatário no formato internacional (ex: 5511999999999)' },
        { name: 'text', type: 'string', required: true, description: 'Texto da mensagem a ser enviada' },
        { name: 'delay', type: 'number', required: false, description: 'Atraso em segundos antes de enviar a mensagem' },
      ],
      requestExample: `fetch('https://api.uazapi.dev/api/v2/send/text', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer SEU_TOKEN_AQUI'
  },
  body: JSON.stringify({
    number: '5511999999999',
    text: 'Olá! Esta é uma mensagem de teste.',
    delay: 0
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Erro:', error));`,
      responseExample: `{
  "success": true,
  "messageId": "3EB0123456789ABCD",
  "status": "queued"
}`,
    },
    {
      title: 'Enviar Imagem',
      method: 'POST',
      endpoint: '/api/v2/send/image',
      description: 'Envia uma imagem para um contato, com texto opcional.',
      parameters: [
        { name: 'token', type: 'string', required: true, description: 'Token de autenticação da API' },
        { name: 'number', type: 'string', required: true, description: 'Número do destinatário no formato internacional (ex: 5511999999999)' },
        { name: 'image', type: 'string', required: true, description: 'URL da imagem' },
        { name: 'caption', type: 'string', required: false, description: 'Texto opcional para acompanhar a imagem' },
      ],
      requestExample: `fetch('https://api.uazapi.dev/api/v2/send/image', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer SEU_TOKEN_AQUI'
  },
  body: JSON.stringify({
    number: '5511999999999',
    image: 'https://exemplo.com/imagem.jpg',
    caption: 'Veja esta imagem incrível!'
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Erro:', error));`,
      responseExample: `{
  "success": true,
  "messageId": "3EB0123456789ABCD",
  "status": "queued"
}`,
    },
    {
      title: 'Obter Status da Instância',
      method: 'GET',
      endpoint: '/api/v2/instance/status',
      description: 'Verifica o status atual da instância do WhatsApp.',
      parameters: [
        { name: 'token', type: 'string', required: true, description: 'Token de autenticação da API' },
      ],
      requestExample: `fetch('https://api.uazapi.dev/api/v2/instance/status', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer SEU_TOKEN_AQUI'
  }
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Erro:', error));`,
      responseExample: `{
  "success": true,
  "status": "connected",
  "phone": "5511999999999",
  "name": "Meu WhatsApp",
  "batteryLevel": 87,
  "isCharging": true
}`,
    },
    {
      title: 'Enviar Mensagem de Áudio',
      method: 'POST',
      endpoint: '/api/v2/send/audio',
      description: 'Envia uma mensagem de áudio para um contato.',
      parameters: [
        { name: 'token', type: 'string', required: true, description: 'Token de autenticação da API' },
        { name: 'number', type: 'string', required: true, description: 'Número do destinatário no formato internacional (ex: 5511999999999)' },
        { name: 'audio', type: 'string', required: true, description: 'URL do áudio' },
        { name: 'ptt', type: 'boolean', required: false, description: 'Define se o áudio será enviado como mensagem de voz (true) ou como arquivo (false). Padrão: true' },
      ],
      requestExample: `fetch('https://api.uazapi.dev/api/v2/send/audio', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer SEU_TOKEN_AQUI'
  },
  body: JSON.stringify({
    number: '5511999999999',
    audio: 'https://exemplo.com/audio.mp3',
    ptt: true
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Erro:', error));`,
      responseExample: `{
  "success": true,
  "messageId": "3EB0123456789ABCD",
  "status": "queued"
}`,
    },
    {
      title: 'Enviar Botões',
      method: 'POST',
      endpoint: '/api/v2/send/buttons',
      description: 'Envia uma mensagem com botões interativos.',
      parameters: [
        { name: 'token', type: 'string', required: true, description: 'Token de autenticação da API' },
        { name: 'number', type: 'string', required: true, description: 'Número do destinatário no formato internacional (ex: 5511999999999)' },
        { name: 'title', type: 'string', required: true, description: 'Título da mensagem' },
        { name: 'text', type: 'string', required: true, description: 'Texto principal da mensagem' },
        { name: 'footer', type: 'string', required: false, description: 'Rodapé da mensagem' },
        { name: 'buttons', type: 'array', required: true, description: 'Array de botões (máximo 3)' },
      ],
      requestExample: `fetch('https://api.uazapi.dev/api/v2/send/buttons', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer SEU_TOKEN_AQUI'
  },
  body: JSON.stringify({
    number: '5511999999999',
    title: 'Promoção Exclusiva',
    text: 'Aproveite nossa oferta especial! 50% de desconto em todos os produtos.',
    footer: 'Válido por tempo limitado',
    buttons: [
      { id: 'btn1', text: 'Ver Produtos' },
      { id: 'btn2', text: 'Falar com Atendente' },
      { id: 'btn3', text: 'Mais Informações' }
    ]
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Erro:', error));`,
      responseExample: `{
  "success": true,
  "messageId": "3EB0123456789ABCD",
  "status": "queued"
}`,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Documentação da API UAZAPI</h1>
        <p className="text-lg text-gray-600 mb-2">
          Bem-vindo à documentação oficial da API UAZAPI para integração com WhatsApp.
        </p>
        <p className="text-gray-600 mb-4">
          Esta documentação fornece todas as informações necessárias para integrar seu sistema com a nossa API de WhatsApp.
        </p>
        
        <div className="flex items-center gap-4 mt-6">
          <a 
            href="https://uazapi.dev" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700"
          >
            <ExternalLink size={16} />
            Site Oficial UAZAPI
          </a>
          <a 
            href="https://github.com/uazapi/uazapi" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700"
          >
            <ExternalLink size={16} />
            GitHub
          </a>
          <a 
            href="https://www.postman.com/augustofcs/uazapi-v2/overview" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700"
          >
            <ExternalLink size={16} />
            Postman Collection
          </a>
        </div>
      </div>

      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-8">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-amber-800">
              Esta é uma versão simplificada da documentação para fins de demonstração. 
              Para a documentação completa e atualizada, visite o site oficial ou a coleção no Postman.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Autenticação</h2>
        <p className="mb-4">
          Todas as requisições para a API UAZAPI exigem autenticação. Você deve incluir seu token de acesso
          no cabeçalho de autorização de todas as requisições.
        </p>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto">
          <code>Authorization: Bearer SEU_TOKEN_AQUI</code>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Endpoints da API</h2>
        {endpoints.map((endpoint, index) => (
          <Endpoint key={index} {...endpoint} />
        ))}
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Webhooks</h2>
        <p className="mb-4">
          Configure webhooks para receber notificações em tempo real sobre eventos do WhatsApp,
          como mensagens recebidas, status de entrega e muito mais.
        </p>
        <div className="p-4 border rounded-lg bg-white shadow-sm">
          <h3 className="font-semibold mb-2">Configuração de Webhook</h3>
          <p className="text-gray-600 mb-4">
            Para configurar seu webhook, você precisa fornecer uma URL HTTPS válida que receberá 
            as notificações via POST.
          </p>
          <p className="mb-2 font-medium">Eventos disponíveis:</p>
          <ul className="list-disc pl-5 mb-4 text-gray-600">
            <li>message - Mensagens recebidas</li>
            <li>message.ack - Status de entrega e leitura</li>
            <li>group - Eventos de grupo</li>
            <li>status - Alterações no status da conexão</li>
          </ul>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Suporte</h2>
        <p className="mb-4">
          Se você tiver dúvidas ou precisar de ajuda, entre em contato com nossa equipe de suporte:
        </p>
        <ul className="list-disc pl-5 mb-4 text-gray-600">
          <li>Email: suporte@uazapi.dev</li>
          <li>WhatsApp: +55 11 99999-9999</li>
        </ul>
      </div>
    </div>
  );
}
