import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATH_PREFIXES = [
  "/login",
  "/r/",
  "/api/events/din-next",
  "/api/events/inbound",
  "/api/jobs/publish-due",
  "/_next",
  "/favicon",
];

export function isPublicPath(pathname: string) {
  if (pathname === "/") return false;
  return PUBLIC_PATH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p),
  );
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without Supabase config, allow local SQLite prototype browsing but stamp a header
  if (!url || !anon) {
    if (!isPublicPath(request.nextUrl.pathname) && !request.nextUrl.pathname.startsWith("/api/")) {
      // Panel routes: show setup page instead of hard-failing middleware
      if (request.nextUrl.pathname !== "/setup") {
        const setup = request.nextUrl.clone();
        setup.pathname = "/setup";
        setup.searchParams.set("next", request.nextUrl.pathname);
        return NextResponse.redirect(setup);
      }
    }
    return response;
  }

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (!user && !isPublicPath(path) && path !== "/setup") {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("next", path);
    return NextResponse.redirect(login);
  }

  return response;
}
