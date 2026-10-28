-- Personal Inventory OS — P1 domain schema
-- Draft only. Do not apply to Supabase before review and isolated testing.
-- Depends on 20261028120000_inventory_p0_foundation.sql.
begin;

create table if not exists public.inventory_categories (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 120), slug text not null check(length(slug) between 1 and 120),
 description text, parent_id uuid, icon text, color text, sort_order integer not null default 0,
 is_system boolean not null default false, version integer not null default 1 check(version>0), is_demo boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
 created_by uuid references auth.users(id) on delete set null, updated_by uuid references auth.users(id) on delete set null,
 unique(workspace_id,id), unique(workspace_id,slug),
 foreign key(workspace_id,parent_id) references public.inventory_categories(workspace_id,id) on delete restrict
);
create index if not exists inventory_categories_parent_idx on public.inventory_categories(workspace_id,parent_id,sort_order);

create table if not exists public.inventory_locations (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 160),
 location_type text not null default 'Other' check(location_type in ('Home','Room','Storage','Vehicle','Workplace','External','Other')),
 parent_id uuid, description text, privacy_level text not null default 'Normal' check(privacy_level in ('Normal','Sensitive','Secret')),
 notes text, version integer not null default 1 check(version>0), is_demo boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
 created_by uuid references auth.users(id) on delete set null, updated_by uuid references auth.users(id) on delete set null,
 unique(workspace_id,id),
 foreign key(workspace_id,parent_id) references public.inventory_locations(workspace_id,id) on delete restrict
);
create index if not exists inventory_locations_parent_idx on public.inventory_locations(workspace_id,parent_id);

create table if not exists public.inventory_items (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 200), description text,
 item_kind text not null default 'Asset' check(item_kind in ('Asset','Bundle','Accessory','QuantityStock')),
 category_id uuid, current_location_id uuid,
 condition text not null default 'Good' check(condition in ('New','Good','Fair','Poor','Damaged')),
 ownership_status text not null default 'Owned' check(ownership_status in ('Owned','Loaned','Sold','Disposed','Lost')),
 quantity numeric(14,3) check(quantity is null or quantity>=0), quantity_unit text,
 minimum_quantity numeric(14,3) check(minimum_quantity is null or minimum_quantity>=0),
 brand text, model text, manufacturer text, purchase_date date,
 purchase_price numeric(20,4) check(purchase_price is null or purchase_price>=0),
 purchase_currency text check(purchase_currency is null or purchase_currency ~ '^[A-Z]{3}$'),
 estimated_current_value numeric(20,4) check(estimated_current_value is null or estimated_current_value>=0),
 estimated_value_currency text check(estimated_value_currency is null or estimated_value_currency ~ '^[A-Z]{3}$'),
 value_estimated_at date, value_estimate_note text,
 sensitivity text not null default 'Normal' check(sensitivity in ('Normal','Sensitive','Secret')),
 person_ref_system text, person_ref_type text, person_ref_id text,
 person_ref_snapshot jsonb not null default '{}'::jsonb check(jsonb_typeof(person_ref_snapshot)='object'),
 person_ref_state text not null default 'Missing' check(person_ref_state in ('Valid','Missing','NoAccess')),
 notes text, version integer not null default 1 check(version>0), is_demo boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
 created_by uuid references auth.users(id) on delete set null, updated_by uuid references auth.users(id) on delete set null,
 unique(workspace_id,id),
 foreign key(workspace_id,category_id) references public.inventory_categories(workspace_id,id) on delete restrict,
 foreign key(workspace_id,current_location_id) references public.inventory_locations(workspace_id,id) on delete restrict
);
create index if not exists inventory_items_name_idx on public.inventory_items(workspace_id,lower(name)) where deleted_at is null;
create index if not exists inventory_items_category_idx on public.inventory_items(workspace_id,category_id) where deleted_at is null;
create index if not exists inventory_items_location_idx on public.inventory_items(workspace_id,current_location_id) where deleted_at is null;
create index if not exists inventory_items_status_idx on public.inventory_items(workspace_id,ownership_status,updated_at desc) where deleted_at is null;

create table if not exists public.inventory_identifiers (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 item_id uuid not null, identifier_type text not null check(identifier_type in ('Serial','IMEI','AssetTag','Barcode','Registration','Other')),
 identifier_value text not null check(length(trim(identifier_value)) between 1 and 240),
 is_primary boolean not null default false, sensitivity text not null default 'Sensitive' check(sensitivity in ('Normal','Sensitive','Secret')),
 notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
 created_by uuid references auth.users(id) on delete set null, updated_by uuid references auth.users(id) on delete set null,
 unique(workspace_id,id), foreign key(workspace_id,item_id) references public.inventory_items(workspace_id,id) on delete cascade
);
create index if not exists inventory_identifiers_item_idx on public.inventory_identifiers(workspace_id,item_id) where deleted_at is null;

create table if not exists public.inventory_ownership_events (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 item_id uuid not null, event_type text not null check(event_type in ('Acquired','Moved','Loaned','Returned','Sold','Disposed','Lost','Found','Corrected')),
 occurred_at timestamptz not null default now(), from_location_id uuid, to_location_id uuid,
 person_ref_system text, person_ref_type text, person_ref_id text,
 person_ref_snapshot jsonb not null default '{}'::jsonb check(jsonb_typeof(person_ref_snapshot)='object'),
 event_note text, source_system text, source_ref_id text,
 sensitivity text not null default 'Normal' check(sensitivity in ('Normal','Sensitive','Secret')),
 created_at timestamptz not null default now(), created_by uuid references auth.users(id) on delete set null,
 unique(workspace_id,id), foreign key(workspace_id,item_id) references public.inventory_items(workspace_id,id) on delete restrict,
 foreign key(workspace_id,from_location_id) references public.inventory_locations(workspace_id,id) on delete restrict,
 foreign key(workspace_id,to_location_id) references public.inventory_locations(workspace_id,id) on delete restrict
);
create index if not exists inventory_ownership_timeline_idx on public.inventory_ownership_events(workspace_id,item_id,occurred_at desc);

create table if not exists public.inventory_warranties (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 item_id uuid not null, provider_name text,
 warranty_type text not null default 'Manufacturer' check(warranty_type in ('Manufacturer','Seller','Extended','ServicePlan','Other')),
 start_date date, end_date date, policy_number text, support_url text, reminder_days integer[] not null default array[30,7,1],
 document_ref_system text, document_ref_type text, document_ref_id text,
 document_ref_snapshot jsonb not null default '{}'::jsonb check(jsonb_typeof(document_ref_snapshot)='object'),
 document_ref_state text not null default 'Missing' check(document_ref_state in ('Valid','Missing','NoAccess')),
 notes text, sensitivity text not null default 'Sensitive' check(sensitivity in ('Normal','Sensitive','Secret')),
 version integer not null default 1 check(version>0), is_demo boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
 created_by uuid references auth.users(id) on delete set null, updated_by uuid references auth.users(id) on delete set null,
 unique(workspace_id,id), foreign key(workspace_id,item_id) references public.inventory_items(workspace_id,id) on delete cascade,
 check(start_date is null or end_date is null or end_date>=start_date)
);
create index if not exists inventory_warranties_end_idx on public.inventory_warranties(workspace_id,end_date) where deleted_at is null;

create table if not exists public.inventory_warranty_claims (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 warranty_id uuid not null, claim_date date, status text not null default 'Open'
 check(status in ('Open','Submitted','InProgress','Approved','Rejected','Completed','Cancelled')),
 claim_reference text, resolution text, cost numeric(20,4) check(cost is null or cost>=0),
 currency text check(currency is null or currency ~ '^[A-Z]{3}$'), notes text,
 version integer not null default 1 check(version>0), created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), deleted_at timestamptz,
 created_by uuid references auth.users(id) on delete set null, updated_by uuid references auth.users(id) on delete set null,
 unique(workspace_id,id), foreign key(workspace_id,warranty_id) references public.inventory_warranties(workspace_id,id) on delete cascade
);

create table if not exists public.inventory_replacement_plans (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 item_id uuid not null, expected_replacement_date date, reason text, budget numeric(20,4) check(budget is null or budget>=0),
 currency text check(currency is null or currency ~ '^[A-Z]{3}$'),
 status text not null default 'Planned' check(status in ('Planned','Considering','Deferred','Ready','Completed','Cancelled')),
 wishlist_ref_system text, wishlist_ref_type text, wishlist_ref_id text,
 wishlist_ref_snapshot jsonb not null default '{}'::jsonb check(jsonb_typeof(wishlist_ref_snapshot)='object'),
 wishlist_ref_state text not null default 'Missing' check(wishlist_ref_state in ('Valid','Missing','NoAccess')),
 notes text, version integer not null default 1 check(version>0), is_demo boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
 created_by uuid references auth.users(id) on delete set null, updated_by uuid references auth.users(id) on delete set null,
 unique(workspace_id,id), foreign key(workspace_id,item_id) references public.inventory_items(workspace_id,id) on delete cascade
);
create index if not exists inventory_replacement_due_idx on public.inventory_replacement_plans(workspace_id,expected_replacement_date) where deleted_at is null and status not in ('Completed','Cancelled');

create table if not exists public.inventory_valuations (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 item_id uuid not null, valuation_date date not null default current_date, value_amount numeric(20,4) check(value_amount is null or value_amount>=0),
 currency text check(currency is null or currency ~ '^[A-Z]{3}$'),
 valuation_kind text not null default 'Estimate' check(valuation_kind in ('Estimate','UserProvided','Appraisal','MarketReference')),
 method_note text, source_ref_url text, created_at timestamptz not null default now(),
 created_by uuid references auth.users(id) on delete set null, unique(workspace_id,id),
 foreign key(workspace_id,item_id) references public.inventory_items(workspace_id,id) on delete cascade
);
create index if not exists inventory_valuations_history_idx on public.inventory_valuations(workspace_id,item_id,valuation_date desc);

create table if not exists public.inventory_loans (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 item_id uuid not null, loan_direction text not null default 'Lent' check(loan_direction in ('Lent','Borrowed')),
 person_ref_system text, person_ref_type text, person_ref_id text,
 person_ref_snapshot jsonb not null default '{}'::jsonb check(jsonb_typeof(person_ref_snapshot)='object'),
 person_ref_state text not null default 'Missing' check(person_ref_state in ('Valid','Missing','NoAccess')),
 loaned_at date not null default current_date, due_date date, returned_at date,
 status text not null default 'Open' check(status in ('Open','Returned','Overdue','Lost','Cancelled')),
 notes text, sensitivity text not null default 'Sensitive' check(sensitivity in ('Normal','Sensitive','Secret')),
 version integer not null default 1 check(version>0), is_demo boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
 created_by uuid references auth.users(id) on delete set null, updated_by uuid references auth.users(id) on delete set null,
 unique(workspace_id,id), foreign key(workspace_id,item_id) references public.inventory_items(workspace_id,id) on delete restrict,
 check(due_date is null or due_date>=loaned_at), check(returned_at is null or returned_at>=loaned_at)
);
create index if not exists inventory_loans_due_idx on public.inventory_loans(workspace_id,due_date) where deleted_at is null and status in ('Open','Overdue');

create table if not exists public.inventory_service_logs (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 item_id uuid not null, service_date date not null default current_date,
 service_type text not null check(service_type in ('Maintenance','Repair','Inspection','Cleaning','Upgrade','Other')),
 provider_name text, cost numeric(20,4) check(cost is null or cost>=0), currency text check(currency is null or currency ~ '^[A-Z]{3}$'),
 next_due_date date, notes text, version integer not null default 1 check(version>0), is_demo boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
 created_by uuid references auth.users(id) on delete set null, updated_by uuid references auth.users(id) on delete set null,
 unique(workspace_id,id), foreign key(workspace_id,item_id) references public.inventory_items(workspace_id,id) on delete cascade
);
create index if not exists inventory_service_logs_date_idx on public.inventory_service_logs(workspace_id,item_id,service_date desc);

create table if not exists public.inventory_attachments (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 item_id uuid not null, attachment_type text not null default 'Other' check(attachment_type in ('Receipt','Warranty','Manual','OwnershipProof','Photo','Other')),
 title text not null check(length(trim(title)) between 1 and 200),
 file_ref_system text, file_ref_type text, file_ref_id text,
 file_ref_snapshot jsonb not null default '{}'::jsonb check(jsonb_typeof(file_ref_snapshot)='object'),
 file_ref_state text not null default 'Missing' check(file_ref_state in ('Valid','Missing','NoAccess')),
 sensitivity text not null default 'Sensitive' check(sensitivity in ('Normal','Sensitive','Secret')),
 created_at timestamptz not null default now(), created_by uuid references auth.users(id) on delete set null,
 unique(workspace_id,id), foreign key(workspace_id,item_id) references public.inventory_items(workspace_id,id) on delete cascade
);

create or replace function public.inventory_reject_history_mutation()
returns trigger language plpgsql set search_path=public as $$
begin raise exception 'INVENTORY_HISTORY_APPEND_ONLY' using errcode='42501'; end;
$$;
create or replace function public.inventory_p1_stamp_row()
returns trigger language plpgsql set search_path=public as $$
begin
 if tg_op='UPDATE' then
  if new.workspace_id is distinct from old.workspace_id then raise exception 'INVENTORY_WORKSPACE_IMMUTABLE' using errcode='42501'; end if;
  new.created_at:=old.created_at; new.created_by:=old.created_by; new.updated_at:=clock_timestamp(); new.updated_by:=auth.uid();
 else
  new.created_at:=coalesce(new.created_at,clock_timestamp()); new.updated_at:=new.created_at; new.created_by:=auth.uid(); new.updated_by:=auth.uid();
 end if;
 return new;
end; $$;

do $$
declare t text; sec text;
begin
 foreach t in array array['inventory_categories','inventory_locations','inventory_items','inventory_identifiers','inventory_ownership_events','inventory_warranties','inventory_warranty_claims','inventory_replacement_plans','inventory_valuations','inventory_loans','inventory_service_logs','inventory_attachments'] loop
  if t in ('inventory_categories','inventory_locations','inventory_items','inventory_identifiers','inventory_warranties','inventory_warranty_claims','inventory_replacement_plans','inventory_loans','inventory_service_logs') then
   execute format('drop trigger if exists %I on public.%I',t||'_stamp',t);
   execute format('create trigger %I before insert or update on public.%I for each row execute function public.inventory_p1_stamp_row()',t||'_stamp',t);
  end if;
  sec:=case when t='inventory_categories' then 'categories' when t='inventory_locations' then 'places'
   when t in ('inventory_items','inventory_identifiers','inventory_valuations') then 'items'
   when t='inventory_ownership_events' then 'history' when t in ('inventory_warranties','inventory_warranty_claims') then 'warranty'
   when t='inventory_replacement_plans' then 'replacement' when t='inventory_loans' then 'loans'
   when t='inventory_service_logs' then 'maintenance' else 'documents' end;
  execute format('alter table public.%I enable row level security',t);
  execute format('drop policy if exists %I on public.%I',t||'_select',t);
  execute format('create policy %I on public.%I for select to authenticated using (public.ws_access_level(workspace_id,''inventory'',%L) in (''view'',''edit''))',t||'_select',t,sec);
  execute format('drop policy if exists %I on public.%I',t||'_insert',t);
  execute format('create policy %I on public.%I for insert to authenticated with check (public.ws_access_level(workspace_id,''inventory'',%L)=''edit'')',t||'_insert',t,sec);
  if t not in ('inventory_ownership_events','inventory_valuations','inventory_attachments') then
   execute format('drop policy if exists %I on public.%I',t||'_update',t);
   execute format('create policy %I on public.%I for update to authenticated using (public.ws_access_level(workspace_id,''inventory'',%L)=''edit'') with check (public.ws_access_level(workspace_id,''inventory'',%L)=''edit'')',t||'_update',t,sec,sec);
   execute format('drop policy if exists %I on public.%I',t||'_delete',t);
   execute format('create policy %I on public.%I for delete to authenticated using (public.ws_access_level(workspace_id,''inventory'',%L)=''edit'')',t||'_delete',t,sec);
   execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  else
   execute format('drop trigger if exists %I on public.%I',t||'_no_mutation',t);
   execute format('create trigger %I before update or delete on public.%I for each row execute function public.inventory_reject_history_mutation()',t||'_no_mutation',t);
   execute format('grant select,insert on public.%I to authenticated',t);
  end if;
  execute format('revoke all on public.%I from anon',t);
 end loop;
end $$;

commit;
