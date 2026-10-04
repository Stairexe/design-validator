/**
 * Adobe XD UXP entry point: "Plugins → Export for Design Validator".
 * Exports the selected artboards (or every artboard) as a JSON manifest to
 * upload in Design Validator (Project → Add design source → Adobe XD).
 */
import { buildManifest } from './scenegraph';
import type { XdSceneNode } from './scene-types';

declare const require: (id: string) => unknown;

interface Selection {
  items: XdSceneNode[];
}

interface UxpStorage {
  localFileSystem: {
    getFileForSaving(
      name: string,
      options: { types: string[] },
    ): Promise<{ write(data: string): Promise<void>; name: string } | null>;
  };
}

const isArtboard = (node: XdSceneNode) => node.constructor.name === 'Artboard';

async function exportManifest(selection: Selection, documentRoot: XdSceneNode): Promise<void> {
  const all: XdSceneNode[] = [];
  documentRoot.children?.forEach((node) => {
    if (isArtboard(node)) all.push(node);
  });
  const selected = selection.items.filter(isArtboard);
  const artboards = selected.length > 0 ? selected : all;
  if (artboards.length === 0) {
    showMessage('No artboards found. Create or select an artboard first.');
    return;
  }
  const application = require('application') as { activeDocument?: { name?: string } };
  const manifest = buildManifest(application.activeDocument?.name ?? 'Untitled.xd', artboards);
  const { storage } = require('uxp') as { storage: UxpStorage };
  const file = await storage.localFileSystem.getFileForSaving('design-validator-manifest.json', {
    types: ['json'],
  });
  if (!file) return;
  await file.write(JSON.stringify(manifest, null, 2));
  showMessage(
    `Exported ${artboards.length} artboard(s) to ${file.name}. Upload it in Design Validator.`,
  );
}

function showMessage(message: string): void {
  const dialog = document.createElement('dialog');
  const text = document.createElement('p');
  text.textContent = message;
  const button = document.createElement('button');
  button.textContent = 'OK';
  button.setAttribute('uxp-variant', 'cta');
  button.onclick = () => dialog.close();
  dialog.append(text, button);
  document.body.appendChild(dialog);
  dialog.showModal();
}

module.exports = { commands: { exportManifest } };
