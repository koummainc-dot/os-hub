-- Enforce per-entry privacy for newly created Hobbies Journal records.
-- Legacy rows with visible_to NULL remain shared until a user explicitly converts them.
begin;

create or replace function public.hobbies_journal_visibility_guard()
returns trigger
language plpgsql
security invoker
set search_path = public
as $function$
begin
  if new.system_id <> 'hobbies' or new.collection <> 'journalEntries' then
    return new;
  end if;

  if auth.uid() is null then
    raise exception 'HOBBIES_JOURNAL_AUTH_REQUIRED' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    if new.visible_to is null then
      new.visible_to := array[auth.uid()];
    elsif new.visible_to is distinct from array[auth.uid()]::uuid[] then
      raise exception 'HOBBIES_JOURNAL_OWNER_MISMATCH' using errcode = '42501';
    end if;
    return new;
  end if;

  -- Existing private entries can only be changed by a listed viewer, and their
  -- audience cannot be widened or transferred by a client-side payload.
  if old.visible_to is not null then
    if not (auth.uid() = any(old.visible_to)) then
      raise exception 'HOBBIES_JOURNAL_ACCESS_DENIED' using errcode = '42501';
    end if;
    if new.visible_to is distinct from old.visible_to then
      raise exception 'HOBBIES_JOURNAL_VISIBILITY_IMMUTABLE' using errcode = '42501';
    end if;
  elsif new.visible_to is not null
        and new.visible_to is distinct from array[auth.uid()]::uuid[] then
    raise exception 'HOBBIES_JOURNAL_OWNER_MISMATCH' using errcode = '42501';
  end if;

  return new;
end
$function$;

drop trigger if exists hobbies_journal_visibility_guard_trg on public.workspace_records;
create trigger hobbies_journal_visibility_guard_trg
before insert or update on public.workspace_records
for each row execute function public.hobbies_journal_visibility_guard();

commit;
