---
description: Como integrar Firebase Firestore como banco de dados em projetos Base44 migrados para desenvolvimento local
---

# Integrar Firebase Firestore como Banco de Dados

Este workflow substitui o backend localStorage (mock) por um banco de dados real usando **Firebase Firestore**. Mantém a mesma interface do SDK Base44 para que **nenhum código de página/componente precise ser alterado**.

## Pré-requisitos
- Projeto Base44 já migrado para local (ver workflow `/migrar-base44`)
- Conta Google com acesso ao [Firebase Console](https://console.firebase.google.com/)
- Node.js v18+ instalado

## Visão Geral da Arquitetura

```
Antes (localStorage):
  Páginas → base44Client.js → base44-sdk.js (mock) → localStorage

Depois (Firebase):
  Páginas → base44Client.js → firebase-sdk.js → Firestore (nuvem)
```

A chave é que `firebase-sdk.js` exporta a **mesma interface** `createClient()` com as mesmas operações CRUD (`list`, `create`, `update`, `delete`, `get`), então todas as páginas e componentes continuam funcionando sem alteração.

---

## Passos

### 1. Criar o Projeto no Firebase Console

1. Acesse [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Clique em **"Adicionar projeto"** (ou "Add project")
3. Dê um nome ao projeto (ex: `zerodivida`, `meu-app`)
4. Desative o Google Analytics (opcional, não é necessário)
5. Clique em **Criar projeto**

### 2. Criar o App Web no Firebase

1. No painel do projeto, clique no ícone **Web** (`</>`)
2. Registre o app com um nickname (ex: `meu-app-web`)
3. **NÃO** marque "Firebase Hosting" (não é necessário agora)
4. Clique em **Registrar app**
5. Copie o objeto `firebaseConfig` que aparece — você vai precisar dele no passo 5

### 3. Configurar o Firestore Database

1. No menu lateral, clique em **Firestore Database** (ou "Cloud Firestore")
2. Clique em **"Criar banco de dados"**
3. Selecione **modo de teste** (test mode) para começar — permite leitura/escrita sem autenticação por 30 dias
4. Escolha a **localização** mais próxima (ex: `southamerica-east1` para Brasil)
5. Clique em **Ativar**

> ⚠️ **IMPORTANTE sobre Segurança**: O modo de teste permite acesso público por 30 dias. Para produção, configure **regras de segurança** adequadas no console do Firestore.

### 4. Instalar o Firebase no projeto
// turbo
```powershell
npm install firebase
```

### 5. Criar o arquivo de configuração do Firebase

Crie o arquivo `src/lib/firebase.js`:

```javascript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "SUA_API_KEY_AQUI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "SEU_PROJETO.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "SEU_PROJETO_ID",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "SEU_PROJETO.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
```

### 6. Criar o arquivo `.env` com as credenciais

Copie `.env.example` para `.env` e preencha com os valores do `firebaseConfig` obtido no passo 2:

```env
VITE_FIREBASE_API_KEY=AIzaSyD...
VITE_FIREBASE_AUTH_DOMAIN=meu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=meu-projeto
VITE_FIREBASE_STORAGE_BUCKET=meu-projeto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abc123def456
```

> **Nota**: Variáveis Vite devem ter o prefixo `VITE_` para ficarem acessíveis via `import.meta.env`.

### 7. Criar o SDK Firebase (substitui o mock localStorage)

Crie o arquivo `src/mocks/firebase-sdk.js`.

Este arquivo **deve manter a mesma interface** do `base44-sdk.js` (mock localStorage):
- Exporta `createClient(config)` que retorna `{ entities, auth, appLogs }`
- Cada entidade tem os métodos: `list(orderBy)`, `subscribe(orderBy, callback)`, `create(data)`, `update(id, data)`, `delete(id)`, `get(id)`
- Exporta `createAxiosClient(config)`

A diferença é que ao invés de usar `localStorage`, usa **Firestore**:
- Cada entidade é mapeada para uma **collection** no Firestore
- `list()` usa `getDocs` com `query` e `orderBy`
- `subscribe()` usa `onSnapshot` para atualizações em tempo real
- `create()` usa `addDoc`
- `update()` usa `updateDoc`
- `delete()` usa `deleteDoc`
- `get()` usa `getDoc`

**Imports necessários do Firebase:**
```javascript
import { db } from '@/lib/firebase';
import {
  collection, doc, getDocs, getDoc,
  addDoc, updateDoc, deleteDoc,
  query, orderBy, onSnapshot
} from 'firebase/firestore';
```

**Exemplo do método subscribe no SDK:**
```javascript
subscribe(orderByField, callback) {
  let q;
  // ... lógica de ordenação (mesma do list) ...
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(items);
  });
}
```

**⚠️ IMPORTANTE:** Atualize a lista de entidades dentro de `createClient()` conforme o projeto:
```javascript
entities: {
  // Busque por "base44.entities." nos arquivos src/pages/*.jsx
  Debt: createEntityCRUD('Debt'),
  Income: createEntityCRUD('Income'),
  Payment: createEntityCRUD('Payment'),
}
```

### 8. Alterar os imports para usar o Firebase SDK

**Arquivo: `src/api/base44Client.js`**
```diff
- import { createClient } from '@/mocks/base44-sdk';
+ import { createClient } from '@/mocks/firebase-sdk';
```

**Arquivo: `src/lib/AuthContext.jsx`**
```diff
- import { createAxiosClient } from '@/mocks/base44-sdk';
+ import { createAxiosClient } from '@/mocks/firebase-sdk';
```

### 9. (Opcional) Adicionar `vite/client` aos types do jsconfig.json

Para evitar erros de lint sobre `import.meta.env`:
```diff
- "types": []
+ "types": ["vite/client"]
```

### 10. Reiniciar o servidor de desenvolvimento

Após criar/alterar o `.env`, é necessário reiniciar o Vite:

```powershell
# Pare o servidor atual (Ctrl+C) e reinicie
npm run dev
```

### 11. Habilitar Atualizações em Tempo Real (Opcional, mas Recomendado)

Para que o app reflita mudanças feitas diretamente no Firebase Console ou por outros usuários instantaneamente, use um hook de sincronização.

1. Crie o hook `src/hooks/useFirebaseRealtime.js`:

```javascript
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useFirebaseRealtime(entityName, queryKey, orderByField) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const entity = base44.entities[entityName];
    if (!entity || !entity.subscribe) return;

    // Assina mudanças no Firestore
    const unsubscribe = entity.subscribe(orderByField, (data) => {
      // Atualiza o cache do React Query em tempo real
      queryClient.setQueryData(queryKey, data);
    });

    return () => unsubscribe();
  }, [entityName, JSON.stringify(queryKey), orderByField, queryClient]);
}
```

2. Aplique o hook nas páginas que usam `useQuery`:

```javascript
// Exemplo em src/pages/Dashboard.jsx
import { useFirebaseRealtime } from "@/hooks/useFirebaseRealtime";

export default function Dashboard() {
  // Ativa o Realtime para Dívidas e Pagamentos
  useFirebaseRealtime("Debt", ["debts"], "-created_date");
  useFirebaseRealtime("Payment", ["payments"], "-payment_date");

  // O useQuery continuará funcionando normalmente, mas os dados agora 
  // serão atualizados "por fora" pelo hook sempre que o banco mudar.
  const { data: debts = [] } = useQuery({ queryKey: ["debts"], ... });
  // ...
}
```

---

### 12. Verificar a integração

1. Abra a aplicação no navegador (http://localhost:5173/)
2. Abra o DevTools → Console e verifique a mensagem: `[Firebase SDK] Cliente criado com Firestore como backend`
3. **Teste o CRUD:**
   - Crie um novo registro (ex: nova dívida)
   - Verifique se aparece no **Firebase Console → Firestore → Data**
   - Edite o registro
   - Delete o registro
4. Verifique se não há erros de permissão no console

---

## Criação de Índices no Firestore

O Firestore cria índices automaticamente para queries simples. Se você usar `orderBy` em campos que não existem em todos os documentos, pode receber erros no console com um **link direto** para criar o índice necessário. Basta clicar no link.

---

## Migração de Dados do localStorage para Firebase

Se você já tem dados no localStorage do mock anterior e quer migrá-los:

1. No DevTools → Console, exporte os dados:
```javascript
['Debt', 'Income', 'Payment'].forEach(entity => {
  const data = localStorage.getItem('base44_local_' + entity);
  if (data) console.log(entity + ':', data);
});
```

2. Copie os JSONs e importe manualmente no Firebase Console → Firestore

---

## Como Identificar as Entidades do Projeto

Para saber quais entidades adicionar ao `createClient()`:

```powershell
# Buscar todas as referências a entidades
Select-String -Path "src/**/*.jsx","src/**/*.js" -Pattern "base44.entities\." | ForEach-Object { $_.Line } | Sort-Object -Unique
```

---

## Regras de Segurança (Produção)

Para produção, substitua as regras de teste no Firebase Console por regras adequadas:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Exemplo: apenas usuários autenticados podem ler/escrever
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## Troubleshooting

### Erro: `FirebaseError: Missing or insufficient permissions`
**Causa:** As regras de segurança do Firestore estão bloqueando o acesso.
**Solução:** Verifique se está em modo de teste (development) ou configure regras adequadas.

### Erro: `FirebaseError: The query requires an index`
**Causa:** A query usa `orderBy` em um campo que precisa de índice composto.
**Solução:** O erro inclui um link direto para criar o índice no Firebase Console. Clique nele.

### Dados não aparecem no app mas estão no Firestore
**Causa:** O nome da collection no Firestore pode não coincidir com o nome da entidade.
**Solução:** Verifique se o nome dentro de `createEntityCRUD('NomeDaEntidade')` é exatamente o mesmo nome da collection no Firestore (case-sensitive).

### Variáveis de ambiente não carregam
**Causa:** O Vite só lê o `.env` na inicialização.
**Solução:** Reinicie o servidor de desenvolvimento (`npm run dev`) após alterar o `.env`.

### Erro: `import.meta.env is undefined`
**Causa:** As variáveis de ambiente não têm o prefixo `VITE_`.
**Solução:** Todas as variáveis acessíveis no frontend devem começar com `VITE_`.

---

## Checklist

- [ ] Projeto Firebase criado no console
- [ ] App Web registrado no Firebase
- [ ] Firestore Database criado (modo de teste)
- [ ] `firebase` instalado via npm
- [ ] `src/lib/firebase.js` criado com configuração
- [ ] `.env` criado com credenciais reais
- [ ] `.env.example` criado como template
- [ ] `.env` adicionado ao `.gitignore`
- [ ] `src/mocks/firebase-sdk.js` criado com todas as entidades e suporte a `subscribe`
- [ ] `src/hooks/useFirebaseRealtime.js` criado para suporte a tempo real
- [ ] Hook de Realtime aplicado nas páginas principais (Dashboard, Dívidas, etc.)
- [ ] `src/api/base44Client.js` atualizado (import do firebase-sdk)
- [ ] `src/lib/AuthContext.jsx` atualizado (import do firebase-sdk)
- [ ] Servidor reiniciado
- [ ] CRUD testado no app e verificado no Firebase Console
- [ ] Sincronização em tempo real (Realtime) verificada entre App e Firebase Console
