import type { FragmentLinks } from './fragment-links.state.svelte.ts';
import type { PipelineDocument } from './pipeline-document.state.svelte.ts';

/**
 * What the editor holds and the server does not: the document, its fragment links, and a name
 * that is typed and not applied yet. A save keeps the version that it sends. When the save
 * succeeds, that version is the saved one: a change made while it was sent stays unsaved.
 */
export const createUnsavedChanges = (doc: PipelineDocument, links: FragmentLinks) => {
  // A new name of the document rebuilds the name field: the text typed in it goes too.
  let typedName = $derived(doc.pipelineName);
  const isDirty = $derived(doc.isDirty || links.isDirty || typedName.trim() !== doc.pipelineName);

  return {
    get isDirty() {
      return isDirty;
    },

    /** The text of the name field, at each key. */
    typeName(name: string) {
      typedName = name;
    },

    /** Keeps the version that a save sends. Call the function that it gives when the save succeeds. */
    send(): () => void {
      const script = doc.script;
      const sent = links.current;
      return () => {
        doc.markSaved(script);
        links.markSaved(sent);
      };
    },
  };
};
