import { useEffect, useRef, useState } from 'react';
import { Link, Unlink, ExternalLink } from 'lucide-react';
import { Editor } from '@tiptap/react';

export function LinkPopover({
  editor,
  onClose,
  open
}: {
  editor: Editor;
  onClose: () => void;
  open: boolean
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

    onClose();
  };

  const removeLink = () => {
    editor.chain().focus().unsetLink().run();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="
      absolute top-full mt-2 z-50
      w-64 rounded-lg border border-neutral-200
      bg-white dark:bg-neutral-900
      shadow-lg p-2
    ">
      <div className="flex items-center gap-2">
        <Link className="w-4 h-4 text-neutral-500" />
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
      </div>

      <div className="flex justify-between mt-2">
        {editor.isActive('link') && (
          <button
            onClick={removeLink}
            className="flex items-center gap-1 text-xs text-red-500"
          >
            <Unlink className="w-3 h-3" />
            Remove
          </button>
        )}

        <button
          onClick={applyLink}
          className="ml-auto flex items-center gap-1 text-xs text-cyan-600"
        >
          <ExternalLink className="w-3 h-3" />
          Apply
        </button>
      </div>
    </div>
  );
}
