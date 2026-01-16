import { useEffect, useRef, useState, useCallback } from 'react';
import type { SubmitClipRequest } from '../types/submission';
import type { Tag } from '../types/tag';

const DRAFT_STORAGE_KEY = 'submission_draft';
// Allow configuration via environment variable for testing
const DRAFT_AUTOSAVE_INTERVAL = 
    typeof window !== 'undefined' && (window as any).__DRAFT_AUTOSAVE_INTERVAL__ 
        ? (window as any).__DRAFT_AUTOSAVE_INTERVAL__ 
        : 30000; // 30 seconds by default

export interface SubmissionDraft {
    formData: SubmitClipRequest;
    selectedTags: Tag[];
    lastSaved: number;
}

export function useSubmissionDraft() {
    const [hasDraft, setHasDraft] = useState(false);
    const [lastSaved, setLastSaved] = useState<number | null>(null);
    const autoSaveTimerRef = useRef<number | null>(null);

    // Load draft from localStorage on mount
    const loadDraft = useCallback((): SubmissionDraft | null => {
        try {
            const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
            if (stored) {
                const draft: SubmissionDraft = JSON.parse(stored);
                setHasDraft(true);
                setLastSaved(draft.lastSaved);
                return draft;
            }
        } catch (error) {
            console.error('Failed to load draft:', error);
        }
        return null;
    }, []);

    // Save draft to localStorage
    const saveDraft = useCallback((formData: SubmitClipRequest, selectedTags: Tag[]) => {
        try {
            const draft: SubmissionDraft = {
                formData,
                selectedTags,
                lastSaved: Date.now(),
            };
            localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
            setHasDraft(true);
            setLastSaved(draft.lastSaved);
        } catch (error) {
            console.error('Failed to save draft:', error);
        }
    }, []);

    // Clear draft from localStorage
    const clearDraft = useCallback(() => {
        try {
            localStorage.removeItem(DRAFT_STORAGE_KEY);
            setHasDraft(false);
            setLastSaved(null);
        } catch (error) {
            console.error('Failed to clear draft:', error);
        }
    }, []);

    // Check if form has meaningful content to save
    const hasContent = useCallback((formData: SubmitClipRequest, selectedTags: Tag[]): boolean => {
        return Boolean(
            formData.clip_url ||
            formData.custom_title ||
            formData.submission_reason ||
            formData.broadcaster_name_override ||
            selectedTags.length > 0
        );
    }, []);

    // Setup auto-save
    const startAutoSave = useCallback((formData: SubmitClipRequest, selectedTags: Tag[]) => {
        // Clear existing timer
        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
        }

        // Only auto-save if there's content
        if (hasContent(formData, selectedTags)) {
            autoSaveTimerRef.current = setTimeout(() => {
                saveDraft(formData, selectedTags);
            }, DRAFT_AUTOSAVE_INTERVAL);
        }
    }, [hasContent, saveDraft]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }
        };
    }, []);

    return {
        hasDraft,
        lastSaved,
        loadDraft,
        saveDraft,
        clearDraft,
        startAutoSave,
        hasContent,
    };
}
