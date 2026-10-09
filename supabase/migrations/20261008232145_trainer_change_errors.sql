create or replace function public.change_trainer(p_user uuid,p_trainer uuid)
returns uuid language plpgsql security invoker set search_path='' as $$
declare s public.trainer_subscriptions; cid uuid;
begin
  select * into s from public.trainer_subscriptions where user_id=p_user for update;
  if s.id is null or s.status<>'active' or s.cancel_at_period_end or s.current_period_end is null or s.current_period_end<=now() then
    raise exception 'Suscripción inactiva';
  end if;
  if s.trainer_id=p_trainer then raise exception 'Ya tienes este entrenador'; end if;
  if not exists(select 1 from public.trainers where id=p_trainer and active) then raise exception 'Entrenador no disponible'; end if;
  if exists(select 1 from public.trainer_changes where user_id=p_user and month=date_trunc('month',now() at time zone 'UTC')::date) then
    raise exception 'Ya usaste tu cambio gratuito de entrenador este mes. Podrás cambiar nuevamente el primer día del próximo mes.';
  end if;
  insert into public.trainer_changes(user_id,subscription_id,previous_trainer_id,trainer_id,month)
  values(p_user,s.id,s.trainer_id,p_trainer,date_trunc('month',now() at time zone 'UTC')::date);
  update public.trainer_subscriptions set trainer_id=p_trainer where id=s.id;
  insert into public.conversations(user_id,trainer_id) values(p_user,p_trainer)
  on conflict(user_id,trainer_id) do update set trainer_id=excluded.trainer_id returning id into cid;
  return cid;
end $$;
revoke all on function public.change_trainer(uuid,uuid) from public,anon,authenticated;
grant execute on function public.change_trainer(uuid,uuid) to service_role;
