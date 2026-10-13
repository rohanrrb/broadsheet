"use client";

import { useMemo } from "react";
import { BubbleMenu } from "@tiptap/react/menus";
import { NodeSelection } from "@tiptap/pm/state";
import { useEditorState, type Editor } from "@tiptap/react";
import { BOLD, HEADING, ITALIC, QUOTE, SUBHEAD, normalizeHref, type FormatControl } from "./controls";
import { Control } from "./Control";
import { InlineField } from "./InlineField";
import styles from "./controls.module.css";

interface SelectionMenuProps {
  editor: Editor;
  linkOpen: boolean;
  onLinkOpenChange: (open: boolean) => void;
}

/** Floats over a selection: inline styles and links for text, a caption field for photos. */
export function SelectionMenu({ editor, linkOpen, onLinkOpenChange }: SelectionMenuProps) {
  const imageSelected = useEditorState({ editor, selector: ({ editor: e }) => isImageSelection(e) });
  const options = useMemo(() => ({ placement: "top" as const, offset: 8, onHide: () => onLinkOpenChange(false) }), [onLinkOpenChange]);

  return (
    <BubbleMenu editor={editor} options={options} className={styles.bubble}>
      {imageSelected ? (
        <CaptionField key={editor.state.selection.from} editor={editor} />
      ) : linkOpen ? (
        <LinkField editor={editor} onDone={() => onLinkOpenChange(false)} />
      ) : (
        <FormatButtons editor={editor} onLink={() => onLinkOpenChange(true)} />
      )}
    </BubbleMenu>
  );
}

const INLINE = [BOLD, ITALIC] as const;
const BLOCK = [HEADING, SUBHEAD, QUOTE] as const;

function FormatButtons({ editor, onLink }: { editor: Editor; onLink: () => void }) {
  const active = useEditorState({
    editor,
    selector: ({ editor: e }): Record<string, boolean> => ({
      ...Object.fromEntries([...INLINE, ...BLOCK].map((c) => [c.id, c.isActive(e)])),
      link: e.isActive("link"),
    }),
  });
  const button = (control: FormatControl) => (
    <Control key={control.id} hint={control.hint} active={active[control.id]} onPress={() => control.run(editor)}>
      <span className={styles[control.id]}>{control.label}</span>
    </Control>
  );
  return (
    <div className={styles.group}>
      {INLINE.map(button)}
      <Control hint="Link (⌘/Ctrl K)" active={active.link} onPress={onLink}>
        Link
      </Control>
      <span className={styles.divider} aria-hidden />
      {BLOCK.map(button)}
    </div>
  );
}

function LinkField({ editor, onDone }: { editor: Editor; onDone: () => void }) {
  const current = editor.getAttributes("link").href as string | undefined;
  const apply = (value: string) => {
    const href = normalizeHref(value);
    if (!href) return "Use a web address (https://…) or an email.";
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    onDone();
    return null;
  };
  const unlink = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    onDone();
  };
  return (
    <InlineField
      label="Link address"
      placeholder="Paste a link"
      initialValue={current ?? ""}
      submitLabel="Apply"
      onSubmit={apply}
      onCancel={() => {
        onDone();
        editor.commands.focus();
      }}
      extra={current ? { label: "Unlink", run: unlink } : undefined}
    />
  );
}

function CaptionField({ editor }: { editor: Editor }) {
  const alt = (editor.getAttributes("image").alt as string | null) ?? "";
  const save = (value: string) => {
    editor.chain().focus().updateAttributes("image", { alt: value.trim() || null }).run();
    return null;
  };
  return (
    <InlineField
      label="Photo caption"
      placeholder="Caption (optional)"
      initialValue={alt}
      submitLabel="Save"
      onSubmit={save}
      onCancel={() => editor.commands.focus()}
      extra={{ label: "Remove", run: () => editor.chain().focus().deleteSelection().run() }}
    />
  );
}

function isImageSelection(editor: Editor): boolean {
  const { selection } = editor.state;
  return selection instanceof NodeSelection && selection.node.type.name === "image";
}
