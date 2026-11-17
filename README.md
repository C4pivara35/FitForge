# FitForge — Microfrontend

SPA em React e Webpack Module Federation. O shell carrega dois microfrontends em tempo de execução: **Treinos** e **Progresso**.

- O painel consome `GET /api/bff/dashboard`.
- O CRUD envia as operações ao Gateway. A tela confirma gravações após a resposta da API.
- Em nuvem, o shell pede a credencial de demonstração do Gateway, mantida em memória da aba.
- Sem `FITFORGE_API_URL`, a execução local funciona como demonstração e usa o armazenamento do navegador. O workflow de publicação exige uma URL HTTPS.

## Rodar

Com Node.js 22 ou mais recente:

```powershell
npm ci
$env:FITFORGE_API_URL = "http://localhost:8080"
$env:FITFORGE_REQUIRE_AUTH = "true"
npm run dev
```

Acesse `http://localhost:5000` com o Gateway iniciado. Use a mesma configuração de autenticação no Gateway e no frontend. Em um terminal sem essas duas variáveis, rode `npm run check` para testes unitários, regras de arquitetura e integração do build federado.

## Azure

Em GitHub Actions, defina a variável pública `FITFORGE_API_URL` com o Gateway HTTPS e o segredo `AZURE_STORAGE_CONNECTION_STRING`. Configure `CORS_ORIGINS` com a origem exata do site estático no Gateway.

Integrantes em [GRUPO.md](GRUPO.md).
