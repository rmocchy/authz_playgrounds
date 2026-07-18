import { useEffect, useState, type FormEvent } from "react";
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
      <div className="panel">
        <p className="muted">Loading memo…</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="row between">
        <h2>
          {isCreate ? "New memo" : readOnly ? "View memo" : "Edit memo"}
        </h2>
        <button type="button" className="ghost" onClick={onDone}>
          ← Back
        </button>
      </div>

      {readOnly && (
        <p className="info">
          You can read this memo (global &amp; non-secure) but only the owner
          can edit or delete it.
        </p>
      )}

      {error && <p className="error" role="alert">{error}</p>}

      <form onSubmit={onSubmit} className="form">
        <label>
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={busy || readOnly}
            placeholder="optional"
          />
        </label>
        <label>
          Body (Markdown)
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required={!readOnly}
            rows={12}
            disabled={busy || readOnly}
            placeholder="# hello"
          />
        </label>

        <MemoFlags
          global={global}
          secure={secure}
          disabled={busy || readOnly}
          onChange={({ global: g, secure: s }) => {
            setGlobal(g);
            setSecure(s);
          }}
        />

        {!readOnly && (
          <div className="row actions">
            <button type="submit" disabled={busy || (!body && isCreate)}>
              {busy ? "Saving…" : isCreate ? "Create" : "Save"}
            </button>
            {!isCreate && isOwner && (
              <button
                type="button"
                className="danger"
                disabled={busy}
                onClick={() => void onDelete()}
              >
                Delete
              </button>
            )}
          </div>
        )}
      </form>

      {memo && (
        <p className="meta muted">
          id {memo.id} · owner {memo.ownerId === user.id ? "you" : memo.ownerId}{" "}
          · updated {new Date(memo.updatedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
