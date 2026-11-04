begin;
revoke all privileges on table
 public.nutrition_settings, public.nutrition_meal_types, public.nutrition_foods,
 public.nutrition_meals, public.nutrition_food_log_entries, public.nutrition_water_logs,
 public.nutrition_log_entry_history
from anon, authenticated;
grant select, insert, update, delete on table
 public.nutrition_settings, public.nutrition_meal_types, public.nutrition_foods,
 public.nutrition_meals, public.nutrition_food_log_entries, public.nutrition_water_logs,
 public.nutrition_log_entry_history
to authenticated;
revoke all privileges on table public.nutrition_units, public.nutrition_nutrient_defs from anon, authenticated;
grant select on table public.nutrition_units, public.nutrition_nutrient_defs to authenticated;
commit;