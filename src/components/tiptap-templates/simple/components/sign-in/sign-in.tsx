import { useState, type FormEvent } from "react";
import type { Provider } from "@supabase/supabase-js";
import { supabase } from "src/api/supabase-client";
import { Input } from "src/components/tiptap-ui-primitive/input";
import { Button } from "src/components/tiptap-ui-primitive/button";
import { FolioIcon } from "../sidebar/folio-icon";
import { PROVIDERS } from "./utils";
import "./sign-in.scss";

type Status = "idle" | "sending" | "sent" | "error";
type Mode = "signin" | "signup" | "magic-link";

export function SignIn() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [oauthPending, setOauthPending] = useState<Provider | null>(null);

  const resetFeedback = () => {
    setStatus("idle");
    setErrorMessage(null);
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    if (mode === "signup") {
      if (password.length < 8) {
        setStatus("error");
        setErrorMessage("Password must be at least 8 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setStatus("error");
        setErrorMessage("Passwords don't match.");
        return;
      }
    }

    setStatus("sending");
    setErrorMessage(null);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { name: name.trim() },
        },
      });

      if (error) {
        setStatus("error");
        setErrorMessage(error.message);
        return;
      }

      // Supabase sends a confirmation email before the session is active —
      // reuse the "check your email" screen rather than a separate state.
      setStatus("sent");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    // On success, useCurrentPerson's session listener picks this up and
    // AuthGate swaps to the app — nothing further to do here.
  };

  const handleMagicLinkSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("sending");
    setErrorMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin,
        data: { name: name.trim() },
      },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setStatus("sent");
  };

  const handleOAuth = async (provider: Provider) => {
    setOauthPending(provider);
    setErrorMessage(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });

    // On success this navigates away to the provider — no further UI state
    // needed. Only surface an error if the redirect never happens.
    if (error) {
      setOauthPending(null);
      setStatus("error");
      setErrorMessage(error.message);
    }
  };

  if (status === "sent") {
    return (
      <div className="sign-in">
        <div className="sign-in__card">
          <div className="sign-in__brand">
            <FolioIcon className="sign-in__brand-icon" />
          </div>
          <h1 className="sign-in__title">Check your email</h1>
          <p className="sign-in__subtitle">
            We sent {mode === "signup" ? "a confirmation" : "a sign-in"} link to{" "}
            <strong>{email}</strong>. Click it to continue — you can close this
            tab.
          </p>
          <button
            type="button"
            className="sign-in__link-button"
            onClick={() => {
              resetFeedback();
              setMode("signin");
            }}
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  const sending = status === "sending" || oauthPending !== null;

  return (
    <div className="sign-in">
      <div className="sign-in__card">
        <div className="sign-in__brand">
          <FolioIcon className="sign-in__brand-icon" />
        </div>

        <h1 className="sign-in__title">
          {mode === "signup"
            ? "Create your account"
            : mode === "magic-link"
              ? "Sign in with a link"
              : "Welcome to Folio"}
        </h1>
        <p className="sign-in__subtitle">
          {mode === "signup"
            ? "Set up your Folio account to get started."
            : mode === "magic-link"
              ? "Enter your email and we'll send you a link to sign in."
              : "Sign in to continue to Folio."}
        </p>

        {mode !== "magic-link" && (
          <>
            <div className="sign-in__providers">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="sign-in__provider-button"
                  onClick={() => handleOAuth(p.id)}
                  disabled={sending}
                >
                  <span className="sign-in__provider-icon">{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>

            <div className="sign-in__divider">
              <span>or</span>
            </div>
          </>
        )}

        <form
          className="sign-in__form"
          onSubmit={
            mode === "magic-link" ? handleMagicLinkSubmit : handlePasswordSubmit
          }
        >
          {mode === "signup" && (
            <Input
              type="text"
              className="sign-in__input"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={sending}
            />
          )}

          <Input
            type="email"
            className="sign-in__input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            required
            disabled={sending}
          />

          {mode !== "magic-link" && (
            <Input
              type="password"
              className="sign-in__input"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={sending}
              minLength={8}
            />
          )}

          {mode === "signup" && (
            <Input
              type="password"
              className="sign-in__input"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={sending}
              minLength={8}
            />
          )}

          {status === "error" && errorMessage && (
            <p className="sign-in__error">{errorMessage}</p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="large"
            className="sign-in__submit"
            disabled={
              sending || !email.trim() || (mode !== "magic-link" && !password)
            }
          >
            <span className="tiptap-button-text">
              {status === "sending"
                ? "Please wait..."
                : mode === "signup"
                  ? "Create account"
                  : mode === "magic-link"
                    ? "Send link"
                    : "Sign in"}
            </span>
          </Button>
        </form>

        <div className="sign-in__footer">
          {mode === "signin" && (
            <>
              <button
                type="button"
                className="sign-in__link-button"
                onClick={() => {
                  resetFeedback();
                  setMode("signup");
                }}
              >
                Don't have an account? Sign up
              </button>
              <button
                type="button"
                className="sign-in__link-button"
                onClick={() => {
                  resetFeedback();
                  setMode("magic-link");
                }}
              >
                Use a magic link instead
              </button>
            </>
          )}

          {mode === "signup" && (
            <button
              type="button"
              className="sign-in__link-button"
              onClick={() => {
                resetFeedback();
                setMode("signin");
              }}
            >
              Already have an account? Sign in
            </button>
          )}

          {mode === "magic-link" && (
            <button
              type="button"
              className="sign-in__link-button"
              onClick={() => {
                resetFeedback();
                setMode("signin");
              }}
            >
              Use a password instead
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
