// "New question" in View options asks the form builder (a separate node
// view) to open its question menu: a DOM event, since the two don't share
// React state.

const EVENT = "folio:form-new-question";

export function requestNewQuestion(viewId: string) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { viewId } }));
}

export function onNewQuestionRequest(
  viewId: string,
  run: () => void,
): () => void {
  const listener = (e: Event) => {
    if ((e as CustomEvent<{ viewId: string }>).detail?.viewId === viewId) run();
  };
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
