// One-time onboarding of 9 new/updated Project Manager profiles, modeled on
// santiago@mawzrecords.com's existing profile. Mirrors the exact SQL of
// lib/db/users.ts's createUser()/addRole(), lib/db/pmArtistAssignments.ts's
// upsertAssignment()/addCollaborator(), and lib/db/streamingProjects.ts's
// createStreamingProject() — see those files for the source of truth this
// script must stay in sync with (same caveat as scripts/seed-admin.mjs).
//
// Uso: node --env-file=.env.local scripts/seed-new-pms.mjs
import { sql } from "@vercel/postgres";
import bcrypt from "bcryptjs";

if (!process.env.POSTGRES_URL) {
  try {
    process.loadEnvFile(new URL("../.env.local", import.meta.url).pathname);
  } catch {}
}
if (!process.env.POSTGRES_URL) {
  console.error("Falta POSTGRES_URL.");
  process.exit(1);
}

const ACTOR = "salome@mawzrecords.com";
const SHARED_INITIAL_PASSWORD = "12341234";

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}
function pgArrayLiteral(items) {
  return `{${items.map((i) => `"${i.replace(/"/g, '\\"')}"`).join(",")}}`;
}
function slugify(name) {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "artista"
  );
}

async function recordAudit(entry) {
  await sql`
    INSERT INTO user_activity_log (email, action, detail, entity_type, entity_id, before_state, after_state)
    VALUES (
      ${entry.actorEmail}, ${entry.action}, ${entry.detail ?? null}, ${entry.entityType}, ${entry.entityId ?? null},
      ${entry.before !== undefined ? JSON.stringify(entry.before) : null}::jsonb,
      ${entry.after !== undefined ? JSON.stringify(entry.after) : null}::jsonb
    )
  `;
}

async function logActivity(email, action, detail) {
  await sql`INSERT INTO user_activity_log (email, action, detail) VALUES (${email}, ${action}, ${detail ?? null})`;
}

async function getUserRoles(email) {
  const { rows } = await sql`SELECT roles FROM app_users WHERE lower(email) = ${normalizeEmail(email)}`;
  return rows[0]?.roles ?? null; // null = account doesn't exist
}

// Mirrors createUser() in lib/db/users.ts.
async function createUser({ email, name, password, roles }) {
  const norm = normalizeEmail(email);
  const hash = await bcrypt.hash(password, 10);
  const rolesLit = pgArrayLiteral(roles);
  await sql`
    INSERT INTO app_users (email, name, password_hash, uses_shared_password, account_type, role, roles, created_by)
    VALUES (${norm}, ${name}, ${hash}, false, 'empresa', ${roles[0]}, ${rolesLit}::text[], ${ACTOR})
  `;
  await logActivity(ACTOR, "user_created", norm);
  console.log(`  cuenta nueva: ${norm} — roles ${roles.join(", ")}`);
}

// Mirrors addRole() in lib/db/users.ts.
async function addRole(email, role) {
  const norm = normalizeEmail(email);
  const before = await getUserRoles(norm);
  await sql`
    UPDATE app_users
    SET roles = CASE WHEN ${role} = ANY(roles) THEN roles ELSE array_append(roles, ${role}) END
    WHERE lower(email) = ${norm}
  `;
  const after = await getUserRoles(norm);
  await recordAudit({
    actorEmail: ACTOR,
    action: "module_added",
    entityType: "user",
    entityId: norm,
    detail: norm,
    before: { roles: before },
    after: { roles: after },
  });
  console.log(`  + rol '${role}' en cuenta existente ${norm} (roles ahora: ${after.join(", ")})`);
}

// Mirrors ensureArtistExists() in lib/db/artists.ts — needs the same
// staticRosterIndex() sello lookup, replicated here from SELLO_ROSTERS/
// CASERIO_ROSTER_NAMES so a freshly-created row gets the right sello exactly
// like the real function would.
const SELLO_ROSTER_IDS = {
  "lit-killah": "MAWZ Records",
  "gusty-dj": "MAWZ Records",
  "seven-kayne": "MAWZ Records",
  aneley: "Indyana Records",
  "baby-cue": "Indyana Records",
  "bianca-lif": "Indyana Records",
  "cande-gonzalez": "Indyana Records",
  "candu-dominguez": "Indyana Records",
  "dj-plaga": "Indyana Records",
  dormun: "Indyana Records",
  "facuu-dj": "Indyana Records",
  "g-sony": "Indyana Records",
  "laalo-dj": "Indyana Records",
  "lazer-k": "Indyana Records",
  "more-savan": "Indyana Records",
  "nicole-fernandez": "Indyana Records",
  "simo-viani": "Indyana Records",
  "sofi-b": "Indyana Records",
  toti: "Indyana Records",
  "virrshi-dj": "Indyana Records",
  "juana-vincent": "Indyana Records",
  tibbas: "Indyana Records",
  "matias-mareco": "Indyana Records",
  "sergio-ponce": "Indyana Records",
  "acit-x": "Indyana Records",
  "los-anormales": "Caserio Records",
  "joaquin-arce": "Caserio Records",
  "eze-remix": "Caserio Records",
  "juanma-girat": "Caserio Records",
};

async function ensureArtistExists(id, name) {
  const sello = SELLO_ROSTER_IDS[id] ?? null;
  await sql`
    INSERT INTO artists (id, name, aliases, sello, updated_by, updated_at)
    VALUES (${id}, ${name}, '[]'::jsonb, ${sello}, ${ACTOR}, now())
    ON CONFLICT (id) DO NOTHING
  `;
}

// Mirrors upsertAssignment() in lib/db/pmArtistAssignments.ts.
async function upsertAssignment({ artistId, artistName, pmEmail, skipArtistRegistry }) {
  if (!skipArtistRegistry) {
    await ensureArtistExists(artistId, artistName);
  }
  const { rows: prevRows } = await sql`SELECT pm_email FROM pm_roster_assignments WHERE artist_id = ${artistId}`;
  const previous = prevRows[0]?.pm_email ?? null;
  await sql`
    INSERT INTO pm_roster_assignments (artist_id, artist_name, pm_email, assigned_by, assigned_at)
    VALUES (${artistId}, ${artistName}, ${pmEmail}, ${ACTOR}, now())
    ON CONFLICT (artist_id) DO UPDATE SET
      artist_name = EXCLUDED.artist_name, pm_email = EXCLUDED.pm_email, assigned_by = EXCLUDED.assigned_by, assigned_at = now()
  `;
  await recordAudit({
    actorEmail: ACTOR,
    action: previous ? "pm_roster_assignment_transferred" : "pm_roster_assignment_created",
    entityType: "pm_roster_assignment",
    entityId: artistId,
    before: { pmEmail: previous },
    after: { pmEmail },
    detail: "Alta masiva de perfiles de PM",
  });
  console.log(`  asignado: ${artistName} (${artistId}) -> ${pmEmail}`);
}

async function addCollaborator(artistId, pmEmail) {
  await sql`
    INSERT INTO pm_roster_collaborators (artist_id, pm_email, added_by)
    VALUES (${artistId}, ${pmEmail}, ${ACTOR})
    ON CONFLICT (artist_id, pm_email) DO NOTHING
  `;
  await recordAudit({
    actorEmail: ACTOR,
    action: "pm_roster_collaborator_added",
    entityType: "pm_roster_assignment",
    entityId: artistId,
    after: { collaboratorEmail: pmEmail },
  });
  console.log(`  colaborador agregado: ${pmEmail} en ${artistId} (proyecto compartido)`);
}

async function ensureStreamingProject(name) {
  const { rows } = await sql`SELECT id FROM streaming_projects WHERE lower(name) = lower(${name})`;
  if (rows.length > 0) {
    console.log(`  streaming project "${name}" ya existía`);
    return;
  }
  const { rows: maxRows } = await sql`SELECT COALESCE(MAX(sort_order), -1) AS m FROM streaming_projects`;
  const nextOrder = Number(maxRows[0].m) + 1;
  await sql`
    INSERT INTO streaming_projects (name, active, sort_order, created_by)
    VALUES (${name}, true, ${nextOrder}, ${ACTOR})
  `;
  console.log(`  streaming project nuevo: "${name}"`);
}

// ---------------------------------------------------------------------------

const NEW_ACCOUNTS = [
  {
    email: "bruma@indyanarecords.com",
    name: "Walter Robales",
    artists: [
      ["nathali-torres", "Nathali Torres"],
      ["camira", "Camira"],
      ["pola-dj", "Pola DJ"],
      ["bautista-acevedo", "Bautista Acevedo"],
      ["belen-dipolito", "Belén Dipolito"],
      ["iara-cuevas", "Iara Cuevas"],
      ["cintia-ruiz", "Cintia Ruiz"],
    ],
  },
  {
    email: "pilarrfredes@gmail.com",
    name: "Pilar Fredes",
    artists: [
      ["los-anormales", "Los Anormales"],
      ["joaquin-arce", "Joaquín Arce"],
      ["eze-remix", "Eze Remix"],
      ["juanma-girat", "Juanma Girat"],
      ["juana-vincent", "Juana Vincent"],
    ],
  },
  {
    email: "santimareco22@gmail.com",
    name: "Santiago Mareco",
    artists: [
      ["lazer-k", "Lazer K"],
      ["more-savan", "More Savan"],
      // Facuu DJ is intentionally NOT here — it's a shared project, handled
      // separately below via addCollaborator (Santiago Damonte stays owner).
      ["eiron-rmx", "Eiron RMX"],
      ["joel-rmx", "Joel RMX"],
    ],
  },
  {
    email: "osvaldo@mawzrecords.com",
    name: "Osvaldo Ferraro",
    artists: [
      ["lit-killah", "Lit Killah"],
      ["seven-kayne", "Seven Kayne"],
    ],
  },
  {
    email: "davidhcarbone@gmail.com",
    name: "David Carbone",
    artists: [
      ["laalo-dj", "Laalo DJ"],
      ["simo-viani", "Simo Viani"],
      ["la-jefa", "La Jefa"],
      ["juano-dskt", "Juano DSKT"],
      ["n-more", "N More"],
      ["cande-gonzalez", "Cande González"],
      ["sele-masessa", "Sele Masessa"],
      ["nicole-fernandez", "Nicole Fernández"],
      ["alan", "Alan (productor)"],
    ],
  },
  {
    email: "streamings@indyanarecords.com",
    name: "Federico Roldán",
    units: [
      ["la-juntada-de-los-artistas", "La Juntada de los Artistas"],
      ["sin-guion", "Sin Guion"],
      ["para-el-mundo", "Para el Mundo"],
      ["la-casa-del-dj", "La Casa del DJ"],
      ["caserio", "Caserio"],
      ["rock-and-show", "Rock & Show"],
    ],
  },
  {
    email: "damianbravo2014@gmail.com",
    name: "Damián Bravo",
    artists: [
      ["aneley", "Aneley"],
      ["damian-bravo", "Damián Bravo"],
    ],
  },
];

// Existing accounts that only need the project_manager module added (and
// tourmanager, per "todos" for this batch) — never touch their password.
const EXISTING_ACCOUNTS = [
  {
    email: "lautaro@indyanarecords.com",
    name: "Lautaro Alarcón",
    addRoles: ["project_manager"], // already has tourmanager
    artists: [
      ["candu-dominguez", "Candu Domínguez"],
      ["yankee-dj", "Yankee DJ"],
      ["fak", "Fak"],
    ],
  },
  {
    email: "juan@mawzrecords.com",
    name: "Juan Manuel Fornasari",
    addRoles: ["project_manager", "tourmanager"], // currently only 'management'
    artists: [
      ["virrshi-dj", "Virrshi DJ"],
      ["toti", "Toti"],
      ["sofi-b", "Sofi B"],
    ],
  },
];

async function main() {
  // Defensive — normally created lazily by ensurePmArtistAssignmentsSchema()
  // on first API call, but this script runs outside the app.
  await sql`
    CREATE TABLE IF NOT EXISTS pm_roster_collaborators (
      artist_id TEXT NOT NULL,
      pm_email TEXT NOT NULL,
      added_by TEXT NOT NULL,
      added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (artist_id, pm_email)
    )
  `;

  console.log("=== Streaming project 'Caserio' ===");
  await ensureStreamingProject("Caserio");

  console.log("\n=== Cuentas nuevas ===");
  for (const acc of NEW_ACCOUNTS) {
    console.log(`\n${acc.name} <${acc.email}>`);
    await createUser({
      email: acc.email,
      name: acc.name,
      password: SHARED_INITIAL_PASSWORD,
      roles: ["project_manager", "tourmanager"],
    });
    for (const [id, name] of acc.artists ?? []) {
      await upsertAssignment({ artistId: id, artistName: name, pmEmail: normalizeEmail(acc.email) });
    }
    for (const [id, name] of acc.units ?? []) {
      await upsertAssignment({ artistId: id, artistName: name, pmEmail: normalizeEmail(acc.email), skipArtistRegistry: true });
    }
  }

  console.log("\n=== Cuentas existentes (solo se suma el módulo, sin tocar contraseña) ===");
  for (const acc of EXISTING_ACCOUNTS) {
    console.log(`\n${acc.name} <${acc.email}>`);
    for (const role of acc.addRoles) {
      await addRole(acc.email, role);
    }
    for (const [id, name] of acc.artists ?? []) {
      await upsertAssignment({ artistId: id, artistName: name, pmEmail: normalizeEmail(acc.email) });
    }
  }

  console.log("\n=== Facuu DJ — proyecto compartido ===");
  await addCollaborator("facuu-dj", normalizeEmail("santimareco22@gmail.com"));

  console.log("\n=== Sello Bruma Records — tag directo en artists.sello ===");
  const brumaIds = ["nathali-torres", "camira", "pola-dj", "bautista-acevedo", "belen-dipolito", "iara-cuevas", "cintia-ruiz"];
  for (const id of brumaIds) {
    await sql`UPDATE artists SET sello = 'Bruma Records', updated_by = ${ACTOR}, updated_at = now() WHERE id = ${id}`;
  }
  console.log(`  ${brumaIds.length} artistas tageados con sello "Bruma Records"`);

  console.log("\nListo.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => process.exit(0));
