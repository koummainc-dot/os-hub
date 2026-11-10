# Finance OS — Rebuild Foundation

الحالة: Foundation معتمد للتنفيذ، قبل أي production migration.

## 1. القرارات الحاكمة

- المستخدمون الأساسيون: Owner، Family Member، Accountant.
- كل شخص مستخدم مستقل بحساب Koumma.
- كل مستخدم يمكن أن يملك عدة Financial Accounts مستقلة.
- Owner يحدد صلاحيات كل Accountant صراحة.
- Family Member يرى بياناته المالية الشخصية فقط، وOwner يرى إنفاقه الممول/المسموح به.
- تخصيص مصروف الأسرة يظهر كمصروف عند Owner وكدخل عند Family Member.
- لا يوجد دور PM أو Viewer في Foundation إلا إذا أضيف لاحقًا بقرار مستقل.
- Projects OS مستقل عن Finance OS.
- أي Project يمكن أن يكون Financial أو Non-financial.
- Koumma ليس كيانًا خاصًا في Finance؛ هو مجرد Project عادي.
- لا توجد Company Finance مستقلة عن Projects؛ الشركة/المشروع المالي هو سياق اختياري للمشروع عند الحاجة.
- Finance هو محرك مالي مركزي، وProjects يرسل إليه سياق المشروع فقط عندما يكون المشروع ماليًا.

## 2. قاعدة الحقيقة المالية

1. Transactions هي مصدر الحقيقة.
2. Account balance مشتق من opening balance + posted entries، وليس قيمة حقيقة مستقلة.
3. التحويل بين حسابين ليس دخلًا ولا مصروفًا.
4. لا عد مزدوج للنقد كحساب ولأصل.
5. القيمة غير المقيّمة لا تعامل كصفر ولا تدخل الإجماليات.
6. الفترة المقفلة لا تعدّل إلا بإعادة فتح مسجلة.
7. كل كتابة مالية حساسة تتم عبر server-side RPC محمي وAudit Log.
8. الواجهة لا تحسب الحقيقة المالية.

## 3. Core entities

### users
مصدره هو نظام مستخدمي Koumma المركزي، وليس Finance-specific user table.

### finance_books
يمثل سياقًا ماليًا:
- Personal
- Family
- Project financial context

لا يُنشأ Book خاص باسم Koumma.

الحقول الأساسية:
- id
- owner_user_id
- type
- name
- base_currency
- status
- created_at
- updated_at

### finance_book_members
صلاحية المستخدم على Book.

- id
- book_id
- user_id
- membership_type
- status
- created_at

لا تعني membership وحدها أن المستخدم يرى كل البيانات؛ الوصول الفعلي يمر عبر permission rules.

### finance_permissions
صلاحيات صريحة قابلة للتخصيص.

- id
- user_id
- book_id
- permission_key
- effect
- granted_by
- created_at
- updated_at

Permission examples:
- book.view
- account.view
- account.manage
- transaction.view
- transaction.create
- transaction.edit
- transaction.approve
- transaction.reverse
- category.manage
- budget.manage
- report.view
- reconcile
- project_finance.view
- project_finance.manage
- family.view_allocations
- family.view_member_spend
- family.manage_allocations

لا يتم إنشاء Role جديد لمجرد احتياج صلاحية جديدة.

## 4. Financial accounts

### finance_accounts

الحساب المالي مملوك لمستخدم أو Book حسب السياق، ويمكن أن يملك المستخدم عدة حسابات.

الحقول الأساسية:
- id
- book_id
- owner_user_id
- name
- account_type
- currency
- opening_balance
- opening_balance_date
- institution_name nullable
- status
- archived_at nullable
- created_at
- updated_at

account_type examples:
- cash
- bank
- wallet
- savings
- card
- other

قاعدة:
- الحساب البنكي/النقدي ليس Asset منفصلًا.
- الأصول مثل عقار/ذهب/استثمار لها entities منفصلة وترتبط بحسابات وحركاتها عند الحاجة.

## 5. Categories

### finance_categories
- id
- book_id nullable
- parent_id nullable
- name
- kind: income | expense | transfer
- account_mapping_id nullable
- active
- created_at
- updated_at

التصنيف هو واجهة المستخدم، وليس حساب الأستاذ الذي يراه المستخدم العادي.

Category -> Account mapping هو الذي يحدد القيد المحاسبي.

## 6. Transactions

### finance_transactions
- id
- book_id
- owner_user_id
- transaction_type
- amount
- currency
- account_id
- category_id nullable
- transaction_date
- description
- merchant nullable
- context_type nullable
- context_id nullable
- status
- source
- recurring_id nullable
- created_by
- updated_by
- created_at
- updated_at
- reversed_transaction_id nullable

transaction_type:
- income
- expense
- transfer
- adjustment
- refund

status:
- draft
- pending
- posted
- reversed

قاعدة:
- لا يوجد delete للـ posted transaction.
- التصحيح يتم بعكس الحركة أو adjustment حسب الحالة.

## 7. Journal engine

### finance_journal_entries
- id
- book_id
- transaction_id
- entry_date
- status
- description
- created_at

### finance_journal_lines
- id
- journal_entry_id
- account_id
- debit
- credit
- currency
- fx_rate nullable

Invariant:
- مجموع debit = مجموع credit.
- كل posted transaction لها journal entry.
- journal entries ليست واجهة المستخدم اليومية.

مثال شخصي:
مصروف طعام 250 من Cash:

Debit Food 250
Credit Cash 250

## 8. Family

### finance_family_members
- id
- family_book_id
- user_id
- relationship
- display_name
- short_name
- color
- status
- created_at
- updated_at

user_id إلزامي في النموذج الجديد لأن كل فرد له حساب Koumma مستقل.

### finance_family_allocations
تمثل المبلغ الذي يخصصه Owner لفرد.

- id
- family_book_id
- member_user_id
- payer_user_id
- amount
- currency
- frequency
- due_date
- effective_from
- effective_to nullable
- status
- confirmed_transaction_id nullable
- created_at
- updated_at

عند التأكيد:
- Owner side: expense
- Member side: income
- العملية idempotent.
- لا يتم إنشاء قيدين مستقلين غير مترابطين.

### finance_family_spend_attributions
طبقة تنسب الإنفاق إلى فرد بدون تغيير مبلغ الحركة.

- id
- transaction_id
- member_user_id
- mode
- amount
- percentage
- created_at

لا تغير attribution مبلغ الحركة أو حسابها.

## 9. Family privacy

General:
- short name / color.

Family:
- budgets
- allocations
- family distributions
- custody

Sensitive:
- private personal fields.

Sensitive data:
- لا يظهر في global search.
- لا يظهر في chips.
- لا يظهر في previews.
- كل access يسجل في Audit Log.

Family Member:
- يرى حساباته وحركاته الشخصية.
- يرى تخصيصاته وإنفاقه المنسوب إليه.
- لا يرى حسابات Owner أو أفراد آخرين.

Owner:
- يرى Family Book وما تسمح به قواعد الملكية.

## 10. Projects bridge

Projects لا يعتمد على Finance لوجود المشروع.

في Projects:

financial_scope:
- none
- finance

إذا finance:
- ينشأ/يرتبط finance_project_context.

### finance_project_context
- id
- project_id
- finance_book_id
- enabled
- base_currency
- created_at
- updated_at

العلاقة:
Projects Project 1 -> 0..1 Financial Context

Koumma لا يحتاج special flag أو special code؛ إذا اختير له financial_scope=finance يعامل مثل أي مشروع آخر.

Project finance transactions تحمل:
- context_type = project
- context_id = project_id

ولا تستخدم Project Finance لإنشاء نظام محاسبي ثانٍ.

## 11. Project financial data

المواصفة الحالية تدعم:
- contracts
- scheduled payments
- payment links
- obligations
- obligation links
- funding
- time entries

تظل هذه entities مرتبطة بـ project_id، والحركات المالية الفعلية تظل في finance_transactions.

## 12. Books and navigation

واجهة Book Switcher تعرض:
- شخصي
- العائلة
- المشاريع المالية المتاحة للمستخدم

لا تعرض مشروعًا غير مالي داخل Finance.

UI rule:
Quick Add = تسجيل
Tab = مراجعة
Settings = إعداد

## 13. Lifecycle

### Personal expense

Quick Add:
1. اختيار Expense.
2. account.
3. category.
4. amount.
5. date.
6. save.
7. server RPC.
8. journal post.
9. balance/report projections update.

### Family allocation

Owner:
1. يختار فردًا.
2. يحدد المبلغ والدورية.
3. يؤكد.
4. يسجل Owner expense.
5. يسجل Member income.
6. links both sides.
7. Member balance/report updates.

### Project expense

Project:
1. financial_scope must be finance.
2. user with permission records expense.
3. transaction gets project context.
4. accounting engine posts journal.
5. Finance aggregates.
6. Project P&L reads Finance result.

## 14. Non-goals for this phase

- لا Company entity مستقل.
- لا PM role جديد.
- لا Viewer role.
- لا special Koumma finance logic.
- لا تغيير production DB.
- لا إعادة بناء Projects الآن.
- لا إضافة features تجميلية.

## 15. Required acceptance tests before migration

1. User owns multiple financial accounts.
2. Account isolation between users.
3. Personal expense posts exactly one balanced journal.
4. Transfer does not affect income/expense totals.
5. Family allocation creates Owner expense + Member income as one linked operation.
6. Double-confirm allocation is idempotent.
7. Member cannot read another member's accounts.
8. Accountant access is denied by default and granted only by explicit permission.
9. Accountant permissions can differ by Book and action.
10. Non-financial Project cannot receive project finance transactions.
11. Financial Project can receive project-context transactions.
12. Koumma project has no special Finance path.
13. Posted transactions cannot be hard-deleted.
14. Reversal preserves audit trail.
15. Global search never leaks Family Sensitive data.

## 16. Implementation order

Phase F0 — Foundation contract
- this document
- schema contract tests
- permission matrix tests

Phase F1 — Data model
- migrations
- RLS
- RPC write layer
- audit

Phase F2 — Accounts + Transactions
- accounts
- categories
- Quick Add
- transaction detail
- journal engine

Phase F3 — Family
- members
- allocations
- member accounts
- attribution
- privacy

Phase F4 — Planning
- budgets
- goals
- recurring

Phase F5 — Wealth / debts / reports

Phase F6 — Projects bridge
- project financial scope
- financial context
- project transaction links
- project P&L

Phase F7 — acceptance + deployment
- real two-account tests
- reload persistence
- permissions
- migration reconciliation
- production verification
