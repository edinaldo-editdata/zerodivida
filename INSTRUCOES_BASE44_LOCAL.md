# 🚀 Guia Padrão: Rodar Projetos Base44 Localmente

> **Objetivo:** Instruções reutilizáveis para fazer qualquer app copiado do Base44 (versão free) funcionar localmente no Windows, sem depender do backend da plataforma.

---

## 📋 Pré-requisitos

- **Node.js** v18+ instalado ([download](https://nodejs.org/))
- **Git** (opcional, para versionamento)
- **Editor de código** (VS Code recomendado)

Para verificar:
```powershell
node -v    # Deve mostrar v18+ 
npm -v     # Deve mostrar v9+
```

---

## 📂 Estrutura Típica de um Projeto Base44

```
projeto-base44/
├── entities/           # Schemas das entidades (apenas referência)
├── src/
│   ├── api/
│   │   └── base44Client.js   # ⚠️ Importa @base44/sdk (precisa de mock)
│   ├── components/
│   │   └── ui/               # ⚠️ Componentes ShadCN UI (podem estar vazios)
│   ├── hooks/
│   ├── lib/
│   │   ├── AuthContext.jsx    # ⚠️ Importa @base44/sdk (precisa de mock)
│   │   ├── app-params.js
│   │   ├── NavigationTracker.jsx
│   │   ├── PageNotFound.jsx
│   │   ├── query-client.js
│   │   └── utils.js
│   ├── mocks/                 # 🆕 Criado por nós (mock do SDK)
│   ├── pages/
│   ├── utils/
│   ├── App.jsx
│   ├── Layout.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.js             # ⚠️ Usa @base44/vite-plugin (precisa ser removido)
├── tailwind.config.js
├── postcss.config.js
├── jsconfig.json
└── components.json
```

---

## 🔧 Passo a Passo

### Passo 1: Copiar os Arquivos do Base44

Na versão free do Base44, copie manualmente **todos** os arquivos da aplicação:
- Todos os arquivos `.jsx`, `.js`, `.ts`, `.css`
- Todos os arquivos de configuração raiz (`package.json`, `vite.config.js`, etc.)
- Mantenha a mesma estrutura de pastas

### Passo 2: Criar o Mock do SDK Base44

O Base44 usa um SDK proprietário (`@base44/sdk`) que faz CRUD de entidades e autenticação. Como não temos acesso ao backend, substituímos por um **mock que usa localStorage**.

Crie o arquivo `src/mocks/base44-sdk.js`:

```javascript
/**
 * Mock local do @base44/sdk
 * Usa localStorage como banco de dados para persistir dados entre sessões.
 */

const STORAGE_PREFIX = 'base44_local_';

function getStorageKey(entityName) {
  return `${STORAGE_PREFIX}${entityName}`;
}

function loadEntities(entityName) {
  try {
    const data = localStorage.getItem(getStorageKey(entityName));
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveEntities(entityName, entities) {
  localStorage.setItem(getStorageKey(entityName), JSON.stringify(entities));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function createEntityCRUD(entityName) {
  return {
    async list(orderBy) {
      let items = loadEntities(entityName);
      if (orderBy) {
        const desc = orderBy.startsWith('-');
        const field = desc ? orderBy.slice(1) : orderBy;
        items.sort((a, b) => {
          const valA = a[field] || '';
          const valB = b[field] || '';
          if (desc) return valA > valB ? -1 : valA < valB ? 1 : 0;
          return valA < valB ? -1 : valA > valB ? 1 : 0;
        });
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      return items;
    },
    async create(data) {
      const items = loadEntities(entityName);
      const newItem = {
        ...data,
        id: generateId(),
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
      };
      items.push(newItem);
      saveEntities(entityName, items);
      await new Promise(resolve => setTimeout(resolve, 100));
      return newItem;
    },
    async update(id, data) {
      const items = loadEntities(entityName);
      const index = items.findIndex(item => item.id === id);
      if (index === -1) throw new Error(`${entityName} com id ${id} não encontrado`);
      items[index] = { ...items[index], ...data, id, updated_date: new Date().toISOString() };
      saveEntities(entityName, items);
      await new Promise(resolve => setTimeout(resolve, 100));
      return items[index];
    },
    async delete(id) {
      const items = loadEntities(entityName);
      const filtered = items.filter(item => item.id !== id);
      if (filtered.length === items.length) throw new Error(`${entityName} com id ${id} não encontrado`);
      saveEntities(entityName, filtered);
      await new Promise(resolve => setTimeout(resolve, 100));
      return { success: true };
    },
    async get(id) {
      const items = loadEntities(entityName);
      const item = items.find(i => i.id === id);
      if (!item) throw new Error(`${entityName} com id ${id} não encontrado`);
      return item;
    },
  };
}

const mockAuth = {
  async me() {
    return { id: 'local-dev-user', email: 'dev@local.com', name: 'Usuário Local', role: 'admin' };
  },
  logout(redirectUrl) { console.log('[Mock] Logout:', redirectUrl); },
  redirectToLogin(redirectUrl) { console.log('[Mock] Login redirect:', redirectUrl); },
};

const mockAppLogs = {
  async logUserInApp(pageName) { console.log(`[Mock] Nav: ${pageName}`); },
};

// ⚠️ IMPORTANTE: Atualize a lista de entidades conforme seu projeto!
export function createClient(config) {
  return {
    entities: {
      // Adicione aqui TODAS as entidades do seu projeto
      // Verifique na pasta entities/ e nos imports dos arquivos em src/pages/
      Debt: createEntityCRUD('Debt'),
      Income: createEntityCRUD('Income'),
      Payment: createEntityCRUD('Payment'),
    },
    auth: mockAuth,
    appLogs: mockAppLogs,
  };
}

export function createAxiosClient(config) {
  return {
    async get(url) {
      return {
        id: config?.headers?.['X-App-Id'] || 'local-app',
        public_settings: { app_name: 'App Local', require_auth: false },
      };
    },
    async post(url, data) { return { success: true }; },
  };
}
```

> [!IMPORTANT]
> **Para cada novo projeto,** atualize a seção `entities` dentro de `createClient()` com os nomes das entidades usadas no seu app. Verifique nos arquivos `src/pages/*.jsx` quais entidades são utilizadas (ex: `base44.entities.NomeDaEntidade`).

### Passo 3: Alterar os Imports do SDK

**Arquivo: `src/api/base44Client.js`**  
Altere o import de `@base44/sdk` para o mock local:

```diff
- import { createClient } from '@base44/sdk';
+ import { createClient } from '@/mocks/base44-sdk';
```

**Arquivo: `src/lib/AuthContext.jsx`**  
Altere o import do `createAxiosClient`:

```diff
- import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';
+ import { createAxiosClient } from '@/mocks/base44-sdk';
```

### Passo 4: Atualizar o `vite.config.js`

Remova o plugin `@base44/vite-plugin` e configure o alias `@` manualmente:

```javascript
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### Passo 5: Remover Dependências do Base44 no `package.json`

Remova estas linhas da seção `dependencies`:

```diff
- "@base44/sdk": "^0.8.0",
- "@base44/vite-plugin": "^1.0.0",
```

### Passo 6: Instalar Componentes ShadCN UI (se ausentes)

A pasta `src/components/ui/` geralmente vem **vazia** ao copiar manualmente do Base44. A forma mais rápida e confiável de resolver é instalar **todos** os componentes de uma vez:

```powershell
# ✅ RECOMENDADO: Instala TODOS os componentes ShadCN UI de uma vez
npx shadcn@latest add --all
```

Este comando:
- Detecta automaticamente as configurações do projeto via `components.json`
- Cria todos os componentes na pasta `src/components/ui/`
- Instala dependências necessárias (Radix UI, etc.)
- Funciona tanto com JSX quanto TSX

> [!TIP]
> Se preferir instalar apenas componentes específicos, verifique quais são necessários:
> ```powershell
> Select-String -Path "src/**/*.jsx" -Pattern 'from "@/components/ui/' -AllMatches | ForEach-Object { $_.Line } | Sort-Object -Unique
> ```
> E instale individualmente:
> ```powershell
> npx shadcn@latest add button input label textarea select dialog badge switch
> ```

### Passo 7: Instalar Dependências e Rodar

```powershell
# Instalar todas as dependências
npm install

# Rodar o servidor de desenvolvimento
npm run dev
```

O app deve abrir em `http://localhost:5173/`

---

## 🐛 Problemas Comuns e Soluções

### Erro: `Module not found: @base44/sdk`
**Causa:** O import do SDK real ainda está no código.  
**Solução:** Verifique se todos os imports de `@base44/sdk` foram substituídos pelo mock:
```powershell
Select-String -Path "src/**/*.jsx","src/**/*.js" -Pattern "@base44" | ForEach-Object { $_.FileName + ":" + $_.LineNumber + " " + $_.Line }
```

### Erro: `Module not found: @base44/vite-plugin`
**Causa:** O `vite.config.js` ainda referencia o plugin.  
**Solução:** Substitua o `vite.config.js` conforme o Passo 4.

### Erro: `Cannot resolve '@/...'`
**Causa:** O alias `@` não está configurado (era feito pelo plugin Base44).  
**Solução:** Adicione o alias no `vite.config.js`:
```javascript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
},
```

### Pasta `src/components/ui/` vazia
**Causa:** Componentes ShadCN UI não foram copiados do Base44.  
**Solução:** Execute `npx shadcn@latest add --all` para instalar todos os componentes de uma vez (conforme Passo 6).

### Erro: `Cannot find module '@radix-ui/react-xxx'`
**Causa:** Dependências Radix UI não instaladas.  
**Solução:** `npm install` deve resolver, pois já estão no `package.json`.

### Erro no `manifest.json`
**Causa:** O `index.html` referencia `/manifest.json` que não existe localmente.  
**Solução:** Crie um `public/manifest.json` básico ou remova a linha do `index.html`:
```diff
- <link rel="manifest" href="/manifest.json" />
```

### Dados não persistem após fechar o navegador
**Causa:** O mock usa `localStorage` que persiste entre sessões.  
**Solução:** Se quiser limpar os dados, abra o DevTools > Application > Local Storage e limpe.

### Componentes com conteúdo duplicado/errado
**Causa:** Ao copiar manualmente do Base44, é comum colar o conteúdo de um componente dentro do arquivo de outro (ex: `ReportSummaryCards.jsx` com o conteúdo do `DebtPaymentTimeline.jsx`).  
**Solução:** Verifique erros como `Cannot read properties of undefined (reading 'filter')` — geralmente indica que as props esperadas pelo componente não correspondem ao código. Compare o que a página pai passa como props vs. o que o componente espera.

### React Router Future Flag Warnings
**Causa:** Avisos sobre `v7_startTransition` e `v7_relativeSplatPath`.  
**Solução:** São apenas avisos informativos e **não afetam a funcionalidade**. Podem ser ignorados ou silenciados adicionando flags no `<BrowserRouter>`:
```jsx
<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
```

### Console Log: `[Base44 Mock] Cliente criado com config: ...`
**Causa:** Logs informativos do nosso mock SDK.  
**Solução:** São esperados e podem ser ignorados. Para silenciá-los, remova os `console.log` do `src/mocks/base44-sdk.js`.

---

## 📝 Checklist para Novo Projeto Base44

- [ ] Copiar todos os arquivos fonte do Base44
- [ ] Criar `src/mocks/base44-sdk.js` com as entidades do projeto
- [ ] Alterar `src/api/base44Client.js` (import do mock)
- [ ] Alterar `src/lib/AuthContext.jsx` (import do createAxiosClient)
- [ ] Atualizar `vite.config.js` (remover @base44 plugin, adicionar alias @)
- [ ] Remover `@base44/sdk` e `@base44/vite-plugin` do `package.json`
- [ ] Instalar componentes ShadCN UI: `npx shadcn@latest add --all` (se pasta `ui/` vazia)
- [ ] `npm install`
- [ ] `npm run dev`
- [ ] Testar a aplicação no navegador

---

## 🔍 Como Identificar as Entidades do Projeto

Para descobrir quais entidades seu projeto usa ao adaptar o mock:

```powershell
# Buscar todas as referências a entidades
Select-String -Path "src/**/*.jsx","src/**/*.js" -Pattern "base44.entities\." | ForEach-Object { $_.Line } | Sort-Object -Unique
```

Exemplo de saída:
```
queryFn: () => base44.entities.Debt.list("-created_date"),
queryFn: () => base44.entities.Income.list("-date"),
mutationFn: (data) => base44.entities.Payment.create(data),
```

As entidades são: **Debt**, **Income**, **Payment** → adicione todas no mock.

---

## ✅ Resultado do Projeto ZeroDivida

**Status:** ✅ Funcionando localmente

![Screenshot do app funcionando](file:///C:/Users/EditData/.gemini/antigravity/brain/266739e1-5508-4664-b4d3-d1f69082ba4b/app_home_page_1773436900924.png)

**Modificações realizadas:**
1. ✅ Criado `src/mocks/base44-sdk.js` com mock de localStorage
2. ✅ Atualizado `src/api/base44Client.js` para usar mock
3. ✅ Atualizado `src/lib/AuthContext.jsx` para usar mock
4. ✅ Atualizado `vite.config.js` (removido plugin Base44, adicionado alias @)
5. ✅ Removidas dependências `@base44/sdk` e `@base44/vite-plugin`
6. ✅ Instalados componentes ShadCN UI via `npx shadcn@latest add --all`
7. ✅ `npm install` executado com sucesso
8. ✅ App rodando em `http://localhost:5173/`
