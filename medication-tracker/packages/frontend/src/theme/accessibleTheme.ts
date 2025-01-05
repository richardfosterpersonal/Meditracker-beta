import { createTheme, PaletteMode, Theme } from '@mui/material';

declare module '@mui/material/styles' {
  interface Palette {
    highContrast?: {
      main: string;
      contrastText: string;
      background: string;
      border: string;
    };
  }
  interface PaletteOptions {
    highContrast?: {
      main: string;
      contrastText: string;
      background: string;
      border: string;
    };
  }
}

const getAccessibleTheme = (mode: PaletteMode | 'high-contrast'): Theme => {
  const baseTheme = createTheme({
    palette: {
      mode: mode === 'high-contrast' ? 'light' : mode,
      ...(mode === 'high-contrast' && {
        highContrast: {
          main: '#000000',
          contrastText: '#FFFFFF',
          background: '#FFFFFF',
          border: '#000000',
        },
        primary: {
          main: '#000000',
          contrastText: '#FFFFFF',
        },
        secondary: {
          main: '#000000',
          contrastText: '#FFFFFF',
        },
        background: {
          default: '#FFFFFF',
          paper: '#FFFFFF',
        },
        text: {
          primary: '#000000',
          secondary: '#000000',
        },
      }),
    },
    typography: {
      // Increase base font size for better readability
      fontSize: 16,
      fontFamily: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
      ].join(','),
      h1: {
        fontSize: '2.5rem',
        fontWeight: 600,
        lineHeight: 1.3,
      },
      h2: {
        fontSize: '2rem',
        fontWeight: 600,
        lineHeight: 1.3,
      },
      h3: {
        fontSize: '1.75rem',
        fontWeight: 600,
        lineHeight: 1.3,
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.5,
      },
      body2: {
        fontSize: '0.975rem',
        lineHeight: 1.5,
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            fontSize: '1rem',
            padding: '8px 16px',
            ...(mode === 'high-contrast' && {
              border: '2px solid #000000',
              '&:focus': {
                outline: '3px solid #000000',
                outlineOffset: '2px',
              },
            }),
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            ...(mode === 'high-contrast' && {
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderWidth: '2px',
                  borderColor: '#000000',
                },
              },
              '& .MuiInputLabel-root': {
                color: '#000000',
              },
            }),
          },
        },
      },
      MuiLink: {
        styleOverrides: {
          root: {
            ...(mode === 'high-contrast' && {
              color: '#000000',
              textDecorationThickness: '2px',
              '&:focus': {
                outline: '3px solid #000000',
                outlineOffset: '2px',
              },
            }),
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            ...(mode === 'high-contrast' && {
              border: '2px solid #000000',
              '&:focus': {
                outline: '3px solid #000000',
                outlineOffset: '2px',
              },
            }),
          },
        },
      },
    },
  });

  return createTheme(baseTheme, {
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            '&:focus-visible': {
              outline: `3px solid ${baseTheme.palette.primary.main}`,
              outlineOffset: '2px',
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            '&:focus-visible': {
              outline: `3px solid ${baseTheme.palette.primary.main}`,
              outlineOffset: '2px',
            },
          },
        },
      },
      MuiLink: {
        styleOverrides: {
          root: {
            '&:focus-visible': {
              outline: `3px solid ${baseTheme.palette.primary.main}`,
              outlineOffset: '2px',
            },
          },
        },
      },
    },
  });
};

export default getAccessibleTheme;
