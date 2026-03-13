---
description: Como migrar um projeto Base44 (versão free) para desenvolvimento local no Windows
---

# Migrar Projeto Base44 para Desenvolvimento Local

Este workflow converte um app copiado manualmente do Base44 para funcionar localmente sem depender do backend da plataforma.

## Pré-requisitos
- Node.js v18+ instalado
- Código fonte do projeto já copiado manualmente do Base44

## Passos

### 1. Analisar a estrutura do projeto
- Verificar a estrutura de pastas e arquivos
- Identificar as **entidades** usadas no projeto buscando por `base44.entities.` nos arquivos `src/pages/*.jsx`
- Listar quais componentes ShadCN UI são importados em `src/components/ui/`

### 2. Criar o Mock do SDK Base44
Criar o arquivo `src/mocks/base44-sdk.js` com:
- Funções CRUD (list, create, update, delete, get) usando **localStorage** como banco de dados
- Mock de autenticação (retorna usuário local fake)
- Mock de appLogs (apenas console.log)
- **IMPORTANTE:** Incluir todas as entidades identificadas no passo 1 dentro do `createClient()`
- Exportar `createClient` e `createAxiosClient`

Referência completa do mock está em `INSTRUCOES_BASE44_LOCAL.md` na raiz do projeto.

### 3. Alterar imports do SDK
- Em `src/api/base44Client.js`: trocar `import { createClient } from '@base44/sdk'` por `import { createClient } from '@/mocks/base44-sdk'`
- Em `src/lib/AuthContext.jsx`: trocar `import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client'` por `import { createAxiosClient } from '@/mocks/base44-sdk'`

### 4. Atualizar `vite.config.js`
- Remover o import e uso do `@base44/vite-plugin`
- Adicionar o alias `@` manualmente apontando para `./src`:
```javascript
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### 5. Limpar `package.json`
- Remover `@base44/sdk` das dependencies
- Remover `@base44/vite-plugin` das dependencies

### 6. Instalar componentes ShadCN UI (se pasta `src/components/ui/` estiver vazia)
// turbo
```powershell
npx shadcn@latest add --all
```

### 7. Criar `public/manifest.json` (se não existir)
```json
{
  "name": "App Local",
  "short_name": "App",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0B0F19",
  "theme_color": "#10B981",
  "icons": []
}
```

### 8. Instalar dependências
// turbo
```powershell
npm install
```

### 9. Rodar o servidor de desenvolvimento
```powershell
npm run dev
```

### 10. Verificar no navegador
- Abrir http://localhost:5173/
- Verificar se não há erros no console
- Testar navegação entre páginas
- Testar CRUD (criar, listar, editar, deletar)

## Troubleshooting
- Se houver erro `Cannot read properties of undefined` em algum componente, provavelmente o conteúdo foi colado errado ao copiar manualmente do Base44. Verificar se as props batem com o uso.
- Se o `@` alias não funcionar, garantir que o `vite.config.js` tem o resolve.alias configurado.
- Warnings do React Router sobre future flags são informativos e podem ser ignorados.
