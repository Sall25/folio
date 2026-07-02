import { useState, type FormEvent } from "react";
import { supabase } from "src/api/supabase-client";
import "./sign-in.scss";

type Status = "idle" | "sending" | "sent" | "error";

export function SignIn() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("sending");
    setErrorMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        // Where Supabase redirects after the person clicks the email link.
        // Must match a Redirect URL you've allow-listed in
        // Authentication > URL Configuration in the Supabase dashboard.
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setStatus("sent");
  };

  if (status === "sent") {
    return (
      <div className="sign-in">
        <div className="sign-in__card">
          <h1 className="sign-in__title">Check your email</h1>
          <p className="sign-in__subtitle">
            We sent a sign-in link to <strong>{email}</strong>. Click it to
            continue — you can close this tab.
          </p>
          <button
            type="button"
            className="sign-in__link-button"
            onClick={() => setStatus("idle")}
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sign-in">
      <div className="sign-in__card">
        <h1 className="sign-in__title">Sign in to Folio</h1>
        <p className="sign-in__subtitle">
          Enter your email and we'll send you a link to sign in.
        </p>

        <form className="sign-in__form" onSubmit={handleSubmit}>
          <input
            type="email"
            className="sign-in__input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            required
            disabled={status === "sending"}
          />

          {status === "error" && errorMessage && (
            <p className="sign-in__error">{errorMessage}</p>
          )}

          <button
            type="submit"
            className="sign-in__submit"
            disabled={status === "sending" || !email.trim()}
          >
            {status === "sending" ? "Sending..." : "Send magic link"}
          </button>
        </form>
      </div>
    </div>
  );
}
