import { extendTheme } from '@chakra-ui/react';

const colors = {
  brand: {
    primary: '#2B6CB0',    // Trustworthy Blue
    success: '#48BB78',    // Calming Green
    text: '#718096',       // Warm Gray
    background: '#F7FAFC', // Soft White
    alert: '#ED8936',      // Alert Orange
    accent: '#805AD5'      // Focus Purple
  }
};

const fonts = {
  heading: 'Inter, Arial, system-ui, sans-serif',
  body: 'Inter, Arial, system-ui, sans-serif'
};

const components = {
  Button: {
    baseStyle: {
      borderRadius: 'md',
      _focus: {
        boxShadow: `0 0 0 3px ${colors.brand.accent}40`
      }
    },
    variants: {
      primary: {
        bg: 'brand.primary',
        color: 'white',
        _hover: {
          bg: 'brand.primary',
          opacity: 0.9
        }
      },
      secondary: {
        border: '2px solid',
        borderColor: 'brand.primary',
        color: 'brand.primary',
        _hover: {
          bg: 'brand.primary',
          color: 'white'
        }
      }
    },
    defaultProps: {
      variant: 'primary'
    }
  },
  Alert: {
    variants: {
      error: {
        container: {
          bg: 'red.50'
        }
      },
      success: {
        container: {
          bg: 'brand.success',
          color: 'white'
        }
      }
    }
  }
};

const theme = extendTheme({
  colors,
  fonts,
  components,
  styles: {
    global: {
      body: {
        bg: 'brand.background',
        color: 'brand.text'
      }
    }
  }
});

export default theme;
