import { useCallback, useEffect, useRef, useState } from 'react';
import type { Loan, Summary } from '@miniledger/contracts';
import type { ApiClient } from '../lib/api';
import { errorMessage } from '../lib/format';

export function useLedger(api: ApiClient) {
  const [entries, setEntries] = useState<Loan[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const loadMoreLock = useRef(false);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const [page, totals] = await Promise.all([api.list(), api.summary()]);
      if (current !== generation.current) return;
      setEntries(page.entries);
      setNextOffset(page.nextOffset);
      setSummary(totals);
    } catch (err) {
      if (current === generation.current) setError(errorMessage(err));
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [api]);
  useEffect(() => {
    void refresh();
    return () => {
      generation.current++;
    };
  }, [refresh]);
  async function loadMore() {
    if (nextOffset === null || loading || loadMoreLock.current) return;
    loadMoreLock.current = true;
    setLoadingMore(true);
    setError(null);
    const current = generation.current;
    try {
      const page = await api.list(nextOffset);
      if (current !== generation.current) return;
      setEntries((previous) => [
        ...previous,
        ...page.entries.filter((entry) => !previous.some((item) => item.id === entry.id)),
      ]);
      setNextOffset(page.nextOffset);
    } catch (err) {
      if (current === generation.current) setError(errorMessage(err));
    } finally {
      loadMoreLock.current = false;
      setLoadingMore(false);
    }
  }
  return { entries, summary, loading, loadingMore, error, nextOffset, refresh, loadMore };
}
