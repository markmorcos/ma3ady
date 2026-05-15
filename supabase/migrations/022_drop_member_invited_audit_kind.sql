-- 022_drop_member_invited_audit_kind: remove the orphaned 'member.invited'
-- value from tenant_audit_event_kind. The team-invites feature was dropped
-- in 020, so nothing produces these events anymore.
--
-- Postgres can't drop an enum value in place, so we rename the old type,
-- create a clean one, migrate the column, and drop the old type. Any
-- historical rows still carrying kind='member.invited' are deleted first
-- (the feature was short-lived; preserving them is not worth a lossy
-- remap to another kind).

delete from public.tenant_audit_events where kind = 'member.invited';

alter type public.tenant_audit_event_kind rename to tenant_audit_event_kind_old;

create type public.tenant_audit_event_kind as enum (
  'tenant.updated',
  'member.added',
  'member.role_changed',
  'member.removed',
  'service.created',
  'service.updated',
  'service.deactivated',
  'service.activated',
  'service.removed',
  'availability_rule.created',
  'availability_rule.updated',
  'availability_rule.deleted',
  'availability_exception.created',
  'availability_exception.updated',
  'availability_exception.deleted'
);

alter table public.tenant_audit_events
  alter column kind type public.tenant_audit_event_kind
  using kind::text::public.tenant_audit_event_kind;

drop type public.tenant_audit_event_kind_old;
