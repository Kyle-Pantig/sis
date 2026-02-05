import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
    const session = request.cookies.get('session')?.value
    const { pathname } = request.nextUrl

    // Protected routes: redirect to login if no session
    if (!session && pathname.startsWith('/dashboard')) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // Auth routes: redirect to dashboard if session exists
    if (session && pathname === '/login') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return NextResponse.next()
}

export default proxy;

// See "Matching Paths" below to learn more
export const config = {
    matcher: ['/dashboard/:path*', '/login'],
}
