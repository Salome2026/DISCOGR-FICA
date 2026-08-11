// Moved to packages/shared/src/permissions.ts so both the web app and the
// Expo mobile app import the exact same role/permission logic. Re-exported
// from here unchanged so every existing "@/lib/permissions" import keeps
// working — no mass find-and-replace needed.
export * from "@discografica/shared/permissions";
