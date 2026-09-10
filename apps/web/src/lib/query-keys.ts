export const queryKeys = {
  branches: (companyId: string) => ['shell', 'branches', companyId] as const,
  activeBranch: (companyId: string, branchId: string) =>
    ['shell', 'active-branch', companyId, branchId] as const,
};
