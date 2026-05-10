import type { AppRole } from "@cafe/shared-types";

export function canManageCatalog(role?: AppRole | null) {
  return role === "admin" || role === "manager";
}

export function canManageTeam(role?: AppRole | null) {
  return role === "admin";
}

export function canViewSettings(role?: AppRole | null) {
  return role === "admin" || role === "manager";
}
