-- Keep workspace_id non-null when referenced nutrition rows are removed.
begin;
alter table public.nutrition_meals drop constraint if exists nutrition_meals_type_fk;
alter table public.nutrition_meals add constraint nutrition_meals_type_fk
  foreign key (workspace_id,meal_type_id) references public.nutrition_meal_types(workspace_id,id) on delete restrict;
alter table public.nutrition_food_log_entries drop constraint if exists nutrition_log_meal_fk;
alter table public.nutrition_food_log_entries add constraint nutrition_log_meal_fk
  foreign key (workspace_id,meal_id) references public.nutrition_meals(workspace_id,id) on delete restrict;
alter table public.nutrition_food_log_entries drop constraint if exists nutrition_log_food_fk;
alter table public.nutrition_food_log_entries add constraint nutrition_log_food_fk
  foreign key (workspace_id,food_id) references public.nutrition_foods(workspace_id,id) on delete restrict;
commit;
