import { history, redo, undo } from "@tiptap/pm/history";
import { Extension } from "@tiptap/react";

interface UndoRedoOptions {
  depth: number;

  newGroupDelay: number;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    undoRedo: {
      undo: () => ReturnType;
      redo: () => ReturnType;
    }
  }
}

export const UndoRedo = Extension.create<UndoRedoOptions>({
  name: 'undoRedo',

  addOptions() {
    return {
      depth: 100,
      newGroupDelay: 500
    }
  },

  addProseMirrorPlugins() {
    return [
      history(this.options)
    ]
  },

  addCommands() {
    return {
      undo: () => ({ state, dispatch }) => undo(state, dispatch),
      redo: () => ({ state, dispatch }) => redo(state, dispatch)
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-z': ({ editor }) => editor.commands.undo(),
      'Shift-Mod-z': ({ editor }) => editor.commands.redo(),
      'Mod y': ({ editor }) => editor.commands.redo()
    }
  }
});