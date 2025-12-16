import React, { useState, useEffect } from "react";
import { render, Text, Box, useInput, useApp, Newline } from "ink";
import { storage } from "../../core/lib/storage.js";
import gradient from "gradient-string";
import { menuConfig, MenuItem } from "../config/menuConfig.js";
import figlet from "figlet";

interface MainMenuProps {
  onSelect: (action: string) => void;
  onExit: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onSelect, onExit }) => {
  // Navigation State
  const [navigationStack, setNavigationStack] = useState<MenuItem[]>([]);
  const [currentMenu, setCurrentMenu] = useState<MenuItem[]>(menuConfig);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { exit } = useApp();

  // Preview State (Dynamic based on selection)
  const selectedItem = currentMenu[selectedIndex];
  const previewItems = selectedItem?.children || [];

  useInput(
    (
      input: string,
      key: {
        upArrow: boolean;
        downArrow: boolean;
        leftArrow: boolean;
        rightArrow: boolean;
        return: boolean;
        escape: boolean;
      }
    ) => {
      // Navigation: Left/Right for horizontal list (or Up/Down if we wrap? User asked for Arrow keys)
      // Supporting both for grid-like feel
      if (key.rightArrow || key.downArrow) {
        setSelectedIndex((prev) =>
          prev < currentMenu.length - 1 ? prev + 1 : 0
        );
      }

      if (key.leftArrow || key.upArrow) {
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : currentMenu.length - 1
        );
      }

      // Enter: Go deeper or Execute action
      if (key.return) {
        if (selectedItem.children && selectedItem.children.length > 0) {
          setNavigationStack((prev) => [...prev, selectedItem]);
          setCurrentMenu(selectedItem.children);
          setSelectedIndex(0);
        } else if (selectedItem.action) {
          onSelect(selectedItem.action);
          exit();
        }
      }

      // Esc or 'r': Go back
      if (key.escape || input === "r") {
        if (navigationStack.length > 0) {
          const newStack = [...navigationStack];
          newStack.pop();
          setNavigationStack(newStack);

          // Re-calculate current menu based on new stack
          if (newStack.length === 0) {
            setCurrentMenu(menuConfig);
          } else {
            const parent = newStack[newStack.length - 1];
            setCurrentMenu(parent.children || []);
          }
          setSelectedIndex(0);
        } else {
          // Ask to exit? Or just exit? User said "esc or ctrl+c to exit" at root
          onExit();
          exit();
        }
      }
    }
  );

  const logoText = gradient([
    "#ff0000",
    "#ff8c00",
    "#ffeb3b",
    "#4caf50",
    "#2196f3",
    "#9c27b0",
  ])(
    figlet.textSync("ZenCLI", { font: "ANSI Shadow" }) // Or similar font to the ASCII art
  );

  // Custom simple ASCII as requested if figlet is too big, but let's try figlet first or static string
  const customLogo = gradient([
    "#ff0000",
    "#ff8c00",
    "#ffeb3b",
    "#4caf50",
    "#2196f3",
    "#9c27b0",
  ])(
    ` ███████╗███████╗███╗   ██╗ ██████╗██╗     ██╗
 ╚══███╔╝██╔════╝████╗  ██║██╔════╝██║     ██║
   ███╔╝ █████╗  ██╔██╗ ██║██║     ██║     ██║
  ███╔╝  ██╔══╝  ██║╚██╗██║██║     ██║     ██║
 ███████╗███████╗██║ ╚████║╚██████╗███████╗██║
 ╚══════╝╚══════╝╚═╝  ╚═══╝ ╚═════╝╚══════╝╚═╝
            (made by KhanhRomVN)`
  );

  const breadcrumbPath = ["Home", ...navigationStack.map((i) => i.label)].join(
    " - "
  );

  return (
    <Box flexDirection="column" padding={1}>
      <Text>{customLogo}</Text>
      <Newline />

      {/* Breadcrumbs */}
      <Text bold color="cyan">
        {" "}
        {breadcrumbPath}
      </Text>

      {/* Top Box: Selection */}
      <Box
        borderStyle="single"
        borderColor="cyan"
        paddingX={1}
        flexDirection="row"
        flexWrap="wrap"
        marginBottom={1}
        width="100%"
      >
        {currentMenu.map((item, index) => (
          <Box key={item.value} marginRight={10}>
            <Text
              color={selectedIndex === index ? "green" : "white"}
              bold={selectedIndex === index}
            >
              {selectedIndex === index ? "→ " : "  "}[{index + 1}] {item.label}
            </Text>
          </Box>
        ))}
        {currentMenu.length === 0 && (
          <Text color="gray">No options available</Text>
        )}
      </Box>

      {/* Bottom Box: Preview */}
      <Box
        borderStyle="single"
        borderColor="gray"
        paddingX={1}
        flexDirection="column"
        minHeight={5}
      >
        {previewItems.length > 0 ? (
          <Box flexDirection="column">
            <Text color="gray" italic>
              Preview:
            </Text>
            <Box flexDirection="row" flexWrap="wrap">
              {previewItems.map((child, idx) => (
                <Box key={child.value} marginRight={2}>
                  <Text color="gray">
                    [{idx + 1}] {child.label}
                  </Text>
                </Box>
              ))}
            </Box>
          </Box>
        ) : (
          <Box flexDirection="column">
            <Text color="gray" italic>
              Description:
            </Text>
            <Text color="white">
              {selectedItem?.description || "No description"}
            </Text>
          </Box>
        )}
      </Box>

      {/* Footer */}
      <Box marginTop={1}>
        <Text color="gray">
          arrow keys for navigation | enter to select | esc or ctrl+c to exit |
          r to return
        </Text>
      </Box>
    </Box>
  );
};
