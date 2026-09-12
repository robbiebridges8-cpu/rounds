import { useCallback, useState } from 'react';

/**
 * Pull-to-refresh state that follows the pull, not the query. React Query
 * refetches quietly whenever a screen comes back into view; the spinner
 * should only show when someone actually pulled.
 */
export function usePull(run: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void run().finally(() => setRefreshing(false));
  }, [run]);
  return { refreshing, onRefresh };
}
