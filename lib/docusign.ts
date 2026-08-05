import docusign from "docusign-esign";

// JWT Grant (server-to-server, no per-request login) — the right fit here
// since this only ever reads already-completed envelopes on demand from a
// button click, never sends anything new to sign. Requires one-time admin
// consent granted directly in DocuSign (see setup docs), not something this
// code can do on its own.
//
// DOCUSIGN_ENV controls which DocuSign environment we talk to:
//   "production" -> account.docusign.com / <region>.docusign.net
//   anything else (including unset) -> account-d.docusign.com / demo.docusign.net (sandbox)
const IS_PRODUCTION = process.env.DOCUSIGN_ENV === "production";
const OAUTH_HOST = IS_PRODUCTION ? "account.docusign.com" : "account-d.docusign.com";
const JWT_SCOPES = ["signature", "impersonation"];
const JWT_TTL_SECONDS = 3600;

export function docusignConfigured(): boolean {
  return !!(
    process.env.DOCUSIGN_INTEGRATION_KEY &&
    process.env.DOCUSIGN_USER_ID &&
    process.env.DOCUSIGN_ACCOUNT_ID &&
    process.env.DOCUSIGN_PRIVATE_KEY
  );
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta la variable de entorno ${name}.`);
  return v;
}

// A private key pasted into a Vercel env var commonly loses its real
// newlines (either flattened to literal "\n" or wrapped with escaped
// sequences) — normalize both cases so JWT signing doesn't fail on a
// technicality after everything else was configured correctly.
function normalizePrivateKey(raw: string): string {
  return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const integrationKey = requireEnv("DOCUSIGN_INTEGRATION_KEY");
  const userId = requireEnv("DOCUSIGN_USER_ID");
  const privateKey = normalizePrivateKey(requireEnv("DOCUSIGN_PRIVATE_KEY"));

  const authClient = new docusign.ApiClient();
  authClient.setOAuthBasePath(OAUTH_HOST);

  let results;
  try {
    results = await authClient.requestJWTUserToken(
      integrationKey,
      userId,
      JWT_SCOPES,
      Buffer.from(privateKey, "utf8"),
      JWT_TTL_SECONDS
    );
  } catch (err: unknown) {
    const body = (err as { response?: { body?: unknown } })?.response?.body;
    // The most common first-run failure: nobody has granted the one-time
    // consent yet. Surface that clearly instead of a generic OAuth error.
    if (body && JSON.stringify(body).includes("consent_required")) {
      throw new Error(
        "DocuSign pide consentimiento — todavía no se autorizó esta app. Abrí el link de consentimiento (ver documentación) con el mismo usuario del DOCUSIGN_USER_ID y aceptá."
      );
    }
    throw err;
  }

  const token = results.body.access_token as string;
  const expiresIn = Number(results.body.expires_in ?? JWT_TTL_SECONDS);
  cachedToken = { token, expiresAt: Date.now() + expiresIn * 1000 };
  return token;
}

type AccountInfo = { accountId: string; baseUri: string };

async function getScopedApiClient(): Promise<{ client: InstanceType<typeof docusign.ApiClient>; account: AccountInfo }> {
  const token = await getAccessToken();
  const configuredAccountId = requireEnv("DOCUSIGN_ACCOUNT_ID");

  const authClient = new docusign.ApiClient();
  authClient.setOAuthBasePath(OAUTH_HOST);
  const userInfo = await authClient.getUserInfo(token);

  const accounts = (userInfo.accounts ?? []) as { accountId: string; baseUri: string }[];
  const account = accounts.find((a) => a.accountId === configuredAccountId) ?? accounts[0];
  if (!account) {
    throw new Error("El usuario de DocuSign no tiene cuentas asociadas visibles vía la API.");
  }

  const client = new docusign.ApiClient();
  client.setBasePath(`${account.baseUri}/restapi`);
  client.setJWTToken(token);

  return { client, account: { accountId: account.accountId, baseUri: account.baseUri } };
}

export type DocusignSigner = {
  name: string;
  email: string;
  signedDateTime: string | null;
};

export type DocusignEnvelope = {
  envelopeId: string;
  subject: string;
  status: string;
  sentDateTime: string | null;
  completedDateTime: string | null;
  signers: DocusignSigner[];
};

// Only completed envelopes, newest first — this integration never sends
// anything to sign, only imports what's already finished. `fromDate` is
// required by DocuSign's API for any non-envelope-id-scoped status query;
// defaults to a wide net (five years back) since these are historical
// contracts being archived, not recent activity.
export async function listCompletedEnvelopes(fromDate?: string): Promise<DocusignEnvelope[]> {
  const { client, account } = await getScopedApiClient();
  const envelopesApi = new docusign.EnvelopesApi(client);

  const results = await envelopesApi.listStatusChanges(account.accountId, {
    status: "completed",
    fromDate: fromDate ?? new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString(),
    orderBy: "completed",
    order: "desc",
    count: "100",
  });

  const envelopes = (results.envelopes ?? []) as {
    envelopeId: string;
    emailSubject?: string;
    status: string;
    sentDateTime?: string;
    completedDateTime?: string;
  }[];

  // Signer detail isn't included in the status-change list itself — one
  // extra call per envelope to fetch who actually signed and when. Done in
  // small batches, not all at once: with a real account's worth of
  // envelopes (100+), firing every recipient lookup concurrently exhausts
  // the serverless function's outbound connections and starves unrelated
  // fetches in the same invocation (observed taking down the DB connection
  // used elsewhere in the same request).
  const BATCH_SIZE = 8;
  const out: DocusignEnvelope[] = [];
  for (let i = 0; i < envelopes.length; i += BATCH_SIZE) {
    const batch = envelopes.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (e): Promise<DocusignEnvelope> => {
        let signers: DocusignSigner[] = [];
        try {
          const recipients = await envelopesApi.listRecipients(account.accountId, e.envelopeId);
          signers = ((recipients.signers ?? []) as { name?: string; email?: string; signedDateTime?: string }[]).map(
            (s) => ({
              name: s.name ?? "",
              email: s.email ?? "",
              signedDateTime: s.signedDateTime ?? null,
            })
          );
        } catch {
          // If a single envelope's recipient lookup fails, still show the
          // envelope — Legal can fill in firmantes manually on import.
        }
        return {
          envelopeId: e.envelopeId,
          subject: e.emailSubject ?? "(sin asunto)",
          status: e.status,
          sentDateTime: e.sentDateTime ?? null,
          completedDateTime: e.completedDateTime ?? null,
          signers,
        };
      })
    );
    out.push(...batchResults);
  }
  return out;
}

// The "combined" pseudo-document ID returns every document in the envelope
// (contract + signing certificate) merged into a single PDF — the same
// artifact a human would download from the DocuSign UI.
export async function downloadCombinedDocument(envelopeId: string): Promise<Buffer> {
  const { client, account } = await getScopedApiClient();
  const envelopesApi = new docusign.EnvelopesApi(client);
  const doc = await envelopesApi.getDocument(account.accountId, envelopeId, "combined");
  return Buffer.isBuffer(doc) ? doc : Buffer.from(doc as unknown as ArrayBuffer);
}
