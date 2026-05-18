// Web "restart" is just a hard page reload.
export async function reloadApp(): Promise<void> {
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
}
