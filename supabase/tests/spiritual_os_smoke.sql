\set ON_ERROR_STOP on
insert into auth.users(id) values
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222');
insert into public.workspaces(id) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

-- Owner A creates an encrypted practice record and a normalized log.
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
insert into public.spiritual_private_records(user_id,workspace_id,id,collection,data,encrypted_data,encryption_version)
values ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','practice-1','practices','{}',
 '{"version":1,"algorithm":"AES-256-GCM","iv":"AAAAAAAAAAAAAAAA","ciphertext":"AAAAAAAAAAAAAAAAAAAAAA=="}',1);
insert into public.spiritual_practice_logs(user_id,workspace_id,id,practice_id,log_date,slot_key,status,client_op_id,encrypted_payload)
values ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','log-1','practice-1','2026-11-03','_','Done','op-1',
 '{"version":1,"algorithm":"AES-256-GCM","iv":"AAAAAAAAAAAAAAAA","ciphertext":"AAAAAAAAAAAAAAAAAAAAAA=="}');
do $$
begin
 if (select count(*) from public.spiritual_private_records where id='practice-1') <> 1 then
   raise exception 'owner cannot read own Spiritual record';
 end if;
 if (select count(*) from public.spiritual_practice_logs where id='log-1') <> 1 then
   raise exception 'owner cannot read own practice log';
 end if;
end $$;

-- Switch to owner B: no cross-user rows are visible or mutable.
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $$
begin
 if (select count(*) from public.spiritual_private_records where id='practice-1') <> 0 then
   raise exception 'privacy failure: second user can read another owner record';
 end if;
 if (select count(*) from public.spiritual_practice_logs where id='log-1') <> 0 then
   raise exception 'privacy failure: second user can read another owner log';
 end if;
 if exists (select 1 from public.spiritual_user_keyrings where user_id='11111111-1111-4111-8111-111111111111') then
   raise exception 'privacy failure: second user can read another owner keyring';
 end if;
end $$;
reset role;

-- Verify relation writes are owner-scoped and typed references work.
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
insert into public.spiritual_private_records(user_id,workspace_id,id,collection,data,encrypted_data,encryption_version)
values ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','value-1','values','{}',
 '{"version":1,"algorithm":"AES-256-GCM","iv":"AAAAAAAAAAAAAAAA","ciphertext":"AAAAAAAAAAAAAAAAAAAAAA=="}',1);
select public.spiritual_replace_record_relations(
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','practices','practice-1',
 '[{"target_id":"value-1","target_collection":"values","relation_type":"practice_value"}]'::jsonb
);
do $$
begin
 if (select count(*) from public.spiritual_record_relations where source_id='practice-1' and target_id='value-1') <> 1 then
   raise exception 'relation RPC did not persist valid relation';
 end if;
end $$;
reset role;
select 'spiritual_sql_smoke_passed' as result;
