export function loginHref(next = "/") {
  const path = next.startsWith("/") ? next : "/";
  return `/login?next=${encodeURIComponent(path)}`;
}
