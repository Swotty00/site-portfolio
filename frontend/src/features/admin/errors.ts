import { ApiError } from '@/services/http'

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.isNetwork ? 'Could not reach the server.' : error.message
  return error instanceof Error ? error.message : 'Something went wrong.'
}
