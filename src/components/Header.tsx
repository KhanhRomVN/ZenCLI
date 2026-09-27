import React from 'react'
import { Box, Text } from 'ink'

/**
 * Status bar / header displayed at the top of every screen.
 */
export function Header(): React.JSX.Element {
  return (
    <Box
      flexDirection="row"
      justifyContent="space-between"
      borderStyle="single"
      borderColor="cyan"
      paddingX={1}
    >
      <Text bold color="cyan">ZenCLI</Text>
      <Text dimColor>v0.1.0</Text>
    </Box>
  )
}