# Cherry Admin

React + TypeScript operations console for Cherry.

## Local development

```bash
cp .env.example .env.local
npm install
npm run dev
```

The Firebase user must have the `admin: true` custom claim. The API base URL should point to the backend API, for example `http://localhost:8080/api` or the deployed Cloud Run URL ending in `/api`.

## Deployment

The GitHub Actions workflows deploy the static app to Cloud Run:

- `deploy-dev.yml` runs from `develop` or manually and uses the `cherry-mvp` Firebase/API settings.
- `deploy-prod.yml` runs from `main` or manually and uses the `cherry-prod-d513e` Firebase/API settings.

Live services:

- Dev: https://cherry-admin-401854471349.europe-west2.run.app
- Prod: https://cherry-admin-166746898861.europe-west2.run.app

The Artifact Registry repository named `cherry-admin` must exist in each project.

## API Documentation

- [Dev Swagger UI](https://cherry-backend-401854471349.europe-west2.run.app/api-docs)
- [Production Swagger UI](https://cherry-backend-166746898861.europe-west2.run.app/api-docs)
