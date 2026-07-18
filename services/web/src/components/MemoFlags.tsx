/**
 * global / secure toggles for memo create/edit.
 * Learning: non-owner can only read when global=true && secure=false.
 */
type Props = {
  global: boolean;
  secure: boolean;
  disabled?: boolean;
  onChange: (next: { global: boolean; secure: boolean }) => void;
};

export function MemoFlags({ global, secure, disabled, onChange }: Props) {
  return (
    <fieldset className="memo-flags" disabled={disabled}>
      <legend>Visibility flags</legend>
      <label className="flag">
        <input
          type="checkbox"
          checked={global}
          onChange={(e) => onChange({ global: e.target.checked, secure })}
        />
        <span>
          <strong>global</strong>
          <small> — others may read if not secure</small>
        </span>
      </label>
      <label className="flag">
        <input
          type="checkbox"
          checked={secure}
          onChange={(e) => onChange({ global, secure: e.target.checked })}
        />
        <span>
          <strong>secure</strong>
          <small> — owner-only even when global</small>
        </span>
      </label>
      <p className="hint">
        Authz matrix: non-owner can read only when{" "}
        <code>global=true</code> and <code>secure=false</code>.
      </p>
    </fieldset>
  );
}
