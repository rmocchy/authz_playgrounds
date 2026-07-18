import { useCallback, useEffect, useState } from "react";
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
    <div className="panel">
      <div className="row between">
        <h2>Memos</h2>
        <button type="button" onClick={onCreate}>
          + New memo
        </button>
      </div>

      <div className="tabs" role="tablist">
        <button
          type="button"
          className={scope === "mine" ? "tab active" : "tab"}
          onClick={() => setScope("mine")}
        >
          Mine
        </button>
        <button
          type="button"
          className={scope === "readable" ? "tab active" : "tab"}
          onClick={() => setScope("readable")}
          title="Own memos + others' global (non-secure) memos"
        >
          Readable (incl. global)
        </button>
      </div>

      <p className="hint">
        scope=<code>{scope}</code>
        {scope === "readable"
          ? " — includes other users' global & non-secure memos"
          : " — only your memos"}
      </p>

      {error && <p className="error" role="alert">{error}</p>}
      {loading && <p className="muted">Loading…</p>}

      {!loading && items.length === 0 && (
        <p className="muted">No memos in this scope.</p>
      )}

      <ul className="memo-list">
        {items.map((m) => {
          const owned = m.ownerId === user.id;
          return (
            <li key={m.id} className="memo-card">
              <div className="row between">
                <button
                  type="button"
                  className="linkish"
                  onClick={() => onOpen(m.id)}
                >
                  <strong>{m.title || "(untitled)"}</strong>
                </button>
                <span className="badges">
                  {m.global && <span className="badge global">global</span>}
                  {m.secure && <span className="badge secure">secure</span>}
                  {!owned && <span className="badge other">others</span>}
                </span>
              </div>
              <p className="preview">{preview(m.body)}</p>
              <div className="row between meta">
                <span className="muted">
                  {owned ? "you" : `owner ${shortId(m.ownerId)}`} ·{" "}
                  {formatDate(m.updatedAt)}
                </span>
                <span className="actions">
                  <button type="button" onClick={() => onOpen(m.id)}>
                    {owned ? "Edit" : "View"}
                  </button>
                  {owned && (
                    <button
                      type="button"
                      className="danger"
                      onClick={() => void onDelete(m)}
                    >
                      Delete
                    </button>
                  )}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
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
