-- Sum actual FitTrack activity steps on both iOS and Android.
-- Keep historical rows untouched; subsequent saves reconcile their day.
create or replace function public.record_activity(p_activity jsonb) returns void language plpgsql security invoker set search_path='' as $$
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
  if step_count is not null then
    insert into public.daily_steps(user_id,day,steps,source)
    select auth.uid(),activity_day,coalesce(sum(steps),0)::integer,source from public.activities where user_id=auth.uid() and day=activity_day
    on conflict(user_id,day) do update set steps=excluded.steps,source=excluded.source,updated_at=now();
  end if;
end $$;
