/**
 * global / secure toggles for memo create/edit.
 * Learning: non-owner can only read when global=true && secure=false.
 */
import {
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  FormLabel,
  Paper,
} from "@mui/material";

type Props = {
  global: boolean;
  secure: boolean;
  disabled?: boolean;
  onChange: (next: { global: boolean; secure: boolean }) => void;
};

export function MemoFlags({ global, secure, disabled, onChange }: Props) {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <FormControl component="fieldset" disabled={disabled} variant="standard">
        <FormLabel component="legend">Visibility flags</FormLabel>
        <FormGroup>
          <FormControlLabel
            control={
              <Checkbox
                checked={global}
                onChange={(e) => onChange({ global: e.target.checked, secure })}
              />
            }
            label={
              <>
                <strong>global</strong>
                {" — others may read if not secure"}
              </>
            }
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={secure}
                onChange={(e) => onChange({ global, secure: e.target.checked })}
              />
            }
            label={
              <>
                <strong>secure</strong>
                {" — owner-only even when global"}
              </>
            }
          />
        </FormGroup>
        <FormHelperText sx={{ mx: 0 }}>
          Authz matrix: non-owner can read only when <code>global=true</code>{" "}
          and <code>secure=false</code>.
        </FormHelperText>
      </FormControl>
    </Paper>
  );
}
