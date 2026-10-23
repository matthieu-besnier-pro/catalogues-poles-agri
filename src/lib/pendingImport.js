// Hands PDF files dropped on the catalogue list over to the import wizard
// they get routed to, without round-tripping them through router state
// (File objects don't survive history.pushState serialization reliably).
let pending = null;

export function setPendingImport(files) {
  pending = Array.from(files || []);
}

export function takePendingImport() {
  const files = pending;
  pending = null;
  return files;
}
