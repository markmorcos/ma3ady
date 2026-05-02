-- 001_init: foundational extensions.
-- pgcrypto: gen_random_uuid() for primary keys.
-- btree_gist: required for the EXCLUDE constraint on `appointments` (define-services-and-appointments).

create extension if not exists pgcrypto;
create extension if not exists btree_gist;
