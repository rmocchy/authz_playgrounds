import {
  Alert,
  AppBar,
  Box,
  Button,
  CircularProgress,
  Container,
  Toolbar,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { auth, errorMessage, isApiError, type SessionMe } from "./api/client";
import { LoginPage } from "./pages/LoginPage";
import { MemoEditPage } from "./pages/MemoEditPage";
import { MemoListPage } from "./pages/MemoListPage";

type Route =
  | { name: "list" }
  | { name: "create" }
  | { name: "edit"; id: string };

export function App() {
  const [user, setUser] = useState<SessionMe | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
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
      setSessionLoading(false);
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

  if (sessionLoading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <CircularProgress size={28} />
        <Typography color="text.secondary">Checking session…</Typography>
      </Box>
    );
  }

  if (!user) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        {banner && (
          <Alert severity="error" sx={{ mb: 2 }} role="alert">
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
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="static" elevation={1}>
        <Toolbar sx={{ gap: 1, flexWrap: "wrap" }}>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Authz Playground
            <Typography
              component="span"
              variant="body2"
              sx={{ ml: 1, opacity: 0.85 }}
            >
              · signed in as {user.loginId}
            </Typography>
          </Typography>
          <Button color="inherit" onClick={() => void logout()}>
            Log out
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 3 }}>
        {banner && (
          <Alert severity="error" sx={{ mb: 2 }} role="alert">
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
    </Box>
  );
}
