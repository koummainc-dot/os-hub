-- Learning OS: hide a section ⇒ hide all of its collections server-side (core collections follow the system level).
insert into public.collection_sections(system_id, collection, section_id) values
  ('learning','tests','placement'),
  ('learning','goals','careergoals'),
  ('learning','skills','skills'), ('learning','course_skills','skills'), ('learning','lesson_skills','skills'),
  ('learning','vocab','vocab')
on conflict do nothing;
