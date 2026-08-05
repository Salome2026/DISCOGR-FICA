// docusign-esign ships no type declarations and the versioned @types
// package doesn't reliably match this installed version — lib/docusign.ts
// already verified every field/method it touches against the actual
// installed source, so this stays a bare ambient declaration rather than
// pulling in a mismatched .d.ts package.
declare module "docusign-esign";
