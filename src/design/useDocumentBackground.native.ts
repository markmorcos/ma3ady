// No-op on native — SafeAreaView already paints the viewport. Only the
// web build needs to colour the html/body element because the centered
// max-width screen wrapper exposes whatever's underneath it (which is
// the browser default white).

export function useDocumentBackground(_color: string): void {
  // intentionally empty
}
