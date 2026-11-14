# 08 — المرجع التقني

## Core files
- `src/systems/projects/index.jsx`: SCREENS، Router، shell navigation، routeContext، durable integration bridge، offline queue.
- `src/systems/projects/screens_a.jsx`: Dashboard/Today/Week/MyWork/Tasks/Portfolio.
- `src/systems/projects/screens_b.jsx`: Projects/ProjectWorkspace/ProjectDetail/Overview/Milestones/Timeline/Work/People/OKR/Finance/Activity.
- `src/systems/projects/screens_c.jsx`: OKR/Updates/Wins/Reviews/Contacts/Team/Templates/Meetings.
- `src/systems/projects/entities.jsx`: Outputs/Risks/Issues/Decisions/PRDs/Discovery.
- `src/systems/projects/parts.jsx`: ProjectForm/TaskForm/TaskTree/TaskSheet/SessionForm/Output attachment behavior.
- `src/systems/projects/store.jsx`: provider, domain/store, permissions, persistence-facing operations and derived indexes.

## Tests
حزمة الاختبارات الحالية في package.json تتضمن عقود Projects مثل domain، task tree، OKR relationships، portfolio، output upload، template writes، tree moves، atomic operations، lifecycle، traceability، permissions، saved views، automations، Finance sync، integration failure notifications، health transitions، Knowledge contracts، overview metrics وPhase 1 navigation.

## Build/Lint
الأوامر المطلوبة: `npm run build` و`npm run lint`. مركز التوثيق لا يضيف dependency جديدة.

## Safety
لا يحتوي مركز التوثيق على Secrets أو بيانات مستخدمين. لا ينشئ Supabase migrations أو tables.
