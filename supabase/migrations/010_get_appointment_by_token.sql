-- 010_get_appointment_by_token: SECURITY DEFINER RPC so the manage screen can
-- fetch the appointment row from the plaintext manage token without going
-- through the RLS-gated select policy on appointments. Used by guest deep
-- links (ma3ady://manage/<token>) when the user is not signed in.

create or replace function public.get_appointment_by_token(p_token text)
returns public.appointments
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_hash text;
  v_row  public.appointments;
begin
  v_hash := encode(digest(p_token, 'sha256'), 'hex');
  select *
    into v_row
    from public.appointments
   where manage_token_hash = v_hash;

  if v_row.id is null or v_row.status = 'cancelled' then
    raise exception 'appointment_unavailable' using errcode = 'P0002';
  end if;

  return v_row;
end;
$$;

grant execute on function public.get_appointment_by_token(text)
  to anon, authenticated;
