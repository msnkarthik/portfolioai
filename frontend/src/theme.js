import { createTheme } from '@mui/material/styles';

// Use fallback (hard-coded) values for MUI's palette (since MUI's color-manipulator does not support CSS variables).
// In production, you'd load your CSS variables (dark.css) before creating the theme or use a custom palette augmentation.
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1db954', // fallback for var(--md-sys-color-primary) (green, instead of purple, for better contrast on dark theme)
      contrastText: '#ffffff', // fallback for var(--md-sys-color-on-primary)
    },
    secondary: {
      main: '#03dac6', // fallback for var(--md-sys-color-secondary)
      contrastText: '#000000', // fallback for var(--md-sys-color-on-secondary)
    },
    background: {
      default: '#121212', // fallback for var(--md-sys-color-background)
      paper: '#1e1e1e', // fallback for var(--md-sys-color-surface)
    },
    surface: {
      main: '#1e1e1e', // fallback for var(--md-sys-color-surface)
      contrastText: '#ffffff', // fallback for var(--md-sys-color-on-surface)
    },
    error: {
      main: '#cf6679', // fallback for var(--md-sys-color-error)
      contrastText: '#000000', // fallback for var(--md-sys-color-on-error)
    },
    text: {
      primary: '#ffffff', // fallback for var(--md-sys-color-on-background)
      secondary: '#b0b0b0', // fallback for var(--md-sys-color-on-surface-variant)
    },
    divider: '#333333', // fallback for var(--md-sys-color-outline)
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily: `'DM Sans', sans-serif`, // default for all text
    h1: { fontFamily: `'AbeeZee', sans-serif` },
    h2: { fontFamily: `'AbeeZee', sans-serif` },
    h3: { fontFamily: `'AbeeZee', sans-serif` },
    h4: { fontFamily: `'AbeeZee', sans-serif` },
    h5: { fontFamily: `'AbeeZee', sans-serif` },
    h6: { fontFamily: `'AbeeZee', sans-serif` },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

export default theme; 