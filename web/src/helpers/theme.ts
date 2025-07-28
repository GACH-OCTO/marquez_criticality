// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { createTheme } from '@mui/material'

export const theme = createTheme({
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '@global': {
          body: {
            color: '#fff',
          },
        },
        '.MuiInputBase-root': {
          paddingTop: '0',
          paddingBottom: '0',
        },
      },
    },
  },
  typography: {
    fontFamily: 'Karla',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
    },
    h3: {
      fontSize: '1rem',
      fontWeight: 600,
    },
    fontSize: 14,
  },
  palette: {
    mode: 'dark',
    primary: {
      main: '#71ddbf',
    },
    error: {
      main: '#ee7b7b',
    },
    warning: {
      main: '#FFB74D',
    },
    success: {
      main: '#4CAF50',
    },
    info: {
      main: '#9c98ec',
    },
    background: {
      default: '#191f26',
    },
    secondary: {
      main: '#454f5b',
    },
    vital: {
      main: '#EB75C5',
      light: '#F2A6DA',
      dark: '#A11775',
      contrastText: '#fff',
    },
    personnel: {
      main: '#E3DF76',
      light: '#EAE799', 
      dark: '#BAB526',  
      contrastText: '#000', 
    },
    strategique: {
      main: '#40A6FF',
      light: '#ADD9FF',
      dark: '#0062B8',
      contrastText: '#fff',
    },
  },
  zIndex: {
    snackbar: 9999,
  },
})

import { PaletteColor } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    personnel: PaletteColor;
    vital: PaletteColor;
    strategique: PaletteColor;
  }

  interface PaletteOptions {
    personnel?: PaletteColor;
    vital?: PaletteColor;
    strategique?: PaletteColor;
  }
}

export const THEME_EXTRA = {
  typography: {
    subdued: '#abb1bd',
    disabled: '#8d9499',
  },
}

// 1px for bottom border
export const HEADER_HEIGHT = 64 + 1
export const DRAWER_WIDTH = 80
