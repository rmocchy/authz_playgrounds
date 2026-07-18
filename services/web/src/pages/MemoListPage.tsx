import { useCallback, useEffect, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Nav from "react-bootstrap/Nav";
import Spinner from "react-bootstrap/Spinner";
import Stack from "react-bootstrap/Stack";
import {
  errorMessage,
  memos,
  type Memo,
  type MemoListScope,
  type SessionMe,
} from "../api/client";

type Props = {
  user: SessionMe;
  onCreate: () => void;
  onOpen: (id: string) => void;
};

export function MemoListPage({ user, onCreate, onOpen }: Props) {
  const [scope, setScope] = useState<MemoListScope>("mine");
  const [items, setItems] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await memos.list(scope);
      setItems(list.items);
    } catch (err) {
      setError(errorMessage(err));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onDelete(m: Memo) {
    if (m.ownerId !== user.id) return;
    if (!confirm(`Delete memo “${m.title || "(untitled)"}”?`)) return;
    try {
      await memos.delete(m.id);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <Card className="shadow-sm">
      <Card.Body>
        <Stack
          direction="horizontal"
          className="justify-content-between align-items-center mb-3"
        >
          <Card.Title as="h2" className="h4 mb-0">
            Memos
          </Card.Title>
          <Button variant="primary" onClick={onCreate}>
            + New memo
          </Button>
        </Stack>

        <Nav
          variant="tabs"
          className="mb-2"
          activeKey={scope}
          onSelect={(k) => {
            if (k === "mine" || k === "readable") setScope(k);
          }}
        >
          <Nav.Item>
            <Nav.Link eventKey="mine">Mine</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link
              eventKey="readable"
              title="Own memos + others' global (non-secure) memos"
            >
              Readable (incl. global)
            </Nav.Link>
          </Nav.Item>
        </Nav>

        <p className="text-secondary small mb-3">
          scope=<code>{scope}</code>
          {scope === "readable"
            ? " — includes other users' global & non-secure memos"
            : " — only your memos"}
        </p>

        {error && (
          <Alert variant="danger" className="py-2">
            {error}
          </Alert>
        )}
        {loading && (
          <p className="text-secondary mb-0">
            <Spinner animation="border" size="sm" className="me-2" />
            Loading…
          </p>
        )}

        {!loading && items.length === 0 && (
          <p className="text-secondary mb-0">No memos in this scope.</p>
        )}

        <Stack gap={3} className="mt-3">
          {items.map((m) => {
            const owned = m.ownerId === user.id;
            return (
              <Card key={m.id} className="border">
                <Card.Body className="py-3">
                  <Stack
                    direction="horizontal"
                    className="justify-content-between align-items-start gap-2"
                  >
                    <Button
                      variant="link"
                      className="p-0 text-start text-decoration-none"
                      onClick={() => onOpen(m.id)}
                    >
                      <strong>{m.title || "(untitled)"}</strong>
                    </Button>
                    <Stack direction="horizontal" gap={1} className="flex-wrap">
                      {m.global && (
                        <Badge bg="primary" pill>
                          global
                        </Badge>
                      )}
                      {m.secure && (
                        <Badge bg="warning" text="dark" pill>
                          secure
                        </Badge>
                      )}
                      {!owned && (
                        <Badge bg="success" pill>
                          others
                        </Badge>
                      )}
                    </Stack>
                  </Stack>
                  <Card.Text className="text-secondary small mb-2 mt-2">
                    {preview(m.body)}
                  </Card.Text>
                  <Stack
                    direction="horizontal"
                    className="justify-content-between align-items-center flex-wrap gap-2"
                  >
                    <span className="text-secondary small">
                      {owned ? "you" : `owner ${shortId(m.ownerId)}`} ·{" "}
                      {formatDate(m.updatedAt)}
                    </span>
                    <Stack direction="horizontal" gap={2}>
                      <Button
                        size="sm"
                        variant="outline-primary"
                        onClick={() => onOpen(m.id)}
                      >
                        {owned ? "Edit" : "View"}
                      </Button>
                      {owned && (
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => void onDelete(m)}
                        >
                          Delete
                        </Button>
                      )}
                    </Stack>
                  </Stack>
                </Card.Body>
              </Card>
            );
          })}
        </Stack>
      </Card.Body>
    </Card>
  );
}

function preview(body: string, max = 120): string {
  const one = body.replace(/\s+/g, " ").trim();
  if (one.length <= max) return one || "(empty)";
  return `${one.slice(0, max)}…`;
}

function shortId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
