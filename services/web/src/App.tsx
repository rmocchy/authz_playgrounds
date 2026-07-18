import { useCallback, useEffect, useState } from "react";
import { auth, errorMessage, isApiError, type SessionMe } from "./api/client";
import { LoginPage } from "./pages/LoginPage";
import { MemoListPage } from "./pages/MemoListPage";
import { MemoEditPage } from "./pages/MemoEditPage";

type Route =
  | { name: "list" }
  | { name: "create" }
  | { name: "edit"; id: string };

export function App() {
  const [user, setUser] = useState<SessionMe | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [route, setRoute] = useState<Route>({ name: "list" });
  const [banner, setBanner] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    try {
      const me = await auth.me();
      setUser(me);
      return me;
    } catch (err) {
      if (isApiError(err) && err.status === 401) {
        setUser(null);
        return null;
      }
      // Network / proxy issues during boot — surface but stay logged out
      setUser(null);
      setBanner(errorMessage(err));
      return null;
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await refreshSession();
      setBootstrapping(false);
    })();
  }, [refreshSession]);

  async function logout() {
    setBanner(null);
    try {
      await auth.logout();
    } catch {
      // logout is best-effort (server always 204 when implemented)
    }
    setUser(null);
    setRoute({ name: "list" });
  }

  if (bootstrapping) {
    return (
      <div className="app shell">
        <p className="muted center">Checking session…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app shell">
        {banner && <p className="error" role="alert">{banner}</p>}
        <LoginPage
          onLoggedIn={(u) => {
            setBanner(null);
            setUser(u);
            setRoute({ name: "list" });
          }}
        />
      </div>
    );
  }

  return (
    <div className="app shell">
      <header className="topbar">
        <div>
          <strong>Authz Playground</strong>
          <span className="muted"> · signed in as {user.loginId}</span>
        </div>
        <button type="button" className="ghost" onClick={() => void logout()}>
          Log out
        </button>
      </header>

      {banner && <p className="error" role="alert">{banner}</p>}

      {route.name === "list" && (
        <MemoListPage
          user={user}
          onCreate={() => setRoute({ name: "create" })}
          onOpen={(id) => setRoute({ name: "edit", id })}
        />
      )}
      {route.name === "create" && (
        <MemoEditPage
          user={user}
          memoId={null}
          onDone={() => setRoute({ name: "list" })}
          onSaved={() => setRoute({ name: "list" })}
        />
      )}
      {route.name === "edit" && (
        <MemoEditPage
          user={user}
          memoId={route.id}
          onDone={() => setRoute({ name: "list" })}
          onSaved={() => setRoute({ name: "list" })}
        />
      )}
    </div>
  );
}
