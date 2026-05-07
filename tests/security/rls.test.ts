// RLS pen-test fixture.
//
// We forge two distinct authenticated identities by signing JWT-like claims
// directly into a Postgres session via `set_config('request.jwt.claims', ...)`.
// That's exactly how the SQL test suite (supabase/tests/*.sql) drives RLS,
// only here we drive it from Jest using `pg` so we can iterate over every
// domain table in a single fixture.
//
// Skipped automatically when no local Postgres is reachable; CI runs
// `make test-db` for the SQL suite, so this is a belt-and-braces check that
// catches accidental policy regressions during local development.

import { Client } from 'pg';

const DB_URL = process.env.LOCAL_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const TENANT_X = '00000000-1111-0000-0000-00000000aa01';
const TENANT_Y = '00000000-1111-0000-0000-00000000aa02';
const ADMIN_X = '00000000-2222-0000-0000-00000000aa01';
const ADMIN_Y = '00000000-2222-0000-0000-00000000aa02';
const SVC_X = '00000000-3333-0000-0000-00000000aa01';
const SVC_Y = '00000000-3333-0000-0000-00000000aa02';
const GUEST_X = '00000000-4444-0000-0000-00000000aa01';
const GUEST_Y = '00000000-4444-0000-0000-00000000aa02';
const APPT_X = '00000000-5555-0000-0000-00000000aa01';
const APPT_Y = '00000000-5555-0000-0000-00000000aa02';

let client: Client;
let dbAvailable = false;

beforeAll(async () => {
  client = new Client({ connectionString: DB_URL });
  try {
    await client.connect();
    dbAvailable = true;
  } catch {
    dbAvailable = false;
    return;
  }
  await teardown();
  await seed();
});

afterAll(async () => {
  if (!dbAvailable) return;
  await teardown();
  await client.end();
});

async function teardown() {
  if (!dbAvailable) return;
  await client.query(
    `delete from public.notifications where appointment_id in ($1::uuid, $2::uuid)`,
    [APPT_X, APPT_Y],
  );
  await client.query(
    `delete from public.appointment_events where appointment_id in ($1::uuid, $2::uuid)`,
    [APPT_X, APPT_Y],
  );
  await client.query(`delete from public.appointments where id in ($1::uuid, $2::uuid)`, [APPT_X, APPT_Y]);
  await client.query(`delete from public.guest_contacts where id in ($1::uuid, $2::uuid)`, [GUEST_X, GUEST_Y]);
  await client.query(`delete from public.services where id in ($1::uuid, $2::uuid)`, [SVC_X, SVC_Y]);
  await client.query(
    `delete from public.memberships where tenant_id in ($1::uuid, $2::uuid)`,
    [TENANT_X, TENANT_Y],
  );
  await client.query(`delete from public.tenants where id in ($1::uuid, $2::uuid)`, [TENANT_X, TENANT_Y]);
  await client.query(`delete from auth.users where id in ($1::uuid, $2::uuid)`, [ADMIN_X, ADMIN_Y]);
}

async function seed() {
  await client.query(
    `insert into auth.users (id, email) values
       ($1::uuid, 'rls-x@example.com'),
       ($2::uuid, 'rls-y@example.com')
     on conflict (id) do nothing`,
    [ADMIN_X, ADMIN_Y],
  );
  await client.query(
    `insert into public.tenants (id, slug, name, timezone, default_locale) values
       ($1::uuid, 'rls-x', 'RLS X', 'UTC', 'en'),
       ($2::uuid, 'rls-y', 'RLS Y', 'UTC', 'en')`,
    [TENANT_X, TENANT_Y],
  );
  await client.query(
    `insert into public.memberships (tenant_id, user_id, role) values
       ($1::uuid, $3::uuid, 'admin'),
       ($2::uuid, $4::uuid, 'admin')`,
    [TENANT_X, TENANT_Y, ADMIN_X, ADMIN_Y],
  );
  await client.query(
    `insert into public.services (id, tenant_id, name, duration_minutes, min_notice_min, max_advance_days) values
       ($1::uuid, $3::uuid, 'X-Svc', 30, 0, 3650),
       ($2::uuid, $4::uuid, 'Y-Svc', 30, 0, 3650)`,
    [SVC_X, SVC_Y, TENANT_X, TENANT_Y],
  );
  await client.query(
    `insert into public.guest_contacts (id, tenant_id, name, email) values
       ($1::uuid, $3::uuid, 'Guest X', 'gx@example.com'),
       ($2::uuid, $4::uuid, 'Guest Y', 'gy@example.com')`,
    [GUEST_X, GUEST_Y, TENANT_X, TENANT_Y],
  );
  await client.query(
    `insert into public.appointments (id, tenant_id, service_id, guest_contact_id, starts_at, ends_at, status, manage_token_hash) values
       ($1::uuid, $3::uuid, $5::uuid, $7::uuid, '2027-01-04 10:00+00', '2027-01-04 10:30+00', 'confirmed', encode(sha256('x'::bytea), 'hex')),
       ($2::uuid, $4::uuid, $6::uuid, $8::uuid, '2027-01-04 11:00+00', '2027-01-04 11:30+00', 'confirmed', encode(sha256('y'::bytea), 'hex'))`,
    [APPT_X, APPT_Y, TENANT_X, TENANT_Y, SVC_X, SVC_Y, GUEST_X, GUEST_Y],
  );
}

async function asAdminX<T>(fn: () => Promise<T>): Promise<T> {
  await client.query("select set_config('role', 'authenticated', false)");
  await client.query(`set local role authenticated`);
  await client.query(
    `select set_config('request.jwt.claims', $1, true)`,
    [JSON.stringify({ sub: ADMIN_X, role: 'authenticated' })],
  );
  try {
    return await fn();
  } finally {
    await client.query(`reset role`);
  }
}

async function countWith(sql: string, args: unknown[] = []): Promise<number> {
  const r = await client.query<{ count: string }>(sql, args);
  return Number(r.rows[0]?.count ?? 0);
}

function skipIfNoDb(): boolean {
  if (!dbAvailable) {
     
    console.warn('[rls.test] LOCAL_DB_URL unreachable — test skipped');
    return true;
  }
  return false;
}

describe('RLS pen-test', () => {
  it('admin of X cannot read tenant Y rows across every tenant-scoped table', async () => {
    if (skipIfNoDb()) return;
    await client.query('begin');
    try {
      await asAdminX(async () => {
        // Tables that MUST be tenant-isolated under RLS. tenants, services
        // (when active), availability_rules, and availability_exceptions are
        // intentionally world-readable for the public booking surface and
        // are excluded here.
        const tables: { table: string; tenantCol: string }[] = [
          { table: 'memberships', tenantCol: 'tenant_id' },
          { table: 'guest_contacts', tenantCol: 'tenant_id' },
          { table: 'appointments', tenantCol: 'tenant_id' },
          { table: 'pending_memberships', tenantCol: 'tenant_id' },
          { table: 'tenant_audit_events', tenantCol: 'tenant_id' },
        ];
        for (const { table, tenantCol } of tables) {
          const count = await countWith(
            `select count(*) from public.${table} where ${tenantCol} = $1::uuid`,
            [TENANT_Y],
          );
          expect({ table, count }).toEqual({ table, count: 0 });
        }
      });
    } finally {
      await client.query('rollback');
    }
  });

  it('admin of X sees their own tenant rows', async () => {
    if (skipIfNoDb()) return;
    await client.query('begin');
    try {
      await asAdminX(async () => {
        const cnt = await countWith(
          `select count(*) from public.appointments where tenant_id = $1::uuid`,
          [TENANT_X],
        );
        expect(cnt).toBeGreaterThan(0);
      });
    } finally {
      await client.query('rollback');
    }
  });

  it('client_errors and notifications also isolate by tenant', async () => {
    if (skipIfNoDb()) return;
    // Insert one error + one notification per tenant first.
    await client.query(
      `insert into public.client_errors (user_id, tenant_id, kind, message) values
        ($1::uuid, $3::uuid, 'manual', 'X err'),
        ($2::uuid, $4::uuid, 'manual', 'Y err')`,
      [ADMIN_X, ADMIN_Y, TENANT_X, TENANT_Y],
    );
    await client.query(
      `insert into public.notifications (appointment_id, channel, event, status) values
        ($1::uuid, 'email', 'manual_test', 'sent'),
        ($2::uuid, 'email', 'manual_test', 'sent')`,
      [APPT_X, APPT_Y],
    );

    await client.query('begin');
    try {
      await asAdminX(async () => {
        const errorsX = await countWith(
          `select count(*) from public.client_errors where tenant_id = $1::uuid`,
          [TENANT_X],
        );
        const errorsY = await countWith(
          `select count(*) from public.client_errors where tenant_id = $1::uuid`,
          [TENANT_Y],
        );
        const notifsY = await countWith(
          `select count(*) from public.notifications n
             join public.appointments a on a.id = n.appointment_id
             where a.tenant_id = $1::uuid`,
          [TENANT_Y],
        );
        expect(errorsX).toBeGreaterThan(0);
        expect(errorsY).toBe(0);
        expect(notifsY).toBe(0);
      });
    } finally {
      await client.query('rollback');
      await client.query(`delete from public.client_errors where message in ('X err', 'Y err')`);
      await client.query(`delete from public.notifications where event = 'manual_test'`);
    }
  });
});
