#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import { ThemeProvider, defaultTheme } from "@inkjs/ui";
import { App } from "./App";

render(
  <ThemeProvider theme={defaultTheme}>
    <App />
  </ThemeProvider>,
  { exitOnCtrlC: false },
);
