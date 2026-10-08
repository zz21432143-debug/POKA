import { verifyPassword } from "@/lib/password";

export function canRevealPrivatePost(opts: {
  isPrivate: boolean;
  authorId: string | null | undefined;
  viewerId: string | null | undefined;
  isAdmin?: boolean;
  unlocked?: boolean;
}) {
  if (!opts.isPrivate) return true;
  if (opts.isAdmin) return true;
  if (opts.authorId && opts.viewerId && opts.authorId === opts.viewerId) return true;
  return Boolean(opts.unlocked);
}

export function unlockPasswordOk(submitted: string, storedHash: string | null | undefined) {
  const password = submitted.trim();
  if (password.length < 4) return false;
  return verifyPassword(password, storedHash);
}
