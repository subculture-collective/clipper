import { useSearchParams } from 'react-router-dom';
import { useCallback } from 'react';
/**
 * Custom hook for managing URL search parameters
 * Provides type-safe utilities for reading and updating URL params
 */
export function useUrlParams() {
    const [searchParams, setSearchParams] = useSearchParams();
    const getParam = useCallback((key) => {
        return searchParams.get(key);
    }, [searchParams]);
    const setParam = useCallback((key, value) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set(key, value);
        setSearchParams(newParams);
    }, [searchParams, setSearchParams]);
    const deleteParam = useCallback((key) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete(key);
        setSearchParams(newParams);
    }, [searchParams, setSearchParams]);
    const setMultipleParams = useCallback((params) => {
        const newParams = new URLSearchParams(searchParams);
        Object.entries(params).forEach(([key, value]) => {
            newParams.set(key, value);
        });
        setSearchParams(newParams);
    }, [searchParams, setSearchParams]);
    return {
        searchParams,
        getParam,
        setParam,
        deleteParam,
        setMultipleParams,
    };
}
