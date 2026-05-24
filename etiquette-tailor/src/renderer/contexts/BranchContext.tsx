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

export function BranchProvider({
  children,
  defaultBranchId,
  sessionRole,
}: {
  children: React.ReactNode;
  defaultBranchId: number;
  sessionRole: string;
}) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const isAdmin = sessionRole === 'admin';

  const [activeBranchId, setActiveBranchIdState] = useState<number | undefined>(() => {
    if (!isAdmin) return defaultBranchId;
    const saved = localStorage.getItem('activeBranchId');
    if (saved === 'all') return undefined;
    if (saved) return parseInt(saved);
    return defaultBranchId;
  });

  useEffect(() => {
    window.electronAPI.branches
      .getAll()
      .then((data: Branch[]) => setBranches(data || []))
      .catch(() => {});
  }, []);

  const setActiveBranchId = useCallback((id: number | undefined) => {
    if (!isAdmin) return;
    setActiveBranchIdState(id);
    localStorage.setItem('activeBranchId', id === undefined ? 'all' : String(id));
  }, [isAdmin]);

  // Non-admin always locked to their session branch
  useEffect(() => {
    if (!isAdmin) {
      setActiveBranchIdState(defaultBranchId);
    }
  }, [isAdmin, defaultBranchId]);

  const activeBranch = branches.find((b) => b.id === activeBranchId);

  return (
    <BranchContext.Provider
      value={{ activeBranchId, branches, setActiveBranchId, activeBranch }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useActiveBranch() {
  return useContext(BranchContext);
}
