import { useState, type FormEvent } from "react";
import { auth, errorMessage } from "../api/client";
import type { SessionMe } from "../api/client";

type Props = {
  onLoggedIn: (user: SessionMe) => void;
};

export function LoginPage({ onLoggedIn }: Props) {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === "register") {
        await auth.register({ loginId, password });
        setInfo("Registered. Logging in…");
      }
      const user = await auth.login({ loginId, password });
      onLoggedIn({ id: user.id, loginId: user.loginId });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel auth-panel">
      <h1>Authz Playground</h1>
      <p className="lede">
        Local login (not OIDC). Session cookie{" "}
        <code>playground_session</code> is set by Auth via the Vite proxy.
      </p>

      <div className="tabs" role="tablist">
        <button
          type="button"
          className={mode === "login" ? "tab active" : "tab"}
          onClick={() => setMode("login")}
        >
          Login
        </button>
        <button
          type="button"
          className={mode === "register" ? "tab active" : "tab"}
          onClick={() => setMode("register")}
        >
          Register
        </button>
      </div>

      <form onSubmit={onSubmit} className="form">
        <label>
          Login ID
          <input
            autoComplete="username"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            required
            minLength={1}
            disabled={busy}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={1}
            disabled={busy}
          />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        {info && <p className="info">{info}</p>}
        <button type="submit" disabled={busy || !loginId || !password}>
          {busy ? "Working…" : mode === "login" ? "Log in" : "Register & log in"}
        </button>
      </form>
    </div>
  );
}
