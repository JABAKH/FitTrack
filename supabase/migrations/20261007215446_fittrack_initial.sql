-- Applied by Supabase CLI migration, not by the mobile client.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '', birth_date date,
  sex text check (sex in ('male','female','other')),
  height_cm numeric check(height_cm between 50 and 300),
  weight_kg numeric check(weight_kg between 20 and 500),
  avatar_path text, units text not null default 'metric' check(units in ('metric','imperial')),
  theme text not null default 'system' check(theme in ('system','light','dark')),
  created_at timestamptz not null default now()
);
create table public.fitness_goals (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  daily_steps integer not null default 8000 check(daily_steps between 100 and 100000),
  target_weight_kg numeric check(target_weight_kg between 20 and 500),
  weekly_activity_minutes integer not null default 150 check(weekly_activity_minutes between 0 and 10000)
);
create table public.activities (
  id uuid primary key, user_id uuid not null references public.profiles(user_id) on delete cascade,
  kind text not null check(kind in ('walk','run')),
  started_at timestamptz not null, ended_at timestamptz not null, day date not null,
  step_source text check(step_source in ('ios-pedometer','android-session')),
  duration_seconds integer not null check(duration_seconds>=0),
  distance_m numeric not null check(distance_m>=0), steps integer check(steps>=0),
  calories numeric check(calories>=0), route jsonb not null default '[]',
  check(ended_at>=started_at), unique(user_id,started_at,kind)
);
create table public.daily_steps (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  day date not null, steps integer not null check(steps>=0), source text not null,
  updated_at timestamptz not null default now(), primary key(user_id,day)
);
create table public.weight_history (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(user_id) on delete cascade,
  day date not null, weight_kg numeric not null check(weight_kg between 20 and 500), unique(user_id,day)
);
create table public.food_logs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(user_id) on delete cascade,
  day date not null, name text not null check(length(trim(name)) between 1 and 200),
  calories numeric not null check(calories between 0 and 100000),
  protein_g numeric not null default 0 check(protein_g>=0), carbs_g numeric not null default 0 check(carbs_g>=0),
  fat_g numeric not null default 0 check(fat_g>=0), created_at timestamptz not null default now()
);
create table public.nutrition_goals (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  calories integer not null default 2000 check(calories between 500 and 10000),
  protein_g numeric not null default 100 check(protein_g>=0),
  carbs_g numeric not null default 250 check(carbs_g>=0), fat_g numeric not null default 65 check(fat_g>=0)
);
create table public.trainers (
  id uuid primary key default gen_random_uuid(), user_id uuid not null unique references public.profiles(user_id) on delete cascade,
  name text not null, sex text not null check(sex in ('male','female','other')),
  specialty text not null, bio text not null default '', experience_years integer not null check(experience_years>=0),
  rating numeric check(rating between 0 and 5), avatar_path text, active boolean not null default true
);
create table public.trainer_subscriptions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null unique references public.profiles(user_id) on delete cascade,
  trainer_id uuid not null references public.trainers(id),
  status text not null check(status in ('pending','active','past_due','canceled','incomplete','unpaid','paused')),
  stripe_customer_id text, stripe_subscription_id text unique, checkout_session_id text unique, billing_attempt uuid,
  current_period_end timestamptz, cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.trainer_changes (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(user_id) on delete cascade,
  subscription_id uuid not null references public.trainer_subscriptions(id) on delete cascade,
  previous_trainer_id uuid not null references public.trainers(id), trainer_id uuid not null references public.trainers(id),
  month date not null, changed_at timestamptz not null default now(), unique(user_id,month)
);
create table public.conversations (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(user_id) on delete cascade,
  trainer_id uuid not null references public.trainers(id), created_at timestamptz not null default now(), unique(user_id,trainer_id)
);
create table public.messages (
  id uuid primary key, conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(user_id) on delete cascade,
  body text not null check(length(trim(body)) between 1 and 4000), created_at timestamptz not null default now()
);
create table public.payments (
  id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles(user_id) on delete set null,
  stripe_invoice_id text not null unique, amount_centavos bigint not null check(amount_centavos>=0),
  currency text not null check(currency='mxn'), status text not null check(status in ('paid','failed','refunded')),
  paid_at timestamptz not null default now()
);
create table public.notification_preferences (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  activity boolean not null default true, steps boolean not null default true, weight boolean not null default true,
  messages boolean not null default true, renewals boolean not null default true, expo_push_token text
);
create table private.webhook_events (id text primary key, processed_at timestamptz not null default now());
create table private.billing_locks (user_id uuid primary key references auth.users(id) on delete cascade, expires_at timestamptz not null);

create index activities_user_started on public.activities(user_id,started_at desc);
create index food_user_day on public.food_logs(user_id,day);
create index weight_user_day on public.weight_history(user_id,day desc);
create index messages_conversation_time on public.messages(conversation_id,created_at,id);
create index messages_sender on public.messages(sender_id);
create index subscriptions_trainer on public.trainer_subscriptions(trainer_id);
create index conversations_trainer on public.conversations(trainer_id);
create index changes_subscription on public.trainer_changes(subscription_id);
create index changes_previous_trainer on public.trainer_changes(previous_trainer_id);
create index changes_trainer on public.trainer_changes(trainer_id);
create index payments_user_time on public.payments(user_id,paid_at desc);

do $$ declare t text; begin
  foreach t in array array['profiles','fitness_goals','activities','daily_steps','weight_history','food_logs','nutrition_goals','notification_preferences'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('create policy own_select on public.%I for select to authenticated using ((select auth.uid())=user_id)',t);
    execute format('create policy own_insert on public.%I for insert to authenticated with check ((select auth.uid())=user_id)',t);
    execute format('create policy own_update on public.%I for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id)',t);
    execute format('create policy own_delete on public.%I for delete to authenticated using ((select auth.uid())=user_id)',t);
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  end loop;
  foreach t in array array['trainers','trainer_subscriptions','trainer_changes','conversations','messages','payments'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('grant select on public.%I to authenticated',t);
  end loop;
end $$;
-- Only the server can create trainer records, subscriptions, payment records and conversations.
revoke insert,update,delete on public.trainers,public.trainer_subscriptions,public.trainer_changes,public.conversations,public.payments from anon,authenticated;
revoke insert,update,delete on public.messages from anon,authenticated;
grant insert on public.messages to authenticated;
create policy trainers_catalog on public.trainers for select to authenticated using (active or user_id=(select auth.uid()));
create policy subscriptions_owner on public.trainer_subscriptions for select to authenticated using(user_id=(select auth.uid()));
create policy changes_owner on public.trainer_changes for select to authenticated using(user_id=(select auth.uid()));
create policy payments_owner on public.payments for select to authenticated using(user_id=(select auth.uid()));
create policy conversation_members on public.conversations for select to authenticated using (
  user_id=(select auth.uid()) or exists(select 1 from public.trainers t where t.id=trainer_id and t.user_id=(select auth.uid()))
);
create policy message_members on public.messages for select to authenticated using (
  exists(select 1 from public.conversations c where c.id=conversation_id)
);
create policy message_sender on public.messages for insert to authenticated with check (
  sender_id=(select auth.uid()) and exists(
    select 1 from public.conversations c join public.trainer_subscriptions s on s.user_id=c.user_id and s.trainer_id=c.trainer_id
    where c.id=conversation_id and s.status='active' and s.current_period_end>now()
  )
);
-- Trainer needs to see the active subscription to send messages, without seeing payment identities.
-- Use a private helper that checks membership and only returns a boolean.
create function private.can_send(p_conversation uuid) returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and exists (
    select 1 from public.conversations c join public.trainers t on t.id=c.trainer_id
    join public.trainer_subscriptions s on s.user_id=c.user_id and s.trainer_id=c.trainer_id
    where c.id=p_conversation and (c.user_id=auth.uid() or t.user_id=auth.uid())
    and s.status='active' and s.current_period_end>now()
  )
$$;
revoke all on function private.can_send(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.can_send(uuid) to authenticated;
drop policy message_sender on public.messages;
create policy message_sender on public.messages for insert to authenticated with check (
  sender_id=(select auth.uid()) and private.can_send(conversation_id)
);

create function private.bootstrap_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles(user_id,full_name) values(new.id, coalesce(new.raw_user_meta_data->>'full_name',''));
  insert into public.fitness_goals(user_id) values(new.id);
  insert into public.nutrition_goals(user_id) values(new.id);
  insert into public.notification_preferences(user_id) values(new.id);
  return new;
end $$;
revoke all on function private.bootstrap_user() from public,anon,authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.bootstrap_user();
-- Initialize existing Auth accounts without overwriting existing personal data.
insert into public.profiles(user_id,full_name) select id,coalesce(raw_user_meta_data->>'full_name','') from auth.users on conflict(user_id) do nothing;
insert into public.fitness_goals(user_id) select user_id from public.profiles on conflict(user_id) do nothing;
insert into public.nutrition_goals(user_id) select user_id from public.profiles on conflict(user_id) do nothing;
insert into public.notification_preferences(user_id) select user_id from public.profiles on conflict(user_id) do nothing;

create function public.record_steps(p_day date,p_steps integer,p_source text) returns void language plpgsql security invoker set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  if p_steps<0 or p_steps>200000 or p_day>current_date+1 or p_day<current_date-30 then raise exception 'Invalid measurement'; end if;
  insert into public.daily_steps(user_id,day,steps,source) values(auth.uid(),p_day,p_steps,p_source)
  on conflict(user_id,day) do update set steps=greatest(public.daily_steps.steps,excluded.steps),source=excluded.source,updated_at=now();
end $$;
revoke all on function public.record_steps(date,integer,text) from public,anon;
grant execute on function public.record_steps(date,integer,text) to authenticated;
create function public.record_activity(p_activity jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare inserted uuid; step_count integer; activity_day date; source text;
begin
  if auth.uid() is null then raise exception 'Unauthorized'; end if;
  step_count=(p_activity->>'steps')::integer;activity_day=(p_activity->>'day')::date;source=p_activity->>'step_source';
  if activity_day>current_date+1 or activity_day<current_date-30 or step_count>200000 then raise exception 'Invalid activity'; end if;
  -- Serialize daily aggregation for activity uploads from multiple devices.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||activity_day::text,0));
  insert into public.activities(id,user_id,kind,started_at,ended_at,day,step_source,duration_seconds,distance_m,steps,calories,route)
  values((p_activity->>'id')::uuid,auth.uid(),p_activity->>'kind',(p_activity->>'started_at')::timestamptz,(p_activity->>'ended_at')::timestamptz,activity_day,source,(p_activity->>'duration_seconds')::integer,(p_activity->>'distance_m')::numeric,step_count,(p_activity->>'calories')::numeric,coalesce(p_activity->'route','[]'::jsonb))
  on conflict(id) do nothing returning id into inserted;
  if inserted is not null and source='android-session' and step_count is not null then
    insert into public.daily_steps(user_id,day,steps,source)
    select auth.uid(),activity_day,coalesce(sum(steps),0)::integer,'android-session' from public.activities where user_id=auth.uid() and day=activity_day and step_source='android-session'
    on conflict(user_id,day) do update set steps=greatest(public.daily_steps.steps,excluded.steps),source=excluded.source,updated_at=now();
  end if;
end $$;
revoke all on function public.record_activity(jsonb) from public,anon;
grant execute on function public.record_activity(jsonb) to authenticated;

-- Atomic server-only changes: row lock + UTC calendar-month uniqueness.
create function public.change_trainer(p_user uuid,p_trainer uuid) returns uuid language plpgsql security invoker set search_path='' as $$
declare s public.trainer_subscriptions; cid uuid;
begin
  select * into s from public.trainer_subscriptions where user_id=p_user for update;
  if s.id is null or s.status<>'active' or s.current_period_end is null or s.current_period_end<=now() then raise exception 'Suscripción inactiva'; end if;
  if s.trainer_id=p_trainer then raise exception 'Ya tienes este entrenador'; end if;
  if not exists(select 1 from public.trainers where id=p_trainer and active) then raise exception 'Entrenador no disponible'; end if;
  insert into public.trainer_changes(user_id,subscription_id,previous_trainer_id,trainer_id,month)
  values(p_user,s.id,s.trainer_id,p_trainer,date_trunc('month',now() at time zone 'UTC')::date);
  update public.trainer_subscriptions set trainer_id=p_trainer where id=s.id;
  insert into public.conversations(user_id,trainer_id) values(p_user,p_trainer) on conflict(user_id,trainer_id) do update set trainer_id=excluded.trainer_id returning id into cid;
  return cid;
end $$;
revoke all on function public.change_trainer(uuid,uuid) from public,anon,authenticated;
grant execute on function public.change_trainer(uuid,uuid) to service_role;
grant usage on schema private to service_role;
grant all on all tables in schema private to service_role;
create function public.acquire_billing_lock(p_user uuid) returns boolean language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
  insert into private.billing_locks(user_id,expires_at) values(p_user,now()+interval '60 seconds')
  on conflict(user_id) do update set expires_at=excluded.expires_at where private.billing_locks.expires_at<now();
  get diagnostics n = row_count; return n=1;
end $$;
revoke all on function public.acquire_billing_lock(uuid) from public,anon,authenticated;
grant execute on function public.acquire_billing_lock(uuid) to service_role;
create function public.release_billing_lock(p_user uuid) returns void language sql security invoker set search_path='' as $$ delete from private.billing_locks where user_id=p_user $$;
revoke all on function public.release_billing_lock(uuid) from public,anon,authenticated;
grant execute on function public.release_billing_lock(uuid) to service_role;

create function public.sync_billing(p_event text,p_user uuid,p_attempt uuid,p_subscription jsonb,p_payment jsonb default null) returns boolean language plpgsql security invoker set search_path='' as $$
declare s public.trainer_subscriptions;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
  if exists(select 1 from private.webhook_events where id=p_event) then return false; end if;
  select * into s from public.trainer_subscriptions where user_id=p_user for update;
  if s.id is null then raise exception 'Subscription not initialized'; end if;
  if s.billing_attempt is distinct from p_attempt then
    insert into private.webhook_events(id) values(p_event); return false;
  end if;
  update public.trainer_subscriptions set status=p_subscription->>'status',
    stripe_subscription_id=p_subscription->>'id',stripe_customer_id=p_subscription->>'customer',
    current_period_end=(p_subscription->>'period_end')::timestamptz,
    cancel_at_period_end=(p_subscription->>'cancel_at_period_end')::boolean where id=s.id;
  if p_subscription->>'status'='active' then
    insert into public.conversations(user_id,trainer_id) values(p_user,s.trainer_id) on conflict(user_id,trainer_id) do nothing;
  end if;
  if p_payment is not null then
    insert into public.payments(user_id,stripe_invoice_id,amount_centavos,currency,status)
    values(p_user,p_payment->>'id',(p_payment->>'amount')::bigint,'mxn',p_payment->>'status')
    on conflict(stripe_invoice_id) do update set status=excluded.status,amount_centavos=excluded.amount_centavos;
  end if;
  insert into private.webhook_events(id) values(p_event);return true;
end $$;
revoke all on function public.sync_billing(text,uuid,uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.sync_billing(text,uuid,uuid,jsonb,jsonb) to service_role;
grant all on all tables in schema public to service_role;
create function private.session_is_active(p_user uuid,p_session uuid) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from auth.sessions where id=p_session and user_id=p_user)
$$;
revoke all on function private.session_is_active(uuid,uuid) from public,anon,authenticated;
grant execute on function private.session_is_active(uuid,uuid) to service_role;
create function public.session_is_active(p_user uuid,p_session uuid) returns boolean language sql stable security invoker set search_path='' as $$
  select private.session_is_active(p_user,p_session)
$$;
revoke all on function public.session_is_active(uuid,uuid) from public,anon,authenticated;
grant execute on function public.session_is_active(uuid,uuid) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('avatars','avatars',false,5242880,array['image/jpeg','image/png','image/webp']),
 ('trainer-photos','trainer-photos',true,5242880,array['image/jpeg','image/png','image/webp']);
create policy avatar_read on storage.objects for select to authenticated using(bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy avatar_insert on storage.objects for insert to authenticated with check(bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy avatar_update on storage.objects for update to authenticated using(bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text) with check(bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy avatar_delete on storage.objects for delete to authenticated using(bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy trainer_photo_read on storage.objects for select to authenticated using(bucket_id='trainer-photos');
-- Trainer photographs are uploaded by a trusted administrator, not by ordinary clients.
alter publication supabase_realtime add table public.profiles,public.fitness_goals,public.activities,public.daily_steps,public.weight_history,public.food_logs,public.nutrition_goals,public.trainer_subscriptions,public.trainer_changes,public.conversations,public.messages,public.payments,public.notification_preferences,public.trainers;
