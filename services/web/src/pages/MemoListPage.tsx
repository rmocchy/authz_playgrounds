import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import {
  errorMessage,
  type Memo,
  type MemoListScope,
  memos,
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
    <Card variant="outlined">
      <CardContent>
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            mb: 1,
          }}
        >
          <Typography variant="h5" component="h2">
            Memos
          </Typography>
          <Button variant="contained" onClick={onCreate}>
            + New memo
          </Button>
        </Stack>

        <Tabs
          value={scope}
          onChange={(_, v: MemoListScope) => setScope(v)}
          sx={{ mb: 1 }}
        >
          <Tab label="Mine" value="mine" />
          <Tab
            label="Readable (incl. global)"
            value="readable"
            title="Own memos + others' global (non-secure) memos"
          />
        </Tabs>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          scope=
          <Box component="code" sx={{ fontSize: "0.9em" }}>
            {scope}
          </Box>
          {scope === "readable"
            ? " — includes other users' global & non-secure memos"
            : " — only your memos"}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} role="alert">
            {error}
          </Alert>
        )}

        {loading && (
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ alignItems: "center", py: 2 }}
          >
            <CircularProgress size={22} />
            <Typography color="text.secondary">Loading…</Typography>
          </Stack>
        )}

        {!loading && items.length === 0 && (
          <Typography color="text.secondary">
            No memos in this scope.
          </Typography>
        )}

        <Stack spacing={1.5} sx={{ mt: 1 }}>
          {items.map((m) => {
            const owned = m.ownerId === user.id;
            return (
              <Card key={m.id} variant="outlined">
                <CardContent sx={{ pb: 1 }}>
                  <Stack
                    direction="row"
                    spacing={1}
                    useFlexGap
                    sx={{
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                    }}
                  >
                    <Button
                      variant="text"
                      onClick={() => onOpen(m.id)}
                      sx={{
                        p: 0,
                        minWidth: 0,
                        textAlign: "left",
                        justifyContent: "flex-start",
                        fontWeight: 600,
                        textTransform: "none",
                      }}
                    >
                      {m.title || "(untitled)"}
                    </Button>
                    <Stack
                      direction="row"
                      spacing={0.5}
                      useFlexGap
                      sx={{ flexWrap: "wrap" }}
                    >
                      {m.global && (
                        <Chip size="small" color="primary" label="global" />
                      )}
                      {m.secure && (
                        <Chip size="small" color="warning" label="secure" />
                      )}
                      {!owned && (
                        <Chip size="small" color="success" label="others" />
                      )}
                    </Stack>
                  </Stack>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.75 }}
                  >
                    {preview(m.body)}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 1, display: "block" }}
                  >
                    {owned ? "you" : `owner ${shortId(m.ownerId)}`} ·{" "}
                    {formatDate(m.updatedAt)}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button size="small" onClick={() => onOpen(m.id)}>
                    {owned ? "Edit" : "View"}
                  </Button>
                  {owned && (
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteOutlinedIcon />}
                      onClick={() => void onDelete(m)}
                    >
                      Delete
                    </Button>
                  )}
                </CardActions>
              </Card>
            );
          })}
        </Stack>
      </CardContent>
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
