/**
 * Configuração do Firebase
 * 
 * ⚠️ IMPORTANTE: Substitua os valores abaixo pelas suas credenciais do Firebase.
 * Acesse: https://console.firebase.google.com/ → Seu Projeto → Configurações → Geral
 * 
 * Para obter as credenciais:
 * 1. Vá ao Firebase Console
 * 2. Clique na engrenagem (⚙️) → Configurações do projeto
 * 3. Role até "Seus apps" → selecione o app Web (ou crie um)
 * 4. Copie o objeto firebaseConfig
 */
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
