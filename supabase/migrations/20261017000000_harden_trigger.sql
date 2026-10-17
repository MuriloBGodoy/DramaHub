-- handle_new_user so roda pelo trigger: ninguem precisa chamar via /rest/v1/rpc
revoke execute on function public.handle_new_user() from anon, authenticated, public;
