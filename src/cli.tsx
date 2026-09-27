#!/usr/bin/env node
import React from 'react'
import { render } from 'ink'
import { ThemeProvider, defaultTheme } from '@inkjs/ui'
import { App } from './components/App.js'

render(
  <ThemeProvider theme={defaultTheme}>
    <App />
  </ThemeProvider>
)