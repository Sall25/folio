import { useEffect, useState } from "react";

export function useNewRecordSkeleton(
  recordCount: number,
  onNewRecord: () => void,
) {
  const [pendingBaseline, setPendingBaseline] = useState<number | null>(null);

  const start = () => {
    setPendingBaseline(recordCount);
    onNewRecord();
  };

  // Fully derived — the skeleton shows while a create is pending and the real
  // row hasn't landed. No stored `creating` flag, no setState-in-effect: once
  // recordCount grows past the baseline this evaluates false on the next
  // render on its own.
  const creating = pendingBaseline !== null && recordCount <= pendingBaseline;

  // Safety net only: clear the pending baseline after a timeout if the create
  // never resolves. setState is in the timer callback (async), which the lint
  // permits — it's not a synchronous cascade in the effect body.
  useEffect(() => {
    if (pendingBaseline === null) return;
    const t = window.setTimeout(() => setPendingBaseline(null), 4000);
    return () => window.clearTimeout(t);
  }, [pendingBaseline]);

  return { creating, start };
}
