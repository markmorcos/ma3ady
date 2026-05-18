// TypeScript-facing entry; Metro selects `supabase.native.ts` or
// `supabase.web.ts` at bundle time. Keep the native re-export as the
// canonical type surface — the web variant exports the same shape.
export * from './supabase.native';
