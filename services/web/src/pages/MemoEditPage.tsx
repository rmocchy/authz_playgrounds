import { type FormEvent, useEffect, useState } from "react";
import { errorMessage, type Memo, memos, type SessionMe } from "../api/client";
import { MemoFlags } from "../components/MemoFlags";

interface Props {
  user: SessionMe;
  /** null = create mode */
  memoId: string | null;
  onDone: () => void;
  onSaved: (id: string) => void;
}

interface Draft {
  title: string;
  body: string;
  global: boolean;
  secure: boolean;
}

interface FormState {
  draft: Draft;
  setTitle: (v: string) => void;
  setBody: (v: string) => void;
  setGlobal: (v: boolean) => void;
  setSecure: (v: boolean) => void;
  busy: boolean;
  readOnly: boolean;
  isCreate: boolean;
  isOwner: boolean;
  onSubmit: (e: FormEvent) => void;
  onDelete: () => void;
}

async function loadMemoDraft(
  memoId: string,
): Promise<{ memo: Memo; draft: Draft }> {
  const memo = await memos.get(memoId);
  return {
    memo,
    draft: {
      title: memo.title,
      body: memo.body,
      global: memo.global,
      secure: memo.secure,
    },
  };
}

async function saveDraft(
  isCreate: boolean,
  memoId: string | null,
  draft: Draft,
): Promise<Memo> {
  if (isCreate) {
    return memos.create(draft);
  }
  if (!memoId) {
    throw new Error("missing memo id");
  }
  return memos.update(memoId, draft);
}

function MemoEditForm(props: FormState) {
  const {
    draft,
    setTitle,
    setBody,
    setGlobal,
    setSecure,
    busy,
    readOnly,
    isCreate,
    isOwner,
    onSubmit,
    onDelete,
  } = props;

  return (
    <form onSubmit={onSubmit} className="form">
      <label>
        Title
        <input
          value={draft.title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={busy || readOnly}
          placeholder="optional"
        />
      </label>
      <label>
        Body (Markdown)
        <textarea
          value={draft.body}
          onChange={(e) => setBody(e.target.value)}
          required={!readOnly}
          rows={12}
          disabled={busy || readOnly}
          placeholder="# hello"
        />
      </label>

      <MemoFlags
        global={draft.global}
        secure={draft.secure}
        disabled={busy || readOnly}
        onChange={({ global: g, secure: s }) => {
          setGlobal(g);
          setSecure(s);
        }}
      />

      {!readOnly && (
        <div className="row actions">
          <button type="submit" disabled={busy || (!draft.body && isCreate)}>
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
  );
}

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
    if (isCreate || !memoId) {
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const loaded = await loadMemoDraft(memoId);
        if (cancelled) {
          return;
        }
        setMemo(loaded.memo);
        setTitle(loaded.draft.title);
        setBody(loaded.draft.body);
        setGlobal(loaded.draft.global);
        setSecure(loaded.draft.secure);
      } catch (err) {
        if (!cancelled) {
          setError(errorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isCreate, memoId]);

  const isOwner = isCreate || (memo !== null && memo.ownerId === user.id);
  const readOnly = !isCreate && memo !== null && !isOwner;
  const draft: Draft = { title, body, global, secure };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (readOnly) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const saved = await saveDraft(isCreate, memoId, draft);
      setMemo(saved);
      onSaved(saved.id);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!memoId || !isOwner) {
      return;
    }
    if (!confirm("Delete this memo?")) {
      return;
    }
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

  const heading = isCreate ? "New memo" : readOnly ? "View memo" : "Edit memo";

  return (
    <div className="panel">
      <div className="row between">
        <h2>{heading}</h2>
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

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <MemoEditForm
        draft={draft}
        setTitle={setTitle}
        setBody={setBody}
        setGlobal={setGlobal}
        setSecure={setSecure}
        busy={busy}
        readOnly={readOnly}
        isCreate={isCreate}
        isOwner={isOwner}
        onSubmit={(e) => void onSubmit(e)}
        onDelete={() => void onDelete()}
      />

      {memo && (
        <p className="meta muted">
          id {memo.id} · owner {memo.ownerId === user.id ? "you" : memo.ownerId}{" "}
          · updated {new Date(memo.updatedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
