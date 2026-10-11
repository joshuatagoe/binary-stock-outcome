// Generates the program's TypeScript client from the committed IDL with Codama (D22, D125).
//   npm run client                         writes clients/ts/src/generated
// `npm run verify` imports generateClient() into a temporary folder and compares, so a stale client fails.
// After changing the program: in WSL, `bash scripts/program/build.sh` copies the new IDL to clients/idl.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createFromRoot } from 'codama';
import { rootNodeFromAnchor } from '@codama/nodes-from-anchor';
import { renderVisitor } from '@codama/renderers-js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const IDL = join(ROOT, 'clients', 'idl', 'meridian.json');
export const PACKAGE = join(ROOT, 'clients', 'ts');
export const GENERATED = 'src/generated';

// packageFolder: where src/generated goes. Node 24 runs the result directly: no enums, and .ts imports.
export async function generateClient(packageFolder = PACKAGE) {
  const codama = createFromRoot(rootNodeFromAnchor(JSON.parse(readFileSync(IDL, 'utf8'))));
  await codama.accept(renderVisitor(packageFolder, {
    generatedFolder: GENERATED,
    deleteFolderBeforeRendering: true,
    formatCode: true,
    syncPackageJson: false,
    erasableSyntax: true,
    importExtension: 'ts',
  }));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await generateClient();
  console.log(`generated ${join('clients', 'ts', GENERATED)} from clients/idl/meridian.json`);
}
