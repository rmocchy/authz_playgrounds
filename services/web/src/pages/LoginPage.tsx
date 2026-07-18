import { useState, type FormEvent } from "react";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Nav from "react-bootstrap/Nav";
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
    <Card className="shadow-sm">
      <Card.Body className="p-4">
        <Card.Title as="h1" className="h3 mb-2">
          Authz Playground
        </Card.Title>
        <Card.Text className="text-secondary mb-3">
          Local login (not OIDC). Session cookie{" "}
          <code>playground_session</code> is set by Auth via the Vite proxy.
        </Card.Text>

        <Nav variant="tabs" className="mb-3" activeKey={mode}>
          <Nav.Item>
            <Nav.Link
              eventKey="login"
              onClick={() => setMode("login")}
              disabled={busy}
            >
              Login
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link
              eventKey="register"
              onClick={() => setMode("register")}
              disabled={busy}
            >
              Register
            </Nav.Link>
          </Nav.Item>
        </Nav>

        <Form onSubmit={onSubmit}>
          <Form.Group className="mb-3" controlId="loginId">
            <Form.Label>Login ID</Form.Label>
            <Form.Control
              autoComplete="username"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              required
              minLength={1}
              disabled={busy}
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="password">
            <Form.Label>Password</Form.Label>
            <Form.Control
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={1}
              disabled={busy}
            />
          </Form.Group>
          {error && (
            <Alert variant="danger" className="py-2">
              {error}
            </Alert>
          )}
          {info && (
            <Alert variant="success" className="py-2">
              {info}
            </Alert>
          )}
          <Button
            type="submit"
            variant="primary"
            className="w-100"
            disabled={busy || !loginId || !password}
          >
            {busy
              ? "Working…"
              : mode === "login"
                ? "Log in"
                : "Register & log in"}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
}
