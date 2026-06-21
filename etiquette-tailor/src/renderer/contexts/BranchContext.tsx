import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface Branch {
  id: number;
  name_ar: string;
  name_en: string;
  prefix: string;
}

interface BranchContextValue {
  activeBranchId: number;
  branches: Branch[];
  activeBranch: Branch | undefined;
}

const BranchContext = createContext<BranchContextValue>({
  activeBranchId: 1,
  branches: [],
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

  // Strict branch isolation: EVERY user (including admin) is locked to their session branch
  // No "all branches" view - no cross-branch visibility
  const [activeBranchId] = useState<number>(() => {
    return defaultBranchId;
  });

  useEffect(() => {
    window.electronAPI.branches
      .getAll()
      .then((data: Branch[]) => setBranches(data || []))
      .catch(() => {});
  }, []);

  const activeBranch = branches.find((b) => b.id === activeBranchId);

  return (
    <BranchContext.Provider
      value={{ activeBranchId, branches, activeBranch }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useActiveBranch() {
  return useContext(BranchContext);
}
