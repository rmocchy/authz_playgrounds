import { createTheme } from "@mui/material/styles";

/** Default MUI theme for the playground FE (dark). */
export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#90caf9" },
    secondary: { main: "#ce93d8" },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});
