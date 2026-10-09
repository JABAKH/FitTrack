import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";
async function main() {
  const pg = new PGlite();
  await pg.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id));
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated,service_role;grant execute on function auth.uid() to authenticated,service_role;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;
 grant usage on schema storage to authenticated;grant all on storage.objects to authenticated;`);
  const file = readdirSync("supabase/migrations").find((n) =>
    n.endsWith("_fittrack_initial.sql"),
  )!;
  const sql = readFileSync(`supabase/migrations/${file}`, "utf8").replace(
    /alter publication supabase_realtime add table[^;]+;/,
    "",
  );
  await pg.exec(sql);
  const a = "00000000-0000-4000-8000-000000000001",
    b = "00000000-0000-4000-8000-000000000002",
    trainer = "00000000-0000-4000-8000-000000000003",
    trainer2 = "00000000-0000-4000-8000-000000000004";
  await pg.exec(`insert into auth.users(id) values('${a}'),('${b}'),('${trainer}'),('${trainer2}');
 insert into public.trainers(id,user_id,name,sex,specialty,experience_years) values('${trainer}','${trainer}','Test','male','Strength',3),('${trainer2}','${trainer2}','Test 2','female','Running',4);
 insert into public.trainer_subscriptions(user_id,trainer_id,status,current_period_end,billing_attempt) values('${a}','${trainer}','active',now()+interval '1 month','${a}');
 insert into public.conversations(id,user_id,trainer_id) values('${a}','${a}','${trainer}');`);
  async function asUser(id: string) {
    await pg.exec(
      `reset role;set request.jwt.claim.sub='${id}';set role authenticated;`,
    );
  }
  await asUser(a);
  assert.equal(
    (await pg.query("select * from profiles")).rows.length,
    1,
    "profiles isolated",
  );
  await assert.rejects(
    () => pg.exec(`insert into fitness_goals(user_id) values('${b}')`),
    "cross-user writes rejected",
  );
  await assert.rejects(
    () => pg.exec(`update trainer_subscriptions set status='active'`),
    "billing writes blocked",
  );
  await pg.exec(
    `select public.record_steps(current_date,100,'test');select public.record_steps(current_date,90,'test');select public.record_steps(current_date,120,'test');`,
  );
  const steps = await pg.query<{ steps: number }>(
    "select steps from daily_steps",
  );
  assert.equal(steps.rows[0].steps, 120, "steps never double-count or regress");
  assert.equal(steps.rows.length, 1);
  const activity = {
    id: a,
    kind: "walk",
    started_at: new Date().toISOString(),
    ended_at: new Date().toISOString(),
    day: new Date().toISOString().slice(0, 10),
    step_source: "android-session",
    duration_seconds: 60,
    distance_m: 100,
    steps: 200,
    calories: 10,
    route: [],
  };
  await pg.query("select public.record_activity($1::jsonb)", [
    JSON.stringify(activity),
  ]);
  await pg.query("select public.record_activity($1::jsonb)", [
    JSON.stringify(activity),
  ]);
  assert.equal(
    (await pg.query("select * from activities")).rows.length,
    1,
    "activity upload retry is idempotent",
  );
  assert.equal(
    (await pg.query<{ steps: number }>("select steps from daily_steps")).rows[0]
      .steps,
    200,
    "Android session steps counted once",
  );
  await pg.exec(
    `insert into messages(id,conversation_id,sender_id,body) values('${a}','${a}','${a}','Hello')`,
  );
  await asUser(b);
  assert.equal(
    (await pg.query("select * from messages")).rows.length,
    0,
    "third party cannot read chat",
  );
  await assert.rejects(() =>
    pg.exec(
      `insert into messages(id,conversation_id,sender_id,body) values('${b}','${a}','${b}','Intrusion')`,
    ),
  );
  await asUser(trainer);
  assert.equal(
    (await pg.query("select * from messages")).rows.length,
    1,
    "trainer sees chat",
  );
  await pg.exec(
    `insert into messages(id,conversation_id,sender_id,body) values('${trainer}','${a}','${trainer}','Reply')`,
  );
  await pg.exec("reset role");
  await pg.exec(`select public.change_trainer('${a}','${trainer2}')`);
  await assert.rejects(
    () => pg.exec(`select public.change_trainer('${a}','${trainer}')`),
    "second monthly change rejected",
  );
  await asUser(a);
  await assert.rejects(
    () =>
      pg.exec(
        `insert into messages(id,conversation_id,sender_id,body) values('${b}','${a}','${a}','Old trainer')`,
      ),
    "old chat read-only after trainer change",
  );
  await pg.exec("reset role");
  const payload = JSON.stringify({
    id: "sub_test",
    customer: "cus_test",
    status: "active",
    period_end: new Date(Date.now() + 86400000).toISOString(),
    cancel_at_period_end: false,
  });
  const first = await pg.query<{ sync_billing: boolean }>(
    "select public.sync_billing($1,$2,$3,$4::jsonb)",
    ["evt_test", a, a, payload],
  );
  assert.equal(first.rows[0].sync_billing, true);
  const retry = await pg.query<{ sync_billing: boolean }>(
    "select public.sync_billing($1,$2,$3,$4::jsonb)",
    ["evt_test", a, a, payload],
  );
  assert.equal(retry.rows[0].sync_billing, false, "webhook replay idempotent");
  const stale = await pg.query<{ sync_billing: boolean }>(
    "select public.sync_billing($1,$2,$3,$4::jsonb)",
    ["evt_stale", a, b, payload],
  );
  assert.equal(
    stale.rows[0].sync_billing,
    false,
    "stale checkout cannot overwrite subscription",
  );
  const locks = await pg.query<{ acquire_billing_lock: boolean }>(
    `select public.acquire_billing_lock('${a}')`,
  );
  assert.equal(locks.rows[0].acquire_billing_lock, true);
  assert.equal(
    (
      await pg.query<{ acquire_billing_lock: boolean }>(
        `select public.acquire_billing_lock('${a}')`,
      )
    ).rows[0].acquire_billing_lock,
    false,
  );
  const rls = await pg.query<{ relname: string; relrowsecurity: boolean }>(
    `select relname,relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'`,
  );
  assert.equal(rls.rows.length, 14);
  assert.ok(rls.rows.every((t) => t.relrowsecurity));
  console.log(
    "PASS: 14 tables, bootstrap, RLS isolation, chat authorization, deduplicated steps, monthly change, idempotent webhooks, billing lock. Realtime publication and Storage HTTP need real Supabase.",
  );
  await pg.close();
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
