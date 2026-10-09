create extension if not exists pg_net with schema extensions;
create function private.notify_message() returns trigger language plpgsql security definer set search_path='' as $$
declare webhook_secret text; webhook_url text;
begin
  if auth.uid() is null or new.sender_id is distinct from auth.uid() then return new; end if;
  select decrypted_secret into webhook_secret from vault.decrypted_secrets where name='fittrack_message_webhook_secret';
  select decrypted_secret into webhook_url from vault.decrypted_secrets where name='fittrack_message_webhook_url';
  if webhook_secret is not null and webhook_url is not null then
    perform net.http_post(url:=webhook_url,headers:=jsonb_build_object('Content-Type','application/json','x-webhook-secret',webhook_secret),
      body:=jsonb_build_object('type','INSERT','table','messages','schema','public','record',jsonb_build_object('id',new.id)),timeout_milliseconds:=5000);
  end if;
  return new;
end $$;
revoke all on function private.notify_message() from public,anon,authenticated;
create trigger fittrack_message_push after insert on public.messages for each row execute function private.notify_message();
