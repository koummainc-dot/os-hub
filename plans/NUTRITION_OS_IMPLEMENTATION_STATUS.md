# Nutrition OS — Implementation Status

Last reviewed: 2026-11-01  
Branch: `feature/nutrition-os-p0-p1`  
PR: #99 (Draft; not merged or deployed)

This file distinguishes shipped code/schema from schema-only foundations and planned work. A database table existing does not mean its user workflow is implemented.

## A. Food logging and nutrition values — P1

| Requirement | Status | Evidence / limitation |
|---|---|---|
| Food catalog with kcal, protein, carbs, fat, fiber, sugar, sodium | Implemented | `nutrition_foods`; custom food form and daily snapshots |
| User-created foods | Implemented | Saved per workspace |
| Arabic search and spelling normalization | Implemented | NFKC, diacritic/tatweel removal, alef/ya/ta-marbuta normalization |
| User-defined aliases (e.g. ملوخيه / ملوخية) | Implemented | `name_aliases` field and search; aliases are entered by the user |
| g / ml / serving quantities | Implemented with limits | g and ml; serving size and serving label; density required for mass/volume conversion |
| Household measures (loaf, cup, spoon) | Partial | A food can define one serving label + size; dedicated `nutrition_food_portions` schema exists, but multi-portion management UI/conversion is not yet built |
| Quick calorie entry | Implemented | Quick macros entry; macros optional |
| Outside-home food with estimated values | Implemented | Venue, estimation method and optional kcal range; clearly marked estimated |
| Recent and favorite foods | Implemented | Derived from log history; favorite toggle persisted |
| Barcode scanning | Not implemented | Waiting for a vetted source, licensing review, and scanner integration |
| Daily meal log | Implemented | Date-scoped actual entries |
| Edit and delete log entries | Partial | Delete and correction of displayed name/nutrient values; quantity/unit editing with recalculation remains |
| Copy a meal to another day | Implemented (next-day action) | Copies immutable nutrient snapshots and creates a separate target-day meal |
| Actual-only daily summary | Implemented | Computed from food log entries only; planned meals are not part of the totals |
| Historical nutrient snapshot | Implemented | Entry stores nutrient values, source/version and calculation basis; manual correction is marked |

## B. Foods, recipes and cooking — P2

| Requirement | Status | Evidence / limitation |
|---|---|---|
| Recipe / ingredient / step storage | Schema implemented | `nutrition_recipes`, `nutrition_recipe_ingredients`, `nutrition_recipe_steps`; recipe UI and CRUD not yet complete |
| Nutrition per recipe and serving | Not implemented | Requires recipe calculation service and validation of missing ingredient data |
| Change serving count / scale ingredients | Not implemented | |
| Final cooked recipe weight | Not implemented | |
| Batch preparation and remaining portions | Not implemented | No batch tables/workflows yet |
| Raw/cooked conversion factors | Not implemented | Must use sourced conversion factors; no guessed factors |
| Warn on incomplete ingredient nutrition | Not implemented | |
| Convert recipe into actual meal / plan | Not implemented | |

## C. Goals and analytics — P2

| Requirement | Status | Evidence / limitation |
|---|---|---|
| Custom goal profiles / targets / date assignments | Schema implemented | `nutrition_goal_profiles`, `nutrition_goal_targets`, `nutrition_goal_assignments`; no goal UI/calculation yet |
| User-selected nutrient targets | Schema implemented | No preset health recommendations |
| Different targets by day type/date | Schema implemented | Assignment model only; evaluator/UI pending |
| Actual vs target and remaining | Not implemented | |
| Daily / weekly / monthly summaries | Partial | Daily actual-only summary; weekly/monthly analytics pending |
| Data coverage / number of tracked days | Not implemented | |
| Weekly review and personal notes | Not implemented | |
| Complete / partial day states | Not implemented | |
| Full / qualitative / hidden display | Implemented | User-selectable setting; no medical judgement |

## D. Water, supplements and reminders — P2

| Requirement | Status | Evidence / limitation |
|---|---|---|
| Quick water logging and history | Implemented | ml quick-add and custom amount |
| Cup size and preferred units | Partial | Common quick-add sizes; configurable cup profiles and units pending |
| Drinks with configurable water contribution | Not implemented | |
| Supplements | Not implemented | |
| Eating/fasting windows | Not implemented | |
| Custom reminders and notification delivery | Not implemented | |
| Pause reminders on non-tracking days | Not implemented | |

## E. Meal planning and grocery — P2

| Requirement | Status | Evidence / limitation |
|---|---|---|
| Meal plan / slots / plan items storage | Schema implemented | `nutrition_meal_plans`, `nutrition_plan_slots`, `nutrition_plan_items`; UI pending |
| Reusable templates | Schema foundation only | Template plan type exists; template workflows pending |
| Confirm planned meal into actual log | Not implemented | Planned items are not counted in actual totals |
| Optional meal suggestions | Not implemented | |
| Grocery lists and items storage | Schema implemented | `nutrition_grocery_lists`, `nutrition_grocery_items`; UI pending |
| Merge duplicate ingredients / quantities | Not implemented | |
| Subtract Home OS inventory | Not implemented | No Home contract wired |
| Send shopping needs to Home OS idempotently | Not implemented | Integration contract/event and receipt handling pending |

## F. Security, sync, import/export — P0

| Requirement | Status | Evidence / limitation |
|---|---|---|
| Shared account/workspace ownership | Implemented at foundation level | Existing platform session and workspace context |
| Server-side permission enforcement | Implemented | Workspace RLS via `ws_access_level(workspace_id, 'nutrition', 'main')`; edit policies and grants |
| RLS on Nutrition tables | Implemented | RLS enabled; anonymous grants denied; verified for current tables |
| Supabase persistence | Implemented | P0/P1 entities save to Supabase |
| Local cache for read fallback | Partial | Read fallback only; not a durable offline mutation queue |
| Offline write queue | Not implemented | |
| Multi-device sync | Partial | Server-backed online records; no explicit realtime subscription / conflict strategy |
| Idempotent replay / conflict resolution | Not implemented | Client operation IDs exist on some logs; no complete replay engine |
| JSON export / CSV import preview | Not implemented | |
| Account/workspace deletion lifecycle | Not implemented in Nutrition | Must align with Core retention/deletion workflow |
| Loading / error handling | Partial | Initial loading and visible errors exist; retry and operation-specific recovery need work |
| Arabic RTL / responsive UI | Implemented for initial screens | Full P2 screens and broader mobile QA pending |

## Cross-system integration

- **Core:** uses existing workspace/session and access contract; no separate Nutrition login.
- **Home OS:** not wired. Grocery-to-inventory/purchase contract, idempotency key, and result receipt remain.
- **Sports OS:** not wired; optional training-day context only after user authorization.
- **Habit OS:** not wired.
- **Finance OS:** not wired.
- **Today:** initial section is registered in the platform navigation; richer Today summary contract pending.

## Important source-data decision

The food catalog intentionally remains empty. No external catalog or barcode provider is enabled until licensing, attribution, data quality, coverage, update terms, and user-submitted data rights are reviewed. No Egyptian dish nutrition values or raw-to-cooked conversion factors are fabricated.

## Next implementation sequence

1. Finish P1 quality: true household portion profiles, edit quantity/unit with recalculation, food/meal CRUD edge cases and tests.
2. Build P2 recipe + batch calculation workflows.
3. Build goal evaluation, coverage-aware analytics and weekly review.
4. Build meal planner, grocery list and Home OS integration contract.
5. Add water/drink profiles, supplements, eating windows and notification delivery.
6. Add offline write queue, idempotent sync/conflict handling, JSON/CSV workflows, and deletion lifecycle.
7. Complete acceptance tests, security review, and only then remove Draft status / consider merge.
