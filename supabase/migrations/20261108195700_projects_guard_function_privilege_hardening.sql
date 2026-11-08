-- Harden Projects relationship guard: it is trigger-only and must not be exposed as an RPC endpoint.
revoke all on function public.projects_guard_entity_relationships() from public, anon, authenticated;
