import { DOMSerializer, type Node as PMNode } from 'prosemirror-model';
import { editorSchema } from './schema';

/**
 * Render a doc into v1-compatible HTML string so v1-era tools can consume the .otr file.
 * SPEC §6.1: v2 always writes both `text` (HTML) and `textDoc` (ProseMirror JSON).
 */
export function docToV1Html(doc: PMNode): string {
  const serializer = DOMSerializer.fromSchema(editorSchema);
  const fragment = serializer.serializeFragment(doc.content);
  const container = document.createElement('div');
  container.appendChild(fragment);
  return container.innerHTML;
}

export function docToPlainText(doc: PMNode): string {
  const parts: string[] = [];
  doc.forEach((block) => {
    const seg: string[] = [];
    block.forEach((inline) => {
      if (inline.isText) seg.push(inline.text ?? '');
      else if (inline.type.name === 'timestamp') seg.push(`[${inline.attrs.time}]`);
    });
    parts.push(seg.join(''));
  });
  return parts.join('\n');
}
