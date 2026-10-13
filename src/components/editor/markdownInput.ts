import { Extension, InputRule } from "@tiptap/react";
import { Plugin } from "@tiptap/pm/state";
import { linkAddress, pastedMarkdown } from "@/editor/import/pasted";

/** `[words](address)` up to the caret, as the closing bracket is typed. */
const TYPED_LINK = /\[([^\]\n]+)\]\(([^)\s]+)\)$/;

/**
 * Markdown the editor would otherwise leave as typed: a link written as
 * `[words](address)`, and anything pasted as plain text.
 */
export const MarkdownInput = Extension.create({
  name: "markdownInput",

  addInputRules() {
    return [
      new InputRule({
        find: TYPED_LINK,
        handler: ({ state, range, match }) => {
          const href = linkAddress(match[2]);
          if (!href) return null;
          const link = state.schema.marks.link;
          state.tr.replaceWith(range.from, range.to, state.schema.text(match[1], [link.create({ href })])).removeStoredMark(link);
        },
      }),
    ];
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        props: {
          handlePaste: (_view, event) => {
            const clipboard = event.clipboardData;
            if (!clipboard) return false;
            // A code editor copies its colours along as HTML; what it holds is still the text.
            if (clipboard.getData("text/html") && !clipboard.types.includes("vscode-editor-data")) return false;
            const nodes = pastedMarkdown(clipboard.getData("text/plain"));
            return nodes ? editor.commands.insertContent(nodes) : false;
          },
        },
      }),
    ];
  },
});
