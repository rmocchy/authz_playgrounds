import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { type FormEvent, useState } from "react";
import type { SessionMe } from "../api/client";
import { auth, errorMessage } from "../api/client";

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
    <Card variant="outlined" sx={{ mt: 2 }}>
      <CardContent>
        <Typography variant="h4" component="h1" gutterBottom>
          Authz Playground
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Local login (not OIDC). Session cookie{" "}
          <Box component="code" sx={{ fontSize: "0.9em" }}>
            playground_session
          </Box>{" "}
          is set by Auth via the Vite proxy.
        </Typography>

        <Tabs
          value={mode}
          onChange={(_, v: "login" | "register") => setMode(v)}
          sx={{ mb: 2 }}
        >
          <Tab label="Login" value="login" />
          <Tab label="Register" value="register" />
        </Tabs>

        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={2}>
            <TextField
              label="Login ID"
              autoComplete="username"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              required
              fullWidth
              disabled={busy}
            />
            <TextField
              label="Password"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              disabled={busy}
            />
            {error && (
              <Alert severity="error" role="alert">
                {error}
              </Alert>
            )}
            {info && <Alert severity="success">{info}</Alert>}
            <Button
              type="submit"
              variant="contained"
              disabled={busy || !loginId || !password}
              fullWidth
            >
              {busy
                ? "Working…"
                : mode === "login"
                  ? "Log in"
                  : "Register & log in"}
            </Button>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}
