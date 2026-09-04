'use client';
import { useQuery } from '@tanstack/react-query';
import { StatusBadge } from '@vendo/ui';
import type { HealthResponse } from '@vendo/types';
import { healthResponseSchema } from '@vendo/validation';
async function getHealth(): Promise<HealthResponse> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
  const response = await fetch(`${apiUrl}/health`);
  if (!response.ok) throw new Error('API health request failed');
  return healthResponseSchema.parse(await response.json());
}
export function ApiHealth() {
  const health = useQuery({ queryKey: ['api-health'], queryFn: getHealth });
  if (health.isPending) return <StatusBadge tone="warning">Checking API</StatusBadge>;
  if (health.isError) return <StatusBadge tone="warning">API unavailable</StatusBadge>;
  return <StatusBadge tone="success">API connected</StatusBadge>;
}
