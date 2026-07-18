/**
 * global / secure toggles for memo create/edit.
 * Learning: non-owner can only read when global=true && secure=false.
 */
import Form from "react-bootstrap/Form";

type Props = {
  global: boolean;
  secure: boolean;
  disabled?: boolean;
  onChange: (next: { global: boolean; secure: boolean }) => void;
};

export function MemoFlags({ global, secure, disabled, onChange }: Props) {
  return (
    <fieldset className="border rounded p-3" disabled={disabled}>
      <legend className="float-none w-auto px-2 fs-6 fw-semibold mb-0">
        Visibility flags
      </legend>
      <Form.Check
        type="checkbox"
        id="flag-global"
        className="mb-2"
        checked={global}
        disabled={disabled}
        onChange={(e) => onChange({ global: e.target.checked, secure })}
        label={
          <>
            <strong>global</strong>
            <span className="text-secondary"> — others may read if not secure</span>
          </>
        }
      />
      <Form.Check
        type="checkbox"
        id="flag-secure"
        className="mb-2"
        checked={secure}
        disabled={disabled}
        onChange={(e) => onChange({ global, secure: e.target.checked })}
        label={
          <>
            <strong>secure</strong>
            <span className="text-secondary"> — owner-only even when global</span>
          </>
        }
      />
      <Form.Text className="text-secondary d-block">
        Authz matrix: non-owner can read only when{" "}
        <code>global=true</code> and <code>secure=false</code>.
      </Form.Text>
    </fieldset>
  );
}
