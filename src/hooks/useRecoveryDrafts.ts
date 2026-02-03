import { useState, useEffect, useCallback } from "react";

export interface DraftClientRecovery {
  clientId: string;
  clientName: string;
  phone: string;
  currentBalance: number;
  recoveryAmount: string;
  isCollected: boolean; // Mark as collected in field
}

export interface RecoveryDraft {
  id: string;
  city: string;
  date: string; // ISO string
  notes: string;
  clients: DraftClientRecovery[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "recovery_drafts";

export function useRecoveryDrafts() {
  const [drafts, setDrafts] = useState<RecoveryDraft[]>([]);

  // Load drafts from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setDrafts(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error loading recovery drafts:", error);
    }
  }, []);

  // Save drafts to localStorage whenever they change
  const saveDraftsToStorage = useCallback((newDrafts: RecoveryDraft[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newDrafts));
      setDrafts(newDrafts);
    } catch (error) {
      console.error("Error saving recovery drafts:", error);
    }
  }, []);

  const saveDraft = useCallback((draft: Omit<RecoveryDraft, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString();
    
    // Check if draft for this city/date already exists
    const existingIndex = drafts.findIndex(
      (d) => d.city === draft.city && d.date.split("T")[0] === draft.date.split("T")[0]
    );

    let newDrafts: RecoveryDraft[];
    
    if (existingIndex >= 0) {
      // Update existing draft
      newDrafts = [...drafts];
      newDrafts[existingIndex] = {
        ...newDrafts[existingIndex],
        ...draft,
        updatedAt: now,
      };
    } else {
      // Create new draft
      const newDraft: RecoveryDraft = {
        ...draft,
        id: `draft_${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      };
      newDrafts = [...drafts, newDraft];
    }

    saveDraftsToStorage(newDrafts);
    return newDrafts.find(
      (d) => d.city === draft.city && d.date.split("T")[0] === draft.date.split("T")[0]
    );
  }, [drafts, saveDraftsToStorage]);

  const updateDraft = useCallback((draftId: string, updates: Partial<RecoveryDraft>) => {
    const newDrafts = drafts.map((d) =>
      d.id === draftId
        ? { ...d, ...updates, updatedAt: new Date().toISOString() }
        : d
    );
    saveDraftsToStorage(newDrafts);
  }, [drafts, saveDraftsToStorage]);

  const deleteDraft = useCallback((draftId: string) => {
    const newDrafts = drafts.filter((d) => d.id !== draftId);
    saveDraftsToStorage(newDrafts);
  }, [drafts, saveDraftsToStorage]);

  const getDraft = useCallback((draftId: string) => {
    return drafts.find((d) => d.id === draftId);
  }, [drafts]);

  const getDraftForCityDate = useCallback((city: string, date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return drafts.find(
      (d) => d.city === city && d.date.split("T")[0] === dateStr
    );
  }, [drafts]);

  // Mark a client as collected in a draft
  const markClientCollected = useCallback((draftId: string, clientId: string, isCollected: boolean) => {
    const draft = drafts.find((d) => d.id === draftId);
    if (!draft) return;

    const updatedClients = draft.clients.map((c) =>
      c.clientId === clientId ? { ...c, isCollected } : c
    );

    updateDraft(draftId, { clients: updatedClients });
  }, [drafts, updateDraft]);

  // Update a client's recovery amount in a draft
  const updateClientAmount = useCallback((draftId: string, clientId: string, amount: string) => {
    const draft = drafts.find((d) => d.id === draftId);
    if (!draft) return;

    const updatedClients = draft.clients.map((c) =>
      c.clientId === clientId ? { ...c, recoveryAmount: amount } : c
    );

    updateDraft(draftId, { clients: updatedClients });
  }, [drafts, updateDraft]);

  return {
    drafts,
    saveDraft,
    updateDraft,
    deleteDraft,
    getDraft,
    getDraftForCityDate,
    markClientCollected,
    updateClientAmount,
  };
}
