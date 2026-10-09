-- Supabase-created event trigger does not need client RPC execution privileges.
revoke execute on function public.rls_auto_enable() from public,anon,authenticated;
