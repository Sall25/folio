import { useState, useRef } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import { useFormulaAI } from "./use-formula-ai";

interface FormulaAIInputProps {
  currentFormula: string;
  onResult: (formula: string) => void;
}

export function FormulaAIInput({
  currentFormula,
  onResult,
}: FormulaAIInputProps) {
  const [prompt, setPrompt] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { ask, loading } = useFormulaAI({ onResult });

  const handleSubmit = () => {
    if (!prompt.trim() || loading) return;
    ask(prompt, currentFormula);
    setPrompt("");
  };

  return (
    <div className="fp-ai-bar">
      <span className="fp-ai-icon" aria-hidden>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
          <path
            d="M8 5v3l2 2"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      </span>

      <input
        ref={inputRef}
        className="fp-ai-input"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        placeholder="Write, fix, or explain a formula..."
        disabled={loading}
      />

      <button
        className={`fp-ai-send ${loading ? "fp-ai-send--loading" : ""}`}
        onClick={handleSubmit}
        disabled={loading || !prompt.trim()}
        aria-label="Send"
      >
        {loading ? (
          <Loader2 style={{ width: 14, height: 14 }} className="fp-spin" />
        ) : (
          <ArrowUp style={{ width: 14, height: 14 }} />
        )}
      </button>
    </div>
  );
}
