function normalizedAdminEmails() {
  return (process.env.CLUB_ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isClubAdminEmail(email: string | null | undefined) {
  if (!email) {
    return false;
  }

  const normalized = email.trim().toLowerCase();
  const admins = normalizedAdminEmails();
  return admins.includes(normalized);
}
