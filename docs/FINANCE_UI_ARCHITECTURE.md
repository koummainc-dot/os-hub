# Finance OS — UI Architecture Contract

## Single source of truth

Finance has one visual/UI orchestrator: `src/systems/finance/FinanceRedesign.jsx`.

`src/systems/finance/index.jsx` owns data loading, server actions, and OS integration only. It must not contain a second Finance renderer or a second navigation tree.

## Domain components

The following files are domain components, not independent Finance UIs:

- `Debts.jsx`
- `Assets.jsx`
- `Recurring.jsx`
- `Goals.jsx`
- `Family.jsx`
- `FamilyCash.jsx`
- `FXRates.jsx`
- `Reports.jsx`

They may own their domain data/forms, but their entry point, navigation, visual shell, and add-flow behavior are orchestrated by FinanceRedesign.

## Navigation rule

There is one Finance route map. A new section must be registered there first; do not add a parallel nav array inside another Finance component.

## Add-flow rule

Global Add is a chooser only:

Global Add → choose entity → modal/wizard opens over the current Finance page.

It must never navigate to another page merely to create a record.

Section-local Add follows the same modal/wizard contract.

## Wealth rule

Wealth is one section. Overview, assets/investments, and debts are subsections. Net worth is part of Wealth Overview and must not become a parallel top-level Finance screen.

## Planning rule

Planning is one section containing Budgets, Goals, and Reports. It must not create a second planning shell elsewhere.

## Shared data rule

All Finance screens read/write the same canonical Finance records and RPCs. UI components do not create local duplicate stores.

## Before adding anything

1. Search the existing FinanceRedesign route map.
2. Search for an existing domain component before creating a new one.
3. Reuse the existing add-flow and modal contract.
4. Add one contract test for the new route/flow.
5. Verify the same production deployment contains the change.

## Definition of done

A Finance change is not complete when a component exists in isolation. It is complete only when:

- it is reachable from the single Finance navigation;
- it uses the shared Finance visual language;
- its create/edit flow is connected to the common modal pattern;
- its data persists through the canonical Finance backend;
- its route works from both local and global entry points;
- its contract test passes;
- production is verified on the exact merged commit.
