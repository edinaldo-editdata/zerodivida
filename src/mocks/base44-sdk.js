/**
 * Mock local do @base44/sdk
 * 
 * Este arquivo substitui o SDK do Base44 para desenvolvimento local.
 * Usa localStorage como banco de dados para persistir dados entre sessões.
 * 
 * Entidades suportadas: Debt, Income, Payment
 */

// ============================================================
// Utilitário de storage com localStorage
// ============================================================
const STORAGE_PREFIX = 'base44_local_';

function getStorageKey(entityName) {
  return `${STORAGE_PREFIX}${entityName}`;
}

function loadEntities(entityName) {
  try {
    const data = localStorage.getItem(getStorageKey(entityName));
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveEntities(entityName, entities) {
  localStorage.setItem(getStorageKey(entityName), JSON.stringify(entities));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// ============================================================
// Criador de Entity CRUD
// ============================================================
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
      
      // Simula delay de rede
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
      
      items[index] = {
        ...items[index],
        ...data,
        id, // Garante que o id não seja sobrescrito
        updated_date: new Date().toISOString(),
      };
      saveEntities(entityName, items);
      await new Promise(resolve => setTimeout(resolve, 100));
      return items[index];
    },

    async delete(id) {
      const items = loadEntities(entityName);
      const filtered = items.filter(item => item.id !== id);
      if (filtered.length === items.length) {
        throw new Error(`${entityName} com id ${id} não encontrado`);
      }
      saveEntities(entityName, filtered);
      await new Promise(resolve => setTimeout(resolve, 100));
      return { success: true };
    },

    async get(id) {
      const items = loadEntities(entityName);
      const item = items.find(i => i.id === id);
      if (!item) throw new Error(`${entityName} com id ${id} não encontrado`);
      await new Promise(resolve => setTimeout(resolve, 50));
      return item;
    },
  };
}

// ============================================================
// Mock do Auth
// ============================================================
const mockAuth = {
  async me() {
    // Retorna um usuário mock para desenvolvimento local
    return {
      id: 'local-dev-user',
      email: 'dev@local.com',
      name: 'Usuário Local',
      role: 'admin',
    };
  },
  logout(redirectUrl) {
    console.log('[Base44 Mock] Logout chamado. Redirect:', redirectUrl);
    // Nenhuma ação real no mock local
  },
  redirectToLogin(redirectUrl) {
    console.log('[Base44 Mock] Redirect to login chamado. Redirect:', redirectUrl);
    // Nenhuma ação real no mock local
  },
};

// ============================================================
// Mock do appLogs
// ============================================================
const mockAppLogs = {
  async logUserInApp(pageName) {
    console.log(`[Base44 Mock] Navegação registrada: ${pageName}`);
  },
};

// ============================================================
// createClient - Função principal do SDK
// ============================================================
export function createClient(config) {
  console.log('[Base44 Mock] Cliente criado com config:', config);
  
  return {
    entities: {
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
      console.log(`[Base44 Mock] GET ${url}`);
      // Retorna settings públicos mock
      return {
        id: config?.headers?.['X-App-Id'] || 'local-app',
        public_settings: {
          app_name: 'ZeroDivida - Local Dev',
          require_auth: false,
        },
      };
    },
    async post(url, data) {
      console.log(`[Base44 Mock] POST ${url}`, data);
      return { success: true };
    },
  };
}
