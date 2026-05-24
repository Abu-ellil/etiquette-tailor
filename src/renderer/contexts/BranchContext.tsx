import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface Branch {
  id: number;
  name_ar: string;
  name_en: string;
  prefix: string;
}

interface BranchContextValue {
  activeBranchId: number | undefined;
  branches: Branch[];
  setActiveBranchId: (id: number | undefined) => void;
  activeBranch: Branch | undefined;
}

const BranchContext = createContext<BranchContextValue>({
  activeBranchId: undefined,
  branches: [],
  setActiveBranchId: () => {},
  activeBranch: undefined,
});

export function useActiveBranch() {
  return useContext(BranchContext);
}

interface BranchProviderProps {
  sessionBranchId: number;
  sessionRole: string;
  children: React.ReactNode;
}

export function BranchProvider({ sessionBranchId, sessionRole, children }: BranchProviderProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranchId, setActiveBranchIdState] = useState<number | undefined>(() => {
    const saved = localStorage.getItem('activeBranchId');
    if (saved === 'all') return undefined;
    if (saved) return parseInt(saved);
    return sessionBranchId;
  });

  useEffect(() => {
    window.electronAPI.branches.getAll().then((data: Branch[]) => {
      setBranches(data || []);
    });
  }, []);

  const isAdmin = sessionRole === 'admin';

  const setActiveBranchId = useCallback((id: number | undefined) => {
    if (!isAdmin) return;
    setActiveBranchIdState(id);
    localStorage.setItem('activeBranchId', id === undefined ? 'all' : String(id));
  }, [isAdmin]);

  // For non-admin, always lock to session branch
  useEffect(() => {
    if (!isAdmin) {
      setActiveBranchIdState(sessionBranchId);
    }
  }, [isAdmin, sessionBranchId]);

  const activeBranch = branches.find((b) => b.id === activeBranchId);

  return (
    <BranchContext.Provider value={{ activeBranchId, branches, setActiveBranchId, activeBranch }}>
      {children}
    </BranchContext.Provider>
  );
}
