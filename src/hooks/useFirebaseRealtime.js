import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Hook para sincronizar o Firestore com o cache do React Query em tempo real.
 * 
 * @param {string} entityName - Nome da entidade (ex: 'Debt', 'Income', 'Payment')
 * @param {Array} queryKey - A chave do React Query para atualizar (ex: ['debts'])
 * @param {string} orderByField - Campo de ordenação (ex: '-created_date')
 */
export function useFirebaseRealtime(entityName, queryKey, orderByField) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const entity = base44.entities[entityName];
    if (!entity || !entity.subscribe) {
      console.warn(`[Realtime] Entidade ${entityName} não encontrada ou não suporta subscribe.`);
      return;
    }

    // Cria a assinatura realtime no Firestore
    const unsubscribe = entity.subscribe(orderByField, (data) => {
      console.log(`[Hook Realtime] Atualizando QueryKey: ${JSON.stringify(queryKey)}`, data);
      // Atualiza o cache do React Query sem disparar novos fetches
      queryClient.setQueryData(queryKey, data);
    });

    return () => {
      console.log(`[Hook Realtime] Cancelando assinatura: ${entityName}`);
      unsubscribe();
    };
  }, [entityName, JSON.stringify(queryKey), orderByField, queryClient]);
}
