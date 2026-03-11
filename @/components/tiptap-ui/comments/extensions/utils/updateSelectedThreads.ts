import type { Thread } from "../../types";

export function updateSelectedThreads(selectedThreads: Thread[], selectedThread: Thread,
  action: 'select' | 'unselect') {

  if (action === 'unselect') {
    selectedThreads = selectedThreads.filter(thread => thread.id === selectedThread.id)
    return selectedThreads
  }

  const alreadySelected = selectedThreads.some(thread => thread.id === selectedThread.id)
  if (alreadySelected) return selectedThreads

  selectedThreads.push(selectedThread)

  return selectedThreads
}