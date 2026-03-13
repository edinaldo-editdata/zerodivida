/**
 * SDK Firebase do Base44 (substitui o mock localStorage)
 * 
 * Este arquivo mantém a mesma interface do SDK original do Base44 (createClient),
 * mas usa Firebase Firestore como backend real.
 * 
 * A API é idêntica ao mock localStorage — list, create, update, delete, get —
 * para que NENHUM código de página/componente precise ser alterado.
 * 
 * Entidades são mapeadas para collections do Firestore com o mesmo nome.
 */

import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';

// ============================================================
// Criador de Entity CRUD com Firestore
// ============================================================
function createEntityCRUD(entityName) {
  const colRef = collection(db, entityName);

  return {
    /**
     * Lista todos os documentos da collection.
     */
    async list(orderByField) {
      let q;

      if (orderByField) {
        const desc = orderByField.startsWith('-');
        const field = desc ? orderByField.slice(1) : orderByField;
        try {
          q = query(colRef, orderBy(field, desc ? 'desc' : 'asc'));
        } catch {
          q = colRef;
        }
      } else {
        q = colRef;
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    /**
     * Assina mudanças em tempo real na collection.
     * @param {string} orderByField - Campo para ordenação.
     * @param {function} callback - Função chamada a cada mudança.
     * @returns {function} Função para cancelar a assinatura (unsubscribe).
     */
    subscribe(orderByField, callback) {
      let q;
      if (orderByField) {
        const desc = orderByField.startsWith('-');
        const field = desc ? orderByField.slice(1) : orderByField;
        try {
          q = query(colRef, orderBy(field, desc ? 'desc' : 'asc'));
        } catch {
          q = colRef;
        }
      } else {
        q = colRef;
      }

      return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(items);
      }, (error) => {
        console.error(`Error subscribing to ${entityName}:`, error);
      });
    },

    /**
     * Cria um novo documento.
     */
    async create(data) {
      const now = new Date().toISOString();
      const docData = {
        ...data,
        created_date: now,
        updated_date: now,
      };
      const docRef = await addDoc(colRef, docData);
      return { id: docRef.id, ...docData };
    },

    /**
     * Atualiza um documento existente.
     */
    async update(id, data) {
      const docRef = doc(db, entityName, id);
      const updateData = {
        ...data,
        updated_date: new Date().toISOString(),
      };
      delete updateData.id;
      await updateDoc(docRef, updateData);
      return { id, ...updateData };
    },

    /**
     * Deleta um documento.
     */
    async delete(id) {
      const docRef = doc(db, entityName, id);
      await deleteDoc(docRef);
      return { success: true };
    },

    /**
     * Busca um documento por ID.
     */
    async get(id) {
      const docRef = doc(db, entityName, id);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        throw new Error(`${entityName} com id ${id} não encontrado`);
      }
      return { id: snap.id, ...snap.data() };
    },
  };
}

// ============================================================
// Mock do Auth (mantido — pode ser substituído por Firebase Auth)
// ============================================================
const mockAuth = {
  async me() {
    return {
      id: 'local-dev-user',
      email: 'dev@local.com',
      name: 'Usuário Local',
      role: 'admin',
    };
  },
  logout(redirectUrl) {
    console.log('[Firebase SDK] Logout chamado. Redirect:', redirectUrl);
  },
  redirectToLogin(redirectUrl) {
    console.log('[Firebase SDK] Redirect to login chamado. Redirect:', redirectUrl);
  },
};

// ============================================================
// Mock do appLogs (mantido)
// ============================================================
const mockAppLogs = {
  async logUserInApp(pageName) {
    console.log(`[Firebase SDK] Navegação registrada: ${pageName}`);
  },
};

// ============================================================
// createClient - Função principal do SDK
// ============================================================
/**
 * ⚠️ IMPORTANTE: Atualize a lista de entidades conforme seu projeto!
 * Verifique na pasta entities/ e nos imports de src/pages/*.jsx
 */
export function createClient(config) {
  console.log('[Firebase SDK] Cliente criado com Firestore como backend');

  return {
    entities: {
      // Adicione aqui TODAS as entidades do seu projeto
      // Cada entidade vira uma collection no Firestore
      Debt: createEntityCRUD('Debt'),
      Income: createEntityCRUD('Income'),
      Payment: createEntityCRUD('Payment'),
    },
    auth: mockAuth,
    appLogs: mockAppLogs,
  };
}

// ============================================================
// Mock do createAxiosClient (usado no AuthContext)
// ============================================================
export function createAxiosClient(config) {
  return {
    async get(url) {
      console.log(`[Firebase SDK] GET ${url}`);
      return {
        id: config?.headers?.['X-App-Id'] || 'firebase-app',
        public_settings: {
          app_name: 'ZeroDivida - Firebase',
          require_auth: false,
        },
      };
    },
    async post(url, data) {
      console.log(`[Firebase SDK] POST ${url}`, data);
      return { success: true };
    },
  };
}
