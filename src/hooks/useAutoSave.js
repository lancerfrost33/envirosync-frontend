import { useEffect, useRef, useState, useCallback } from 'react';
import { useProject } from '../context/ProjectContext';

/**
 * Custom hook for auto-saving project data with debouncing
 * @param {string} projectId - The project ID to save to
 * @param {Object} data - The data to auto-save
 * @param {number} delay - Debounce delay in milliseconds (default: 2000ms)
 * @returns {Object} { isSaving, lastSaved, saveNow }
 */
export const useAutoSave = (projectId, data, delay = 2000) => {
  const { updateData } = useProject(projectId);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const debounceTimer = useRef(null);
  const lastSavedDataRef = useRef(null);

  // Perform the actual save
  const performSave = useCallback(
    (dataToSave) => {
      if (!projectId || !dataToSave) return;

      // Only save if data has actually changed
      if (JSON.stringify(lastSavedDataRef.current) === JSON.stringify(dataToSave)) {
        return;
      }

      setIsSaving(true);

      // Perform save immediately without artificial delay
      try {
        updateData(dataToSave);
        lastSavedDataRef.current = JSON.stringify(dataToSave);
        setLastSaved(new Date());
      } catch (error) {
        console.error('Failed to auto-save:', error);
      } finally {
        setIsSaving(false);
      }
    },
    [projectId, updateData]
  );

  // Debounced save effect
  useEffect(() => {
    if (!projectId || !data) return;

    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer
    debounceTimer.current = setTimeout(() => {
      performSave(data);
    }, delay);

    // Cleanup
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [data, delay, projectId, performSave]);

  // Manual save function
  const saveNow = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    performSave(data);
  }, [data, performSave]);

  return {
    isSaving,
    lastSaved,
    saveNow,
  };
};

export default useAutoSave;
