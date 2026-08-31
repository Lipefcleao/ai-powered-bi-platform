import { useState, useEffect, useRef, useCallback } from 'react';
import { dashboardApi } from '../../../api/dashboardApi.js';

/**
 * Custom React Hook para execução de consultas aos Dashboards v2.
 * Gerencia loading, erros, paginação e cancelamento automático de requisições pendentes.
 */
export function useDashboardQuery(dashboardId, filters = {}, pagination = {}, view = 'compensated') {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const abortControllerRef = useRef(null);

  const fetchData = useCallback(async () => {
    // Cancela requisição pendente anterior caso os filtros tenham mudado rapidamente
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const result = await dashboardApi.queryDashboard({
        dashboardId,
        filters,
        pagination,
        view,
        signal: controller.signal
      });

      setData(result);
    } catch (err) {
      if (err.code !== 'REQUEST_CANCELED') {
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [dashboardId, JSON.stringify(filters), JSON.stringify(pagination), view]);

  useEffect(() => {
    fetchData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
}
