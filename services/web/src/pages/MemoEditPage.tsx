import { useEffect, useState, type FormEvent } from "react";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Spinner from "react-bootstrap/Spinner";
import Stack from "react-bootstrap/Stack";
import {
  errorMessage,
  memos,
  type Memo,
  type SessionMe,
} from "../api/client";
import { MemoFlags } from "../components/MemoFlags";

type Props = {
  user: SessionMe;
  /** null = create mode */
  memoId: string | null;
  onDone: () => void;
  onSaved: (id: string) => void;
};

export function MemoEditPage({ user, memoId, onDone, onSaved }: Props) {
  const isCreate = memoId === null;
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [global, setGlobal] = useState(false);
  const [secure, setSecure] = useState(false);
  const [memo, setMemo] = useState<Memo | null>(null);
  const [loading, setLoading] = useState(!isCreate);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isCreate || !memoId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const m = await memos.get(memoId);
        if (cancelled) return;
        setMemo(m);
        setTitle(m.title);
        setBody(m.body);
        setGlobal(m.global);
        setSecure(m.secure);
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isCreate, memoId]);

  const isOwner = isCreate || (memo !== null && memo.ownerId === user.id);
  const readOnly = !isCreate && memo !== null && !isOwner;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    setBusy(true);
    setError(null);
    try {
      if (isCreate) {
        const created = await memos.create({
          title,
          body,
          global,
          secure,
        });
        onSaved(created.id);
      } else if (memoId) {
        const updated = await memos.update(memoId, {
          title,
          body,
          global,
          secure,
        });
        setMemo(updated);
        onSaved(updated.id);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!memoId || !isOwner) return;
    if (!confirm("Delete this memo?")) return;
    setBusy(true);
    setError(null);
    try {
      await memos.delete(memoId);
      onDone();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Card className="shadow-sm">
        <Card.Body className="text-secondary">
          <Spinner animation="border" size="sm" className="me-2" />
          Loading memo…
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <Card.Body>
        <Stack
          direction="horizontal"
          className="justify-content-between align-items-center mb-3"
        >
          <Card.Title as="h2" className="h4 mb-0">
            {isCreate ? "New memo" : readOnly ? "View memo" : "Edit memo"}
          </Card.Title>
          <Button variant="outline-secondary" size="sm" onClick={onDone}>
            ← Back
          </Button>
        </Stack>

        {readOnly && (
          <Alert variant="info" className="py-2">
            You can read this memo (global &amp; non-secure) but only the owner
            can edit or delete it.
          </Alert>
        )}

        {error && (
          <Alert variant="danger" className="py-2">
            {error}
          </Alert>
        )}

        <Form onSubmit={onSubmit}>
          <Form.Group className="mb-3" controlId="memo-title">
            <Form.Label>Title</Form.Label>
            <Form.Control
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={busy || readOnly}
              placeholder="optional"
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="memo-body">
            <Form.Label>Body (Markdown)</Form.Label>
            <div data-color-mode="light" className="memo-md-editor">
              <MDEditor
                value={body}
                onChange={(v) => setBody(v ?? "")}
                height={320}
                preview={readOnly ? "preview" : "live"}
                hideToolbar={readOnly}
                textareaProps={{
                  placeholder: "# hello",
                  disabled: busy || readOnly,
                  required: !readOnly,
                }}
              />
            </div>
          </Form.Group>

          <div className="mb-3">
            <MemoFlags
              global={global}
              secure={secure}
              disabled={busy || readOnly}
              onChange={({ global: g, secure: s }) => {
                setGlobal(g);
                setSecure(s);
              }}
            />
          </div>

          {!readOnly && (
            <Stack direction="horizontal" gap={2}>
              <Button
                type="submit"
                variant="primary"
                disabled={busy || (!body && isCreate)}
              >
                {busy ? "Saving…" : isCreate ? "Create" : "Save"}
              </Button>
              {!isCreate && isOwner && (
                <Button
                  type="button"
                  variant="outline-danger"
                  disabled={busy}
                  onClick={() => void onDelete()}
                >
                  Delete
                </Button>
              )}
            </Stack>
          )}
        </Form>

        {memo && (
          <p className="text-secondary small mt-3 mb-0">
            id {memo.id} · owner{" "}
            {memo.ownerId === user.id ? "you" : memo.ownerId} · updated{" "}
            {new Date(memo.updatedAt).toLocaleString()}
          </p>
        )}
      </Card.Body>
    </Card>
  );
}
