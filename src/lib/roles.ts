export type StaffRole = "USER" | "ADMIN" | "MASTER";

export function roleFromFlags(opts: { isAdmin?: boolean; isMaster?: boolean; role?: string | null }): StaffRole {
  if (opts.role === "MASTER" || opts.isMaster) return "MASTER";
  if (opts.role === "ADMIN" || opts.isAdmin) return "ADMIN";
  return "USER";
}

export function flagsFromRole(role: StaffRole) {
  if (role === "MASTER") return { role, isAdmin: true, isMaster: true };
  if (role === "ADMIN") return { role, isAdmin: true, isMaster: false };
  return { role: "USER" as const, isAdmin: false, isMaster: false };
}

export function isStaff(opts: { isAdmin?: boolean; isMaster?: boolean; role?: string | null }) {
  const role = roleFromFlags(opts);
  return role === "ADMIN" || role === "MASTER";
}
