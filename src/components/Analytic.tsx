import React from 'react';
import { Box, Text } from 'ink';

interface AnalyticProps {
  totalTokens: number;
  requestCount: number;
  onClose: () => void;
}

/**
 * Terminal-friendly Analytics Dashboard.
 * Displays high-level usage statistics passed directly from App state.
 */
export function Analytic({ totalTokens, requestCount, onClose }: AnalyticProps): React.JSX.Element {
  
  const avgTokensPerReq = requestCount > 0 
    ? Math.round(totalTokens / requestCount) 
    : 0;

  return (
    <Box flexDirection="column">
      <Text bold color="yellow">Session Analytics</Text>
      <Text dimColor>Current session usage statistics.</Text>
      
      <Box marginTop={1} gap={4}>
        <Box flexDirection="column" width="33%">
          <Text bold dimColor>TOTAL TOKENS</Text>
          <Text color="green" bold>{totalTokens.toLocaleString()}</Text>
        </Box>

        <Box flexDirection="column" width="33%">
          <Text bold dimColor>REQUESTS</Text>
          <Text color="blue" bold>{requestCount}</Text>
        </Box>

        <Box flexDirection="column" width="33%">
          <Text bold dimColor>AVG / REQ</Text>
          <Text color="magenta" bold>{avgTokensPerReq.toLocaleString()}</Text>
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>{"Esc to close"}</Text>
      </Box>
    </Box>
  );
}