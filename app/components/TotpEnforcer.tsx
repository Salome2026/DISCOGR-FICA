"use client";

// 2FA WAS mandatory for the admin role (decided 2026-08-18, reverted
// 2026-08-26 at the account owner's explicit request — a device-trust
// cookie bug was making 2FA itself intermittently block real admin
// logins, and forcing enrollment here confined the account to /cuenta
// with no way out short of a direct DB update). Left in place, inert, in
// case 2FA should become mandatory again later — the /cuenta page still
// offers turning 2FA on/off per-account either way, this component only
// controlled whether skipping it was *allowed*.
export default function TotpEnforcer() {
  return null;
}
