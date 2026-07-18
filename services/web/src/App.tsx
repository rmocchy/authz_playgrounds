import { useCallback, useEffect, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Container from "react-bootstrap/Container";
import Navbar from "react-bootstrap/Navbar";
import Spinner from "react-bootstrap/Spinner";
import Stack from "react-bootstrap/Stack";
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
      <Container className="py-5 text-center text-secondary">
        <Spinner animation="border" size="sm" className="me-2" />
        Checking session…
      </Container>
    );
  }

  if (!user) {
    return (
      <Container className="py-4" style={{ maxWidth: 520 }}>
        {banner && (
          <Alert variant="danger" dismissible onClose={() => setBanner(null)}>
            {banner}
          </Alert>
        )}
        <LoginPage
          onLoggedIn={(u) => {
            setBanner(null);
            setUser(u);
            setRoute({ name: "list" });
          }}
        />
      </Container>
    );
  }

  return (
    <>
      <Navbar bg="dark" variant="dark" className="mb-3">
        <Container style={{ maxWidth: 760 }}>
          <Navbar.Brand className="fw-semibold">Authz Playground</Navbar.Brand>
          <Stack direction="horizontal" gap={2} className="ms-auto">
            <Navbar.Text className="me-2">
              signed in as <strong>{user.loginId}</strong>
            </Navbar.Text>
            <Button
              variant="outline-light"
              size="sm"
              onClick={() => void logout()}
            >
              Log out
            </Button>
          </Stack>
        </Container>
      </Navbar>

      <Container className="pb-5" style={{ maxWidth: 760 }}>
        {banner && (
          <Alert variant="danger" dismissible onClose={() => setBanner(null)}>
            {banner}
          </Alert>
        )}

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
      </Container>
    </>
  );
}
