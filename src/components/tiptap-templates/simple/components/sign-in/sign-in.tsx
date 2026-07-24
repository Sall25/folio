import { useState, type FormEvent } from "react";
import { supabase } from "src/api/supabase-client";
import "./sign-in.scss";
import { Input } from "src/components/tiptap-ui-primitive/input";
import { Button } from "src/components/tiptap-ui-primitive/button";

type Status = "idle" | "sending" | "sent" | "error";

export function SignIn() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
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
        emailRedirectTo: window.location.origin,
        data: { name: name.trim() }, // matches raw_user_meta_data->>'name'
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
          <Input
            type="email"
            className="sign-in__input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            required
            disabled={status === "sending"}
          />

          <Input
            type="text"
            className="sign-in__input"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={status === "sending"}
          />

          {status === "error" && errorMessage && (
            <p className="sign-in__error">{errorMessage}</p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="large"
            style={{
              // display: "flex",
              // width: "100%",
              borderRadius: "var(--tt-radius-sm)",
              // justifyContent: "center",
              // alignItems: "center",
            }}
            // className="sign-in__submit"
            disabled={status === "sending" || !email.trim()}
          >
            <span
              className="tiptap-button-text"
              style={{ textAlign: "center" }}
            >
              {status === "sending" ? "Sending..." : "Send magic link"}
            </span>
          </Button>
        </form>
      </div>
    </div>
  );
}
