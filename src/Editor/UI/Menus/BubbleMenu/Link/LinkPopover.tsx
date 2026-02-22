import { useEffect, useRef, useState } from 'react';
import { Unlink, ExternalLink } from 'lucide-react';
import { Editor } from '@tiptap/react';

export function LinkPopover({
  editor,
}: {
  editor: Editor;
}) {
  const [url, setUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editor) return;

    const updateLink = () => {
      const href = editor.getAttributes('link').href ?? '';
      setUrl(href);
    };

    editor.on('selectionUpdate', updateLink);
    editor.on('transaction', updateLink);

    return () => {
      editor.off('selectionUpdate', updateLink);
      editor.off('transaction', updateLink);
    };
  }, [editor]);


  const applyLink = () => {
    if (!url) return;

    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: url })
      .run();
  };

  const removeLink = () => {
    editor.chain().focus().unsetLink().run();
  };


  return (
    <div
      className="link-popover"
    >
      <input
        ref={inputRef}
        value={url}
        onChange={e => setUrl(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && applyLink()}
        placeholder="Paste or type a link"
        className="
            flex-1 bg-transparent text-sm outline-none
            text-neutral-900 dark:text-neutral-100
          "
      />

      <div className="link-popover-actions">
        {editor.isActive('link') && (
          <button
            onClick={removeLink}
            className="btn-secondary"
          >
            <Unlink className="w-3 h-3" />
            Remove
          </button>
        )}

        <button
          onClick={applyLink}
          className="btn-primary"
        >
          <ExternalLink className="w-3 h-3" />
          Apply
        </button>
      </div>
    </div>
  );
}
