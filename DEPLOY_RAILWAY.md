# Deploy no Railway

## Serviços do projeto

Crie três serviços no mesmo projeto Railway:

1. `imobiliaria-backend` conectado ao repositório `jandersonvb/imobiliaria-backend`.
2. `imobiliaria-frontend` conectado ao repositório `jandersonvb/imobiliaria-frontend`.
3. Um banco PostgreSQL criado pelo Railway.

## Variáveis do backend

Configure no serviço do backend:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
NODE_ENV=production
JWT_SECRET=gere-uma-chave-longa-e-aleatoria
FRONTEND_URL=https://DOMINIO-DO-FRONTEND
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Não defina `PORT`; o Railway fornece essa variável automaticamente.

O arquivo `railway.json` executa:

- build: `npm run build`
- pre-deploy: `npm run prisma:deploy`
- start: `npm run start:railway`
- health check: `/api/health`

## Variáveis do frontend

Configure no serviço do frontend:

```env
NEXT_PUBLIC_API_URL=https://DOMINIO-DO-BACKEND/api
```

Depois de gerar o domínio público do frontend, atualize `FRONTEND_URL` no backend e faça um redeploy.

## Ordem sugerida

1. Criar PostgreSQL.
2. Criar e configurar backend.
3. Gerar domínio público do backend.
4. Criar frontend com `NEXT_PUBLIC_API_URL`.
5. Gerar domínio público do frontend.
6. Atualizar `FRONTEND_URL` no backend.
7. Testar `/api/health`, cadastro, login, criação de imobiliária e upload.

## Checklist antes de liberar o domínio

- gere `JWT_SECRET` aleatório com pelo menos 32 caracteres e nunca o reutilize em outro sistema;
- ative backups automáticos e retenção no PostgreSQL;
- configure alertas de indisponibilidade para `/api/health` e `/health`;
- confirme que `FRONTEND_URL` possui somente domínios HTTPS autorizados;
- limite o acesso administrativo ao projeto Railway e à conta Cloudinary;
- revise os logs após cada deploy e mantenha um procedimento de rollback para o commit anterior;
- publique termos de uso e política de privacidade antes de receber dados de clientes reais.

O backend interrompe a inicialização em produção quando banco, JWT, frontend ou Cloudinary não estiverem configurados corretamente.
