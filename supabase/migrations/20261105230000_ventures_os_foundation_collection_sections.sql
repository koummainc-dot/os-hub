begin;
insert into public.collection_sections(system_id,collection,section_id) values
('ventures','profiles','projects'),
('ventures','keywords','keywords'),
('ventures','seo_audit','seoAudit'),
('ventures','geo','geo'),
('ventures','ai_checks','ai'),
('ventures','backlinks','links'),
('ventures','competitors','competitors'),
('ventures','strategy','business'),
('ventures','experiments','experiments'),
('ventures','products','products'),
('ventures','affiliate','affiliate'),
('ventures','checklist','compliance'),
('ventures','campaigns','distribution'),
('ventures','portfolio_calls','portfolio'),
('ventures','imports','settings'),
('ventures','settings','settings'),
('ventures','lookups','settings'),
('ventures','prefs','settings')
on conflict (system_id,collection) do update set section_id=excluded.section_id;
commit;