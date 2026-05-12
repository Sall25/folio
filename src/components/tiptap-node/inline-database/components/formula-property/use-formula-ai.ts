import { useState, useCallback } from "react";

interface UseFormulaAIOptions {
  onResult: (formula: string) => void;
}

export function useFormulaAI({ onResult }: UseFormulaAIOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = useCallback(
    async (prompt: string, currentFormula: string) => {
      if (!prompt.trim()) return;
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1000,
            messages: [
              {
                role: "user",
                content: `You are a Notion formula assistant. The user is editing a Notion formula.

Current formula: ${currentFormula || "(empty)"}

User request: ${prompt}

Respond ONLY with the raw formula expression — no explanation, no markdown, no backticks. Just the formula string itself.

Examples of valid responses:
concat(Name, " - ", format(year(now())))
if(length(Name) > 10, slice(Name, 0, 10) + "...", Name)
prop("Priority") == "High"`,
              },
            ],
          }),
        });

        const data = await response.json();
        const text = data.content
          ?.filter((b: { type: string }) => b.type === "text")
          .map((b: { text: string }) => b.text)
          .join("")
          .trim();

        if (text) {
          onResult(text);
        } else {
          setError("No response from AI.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Request failed.");
      } finally {
        setLoading(false);
      }
    },
    [onResult],
  );

  return { ask, loading, error };
}
