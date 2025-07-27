import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Allow all API routes to bypass authentication
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Clone the request headers
    const requestHeaders = new Headers(request.headers)
    
    // Remove any authentication headers that might block the request
    requestHeaders.delete('x-vercel-protection-bypass')
    
    // Allow the request to proceed
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
}