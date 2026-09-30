import React, { useState } from 'react'
import { Box, Text, useInput } from 'ink'

type PromptLength = 'none' | 'short' | 'medium' | 'long';
type CodeStyle = 'standard' | 'functional' | 'oop';

interface PromptConfigProps {
  onClose: () => void;
  promptLength: PromptLength;
  codeStyle: CodeStyle;
  diagnosticsEnabled: boolean;
  skillsEnabled: boolean;
  onSetPromptLength: (val: PromptLength) => void;
  onSetCodeStyle: (val: CodeStyle) => void;
  onToggleDiagnostic: () => void;
  onToggleSkill: () => void;
}

const PROMPT_LENGTHS: PromptLength[] = ['none', 'short', 'medium', 'long'];
const CODE_STYLES: CodeStyle[] = ['standard', 'functional', 'oop'];

export function PromptConfig({
  onClose,
  promptLength,
  codeStyle,
  diagnosticsEnabled,
  skillsEnabled,
  onSetPromptLength,
  onSetCodeStyle,
  onToggleDiagnostic,
  onToggleSkill,
}: PromptConfigProps): React.JSX.Element {
  const [selectedIndex, setSelectedIndex] = useState(0); // 0-3 corresponding to the 4 rows

  useInput((input, key) => {
    if (key.escape) {
      onClose();
      return;
    }

    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedIndex(prev => Math.min(3, prev + 1));
    } else if (key.tab || key.leftArrow || key.rightArrow) {
      // Change value for the selected item
      if (selectedIndex === 0) {
        // Prompt Length
        const currentIdx = PROMPT_LENGTHS.indexOf(promptLength);
        const nextIdx = (currentIdx + 1) % PROMPT_LENGTHS.length;
        onSetPromptLength(PROMPT_LENGTHS[nextIdx]);
      } else if (selectedIndex === 1) {
        // Code Style
        const currentIdx = CODE_STYLES.indexOf(codeStyle);
        const nextIdx = (currentIdx + 1) % CODE_STYLES.length;
        onSetCodeStyle(CODE_STYLES[nextIdx]);
      } else if (selectedIndex === 2) {
        // Diagnostic
        onToggleDiagnostic();
      } else if (selectedIndex === 3) {
        // Skill
        onToggleSkill();
      }
    }
  });

  const renderRow = (label: string, valueDisplay: React.ReactNode, index: number) => {
    const isSelected = selectedIndex === index;
    return (
      <Box key={index}>
        <Text color={isSelected ? "cyan" : "gray"} bold={isSelected}>
          {isSelected ? "❯ " : "  "}
        </Text>
        <Text color={isSelected ? "white" : "dimColor"}>{label}</Text>
        <Text dimColor> : </Text>
        {valueDisplay}
      </Box>
    );
  };

  return (
    <Box flexDirection="column">
      <Text bold color="yellow">Prompt Configuration</Text>
      <Text dimColor>{"Adjust system prompt length, code style, and feature toggles."}</Text>
      <Box flexDirection="column" marginTop={1}>
        {renderRow("Length", 
          <Text bold color={promptLength === 'none' ? 'gray' : promptLength === 'short' ? 'blue' : promptLength === 'medium' ? 'green' : 'yellow'}>
            [{promptLength.toUpperCase()}]
          </Text>, 0)}
        {renderRow("Style", 
          <Text bold color="magenta">[{codeStyle.toUpperCase()}]</Text>, 1)}
        {renderRow("Diagnostic", 
          <Text bold color={diagnosticsEnabled ? "green" : "red"}>[{diagnosticsEnabled ? "ON" : "OFF"}]</Text>, 2)}
        {renderRow("Skill", 
          <Text bold color={skillsEnabled ? "cyan" : "gray"}>[{skillsEnabled ? "ON" : "OFF"}]</Text>, 3)}
      </Box>
      <Box marginTop={1}>
        <Text dimColor>{"↑↓ navigate · Tab/←→ change value · Esc close"}</Text>
      </Box>
    </Box>
  )
}