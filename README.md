# FitForge — Microfrontend

SPA React com Webpack Module Federation. O shell compõe os microfrontends Treinos e Progresso. A versão publicada consome o Gateway/BFF; não acessa diretamente os microsserviços.

**Integrantes:** Andryus Zolet, Nicolas Medeiros, Valentin Rojas e Leonardo Henrique.

## Acesso e repositórios

- [Frontend Azure](https://c4pivara35.z21.web.core.windows.net/).
- [Gateway/BFF](https://fitforge-gateway-hvaqcubhf8d0a2hc.chilecentral-01.azurewebsites.net).
- [Repositório Gateway](https://github.com/C4pivara35/FitForge-API_Gateway).
- [Repositório backend](https://github.com/C4pivara35/FitForge-Microservicos).

## Execução local

Node.js 22+ e npm. Com Gateway em 8080 e serviços em 8081/8082, execute na raiz deste repositório:

```powershell
npm ci
$env:FITFORGE_API_URL = "http://localhost:8080"
$env:FITFORGE_REQUIRE_AUTH = "true"
npm run dev
```

Acesse `http://localhost:5000`. Use as credenciais definidas no seu Gateway. Elas não são credenciais SQL ou da Azure. Sem API_URL, o modo de demonstração local usa armazenamento do navegador e não comprova a entrega em nuvem.

## Testes e build

Em um terminal sem as variáveis de build acima:

```powershell
npm ci
npm run check
```

Esse comando executa testes unitários/regras de arquitetura, build e três testes de federação. O teste de arquitetura confirma composição dos remotes, consumo do BFF e limites entre adaptadores.

## Configuração Azure

No GitHub: variável pública `FITFORGE_API_URL` com a URL HTTPS do Gateway e segredo `AZURE_STORAGE_CONNECTION_STRING` do Storage. No Gateway: `CORS_ORIGINS=https://c4pivara35.z21.web.core.windows.net`.

O workflow testa, compila com autenticação exigida e publica `dist` no contêiner `$web`. O Storage hospeda os arquivos estáticos; as operações de servidor passam pelo Gateway. Alterações apenas em README, GRUPO ou `docs/` não disparam deploy pelo workflow atualizado.

A Visão geral chama `/api/bff/dashboard`. CRUD usa `/api/treinos` e `/api/sessoes` no Gateway e só confirma gravação após resposta bem-sucedida da API.

## Documentação e entrega

- [Arc42 completa: 12 seções](docs/ARC42.md).
- [Checklist de validação e evidências](docs/VALIDACAO-ENTREGA.md).
- [Guia detalhado de Azure SQL, Service Bus e publicação](https://github.com/C4pivara35/FitForge-Microservicos/blob/main/docs/DEPLOY-AZURE.md).
- [Integrantes](GRUPO.md).

A arquitetura adotada é **Vertical Slice Architecture**, com separação interna de responsabilidades e dependências verificadas por testes. A Arc42 detalha a aplicação de SOLID e os limites do desenho. A conclusão de SQL/mensageria depende da configuração e das evidências na Azure; código e CI aprovados não comprovam essa ativação.

**Vídeo:** pendente de gravação/publicação não listada no YouTube. Inserir aqui o link após validar o fluxo em nuvem, com todos os integrantes falando e com câmera aberta.
