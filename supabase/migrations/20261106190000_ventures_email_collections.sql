begin;
insert into public.collection_sections(system_id,collection,section_id) values
('ventures','email_campaigns','email'),
('ventures','email_lists','email'),
('ventures','email_flows','email'),
('ventures','email_checks','email')
on conflict (system_id,collection) do update set section_id=excluded.section_id;
commit;
