Summary
- Suggestion is a small utility (a ProseMirror plugin helper) used by Tiptap to provide trigger-based inline suggestions (e.g. @mentions, #tags, /slash-commands).
- It detects typed triggers, creates a suggestion state + inline decoration, calls your items() function to fetch matches (sync or async), and exposes lifecycle hooks (render.onStart/onUpdate/onExit/onKeyDown) so you can render a popup UI and handle keyboard selection.
- You use Suggestion inside an Extension by returning a ProseMirror plugin (via addProseMirrorPlugins) and wiring command/items/render to create and insert content when a suggestion is selected.

What Suggestion does (important bits)
- Detects a trigger character (char, default '@') and a contiguous query using findSuggestionMatch (customizable).
- Keeps plugin state: active, range, query, text, decorationId, composing flag.
- Provides a Decoration for the trigger/query text so the editor can style it while suggestion UI is open.
- Calls your items({ editor, query }) to produce suggestion items. items may return a Promise.
- Calls a render() function you provide which returns lifecycle handlers: onBeforeStart, onStart, onBeforeUpdate, onUpdate, onExit, onKeyDown.
  - These handlers receive SuggestionProps including clientRect/decorationNode so you can position your popup.
- Exposes a safe API to exit suggestions programmatically: exitSuggestion(view, pluginKey).

Key options you’ll use
- char: trigger character, e.g. '/'
- allowedPrefixes: characters that may come before the trigger (or null to allow any)
- allowSpaces / allowToIncludeChar: for query parsing
- startOfLine: only match when trigger is at start of line
- items: (props) => I[] | Promise<I[]> (supply list of commands filtered by query)
- command: called when an item is chosen: command({ editor, range, props }) — here you insert content
- render: returns handlers to mount/position/update/dismiss UI
- shouldShow / allow: additional guards to prevent showing suggestion (collab, permissions, etc.)
- findSuggestionMatch: you can supply your own matching logic if you need custom parsing

Minimal example: Slash command extension
Below is a minimal self-contained example to add a slash command. The renderer uses a tiny DOM popup and keyboard handling. This example demonstrates the typical flow: detect '/', fetch items, show popup positioned at decoration, select an item with Enter (or clicks), run command to insert content, and close.

```ts
// slash-command.ts
import { Extension } from '@tiptap/core'
import { Suggestion, exitSuggestion, SuggestionPluginKey } from '@tiptap/suggestion' // path depends on your setup
import type { Editor } from '@tiptap/core'
import type { SuggestionProps } from '@tiptap/suggestion'

type SlashItem = { id: string; title: string; command: (editor: Editor) => void }

function createPopup() {
  const el = document.createElement('div')
  el.className = 'slash-popup'
  el.style.position = 'absolute'
  el.style.zIndex = '1000'
  el.style.minWidth = '180px'
  el.style.background = 'white'
  el.style.border = '1px solid #ddd'
  el.style.borderRadius = '4px'
  el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'
  el.style.padding = '6px'
  el.hidden = true
  document.body.appendChild(el)
  return el
}

export default Extension.create({
  name: 'slash-command',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        startOfLine: true,
        decorationClass: 'slash-suggestion',
      },
      // example commands
      commands: [
        { id: 'h1', title: 'Heading 1', command: (editor: Editor) => editor.chain().focus().setNode('heading', { level: 1 }).run() },
        { id: 'p', title: 'Paragraph', command: (editor: Editor) => editor.chain().focus().setParagraph().run() },
        { id: 'blockquote', title: 'Blockquote', command: (editor: Editor) => editor.chain().focus().toggleBlockquote().run() },
      ] as SlashItem[],
    }
  },

  onCreate() {
    // nothing
  },

  addProseMirrorPlugins() {
    const editor = this.editor
    const popup = createPopup()
    let items: SlashItem[] = []
    let selectedIndex = 0

    function renderItems(list: SlashItem[], query: string) {
      popup.innerHTML = ''
      if (!list.length) {
        popup.innerHTML = `<div class="empty">No commands</div>`
        return
      }
      list.forEach((item, i) => {
        const row = document.createElement('div')
        row.className = 'slash-item'
        row.textContent = item.title
        row.style.padding = '6px 8px'
        row.style.cursor = 'pointer'
        if (i === selectedIndex) {
          row.style.background = '#f2f2f2'
        }
        row.onmousedown = (e) => {
          // prevent editor blur
          e.preventDefault()
          // execute after mousedown to allow suggestion plugin to still have correct range
          item.command(editor)
          // close suggestion
          exitSuggestion(editor.view)
        }
        popup.appendChild(row)
      })
    }

    function setPopupPosition(rect: DOMRect | null) {
      if (!rect) {
        popup.hidden = true
        return
      }
      popup.hidden = false
      // Basic placement below the trigger
      popup.style.left = `${rect.left + window.scrollX}px`
      popup.style.top = `${rect.bottom + window.scrollY + 4}px`
    }

    const suggestion = Suggestion<SlashItem>({
      editor,
      char: '/',
      startOfLine: true,
      decorationClass: 'slash-suggestion',
      items: ({ query }) => {
        const q = (query || '').toLowerCase()
        return this.options.commands.filter((c: SlashItem) => c.title.toLowerCase().includes(q))
      },
      command: ({ editor, range, props }) => {
        // props is the selected SlashItem
        props.command(editor)
      },
      render: () => {
        return {
          onStart: (props: SuggestionProps<SlashItem>) => {
            // Reset state when starting
            items = props.items
            selectedIndex = 0
            renderItems(items, props.query || '')
            setPopupPosition(props.clientRect?.() ?? null)
          },

          onUpdate: (props: SuggestionProps<SlashItem>) => {
            items = props.items
            selectedIndex = Math.min(selectedIndex, items.length - 1)
            renderItems(items, props.query || '')
            setPopupPosition(props.clientRect?.() ?? null)
          },

          onExit: (_props) => {
            popup.hidden = true
            popup.innerHTML = ''
          },

          onKeyDown: ({ event, range }) => {
            if (event.key === 'ArrowDown') {
              selectedIndex = Math.min(selectedIndex + 1, items.length - 1)
              renderItems(items, '')
              return true
            }
            if (event.key === 'ArrowUp') {
              selectedIndex = Math.max(0, selectedIndex - 1)
              renderItems(items, '')
              return true
            }
            if (event.key === 'Enter') {
              const item = items[selectedIndex]
              if (item) {
                item.command(editor)
                exitSuggestion(editor.view)
                return true
              }
            }
            if (event.key === 'Escape') {
              // let Suggestion handle the escape flow (default already does), but returning false here
              // would allow the plugin to handle it normally.
              return false
            }
            return false
          },
        }
      },
    })

    return [suggestion]
  },
})
```

How to add the extension to your editor
- Import and include it in your editor extensions array:

```ts
import StarterKit from '@tiptap/starter-kit'
import SlashCommand from './slash-command'

const editor = new Editor({
  element: document.querySelector('#editor'),
  extensions: [StarterKit, SlashCommand],
  content: '<p>Type / at the start of a line to open commands</p>',
})
```

Notes, tips, and common patterns
- Positioning: use props.clientRect() supplied to your render callbacks to position your popup exactly at the trigger. Suggestion provides a clientRect that uses either the decoration node bounding rect or the editor cursor anchor.
- Decoration: the plugin adds an inline decoration (decorationTag, decorationClass) so the trigger text can be styled (e.g. highlighted while the UI is active).
- Async items: items() can return a Promise. Suggestion awaits items in the plugin view update before calling onUpdate/onStart.
- Keyboard: implement onKeyDown in render to capture arrow/enter/escape. If you return true the plugin won’t handle it further.
- Programmatic exit: call exitSuggestion(view, pluginKey) to close suggestion (recommended vs manually removing decoration).
- Multiple triggers: you can create multiple Suggestion-enabled extensions with different pluginKey or different char settings (e.g. @ mention and / commands).
- startOfLine: for slash commands, set startOfLine: true so it only opens at the beginning of a paragraph/line.
- allowSpaces vs allowToIncludeChar: choose based on whether the query can contain spaces or include the trigger character itself.

Advanced
- Use a full renderer (React/Vue/Svelte) by mounting a component in onStart, keeping a reference to props.clientRect, updating it in onUpdate, and unmounting in onExit.
- To support collaboration or special cases, use shouldShow and allow hooks to control whether local/local-remote typed triggers should open a suggestion.

Conclusion
Suggestion is the standard building block to add trigger-based small UIs (mentions, tags, slash commands) in Tiptap. You configure matching + items + command and implement a render object to show/update/dismiss a popup. The example above is a complete, minimal slash command extension pattern you can adapt to your UI framework and command set.