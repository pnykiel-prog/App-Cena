// Next.js 16: middleware → proxy. Proxy runs in Node.js runtime (NOT edge),
// so we can import the full auth module with Prisma/bcrypt.
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";

const PANEL_PATHS = ["/dashboard", "/leady", "/wizyty", "/konfiguracja"];
const ADMIN_PREFIX = "/admin";
const ADMIN_LOGIN = "/admin-logowanie";
const TENANT_LOGIN = "/logowanie";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPanel = PANEL_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const isAdmin =
    pathname === ADMIN_PREFIX ||
    (pathname.startsWith(`${ADMIN_PREFIX}/`) && !pathname.startsWith(ADMIN_LOGIN));
  const isTenantLogin = pathname === TENANT_LOGIN;
  const isAdminLogin = pathname === ADMIN_LOGIN;

  if (!isPanel && !isAdmin && !isTenantLogin && !isAdminLogin) {
    return NextResponse.next();
  }

  const session = await auth();
  const user = session?.user;

  if (isPanel) {
    if (!user || user.userType !== "tenant") {
      const url = req.nextUrl.clone();
      url.pathname = TENANT_LOGIN;
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
  }

  if (isAdmin) {
    if (!user || user.userType !== "admin") {
      const url = req.nextUrl.clone();
      url.pathname = ADMIN_LOGIN;
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
  }

  if (isTenantLogin && user?.userType === "tenant") {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }
  if (isAdminLogin && user?.userType === "admin") {
    const url = req.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.jpg$|.*\\.jpeg$|w/|q/|embed/|api/widget).*)",
  ],
};
