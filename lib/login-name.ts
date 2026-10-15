import { LOGIN_EMAIL_DOMAIN } from "@/lib/constants";

export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{1,39}$/;

// "budi" -> "budi@herblocx.internal". A full address is accepted as typed.
export function toLoginEmail(input: string) {
  const value = input.trim().toLowerCase();
  return value.includes("@") ? value : `${value}@${LOGIN_EMAIL_DOMAIN}`;
}

// "budi@herblocx.internal" -> "budi"
export function toUsername(email: string) {
  const suffix = `@${LOGIN_EMAIL_DOMAIN}`;
  return email.endsWith(suffix) ? email.slice(0, -suffix.length) : email;
}
