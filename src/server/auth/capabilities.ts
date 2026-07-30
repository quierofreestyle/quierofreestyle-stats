export const ADMIN_CAPABILITIES = [
  "SUBJECT_MANAGE",
  "EVENT_MANAGE",
  "EVENT_PUBLISH",
  "BADGE_MANAGE",
  "BADGE_RECALCULATE",
  "CLAIM_REVIEW",
  "SUBMISSION_REVIEW",
  "USER_MANAGE",
  "AUDIT_READ",
] as const;

export function hasAnyCapability(
  permissions: Iterable<string>,
  required: readonly string[],
): boolean {
  const granted = new Set(permissions);
  return required.some((permission) => granted.has(permission));
}
