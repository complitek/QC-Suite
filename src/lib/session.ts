import { NextRequest } from 'next/server'
import { verifyToken, TokenPayload } from './auth'

export function getSession(req: NextRequest): TokenPayload | null {
  const token = req.cookies.get('auth_token')?.value
  if (!token) return null
  return verifyToken(token)
}
