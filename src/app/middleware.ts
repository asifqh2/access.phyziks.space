import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Simple password protection
  const authHeader = request.headers.get('authorization');
  
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!authHeader || authHeader !== 'Basic ' + btoa('admin:yourpassword')) {
      return new NextResponse('Authentication required', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="Admin Area"' }
      });
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};