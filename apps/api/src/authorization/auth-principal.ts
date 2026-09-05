export interface AuthPrincipal {
  userId: string;
  companyId: string;
  sessionId: string;
  credentialVersion: number;
  email: string;
  firstName: string;
  lastName: string | null;
  permissions: ReadonlySet<string>;
  branchIds: readonly string[];
}
