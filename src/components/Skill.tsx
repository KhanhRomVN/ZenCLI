import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import {
  listInstalledSkills,
  uninstallSkill,
  type InstalledSkill,
} from "../services/SkillService.js";

interface SkillProps {
  onClose: () => void;
}

export function Skill({ onClose }: SkillProps): React.JSX.Element {
  const [skills, setSkills] = useState<InstalledSkill[]>([]);
  const [filter, setFilter] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [confirmDeleteSlug, setConfirmDeleteSlug] = useState<string | null>(
    null,
  );
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // Load skills on mount and when filter changes (though filtering is client-side here)
  useEffect(() => {
    const loaded = listInstalledSkills();
    setSkills(loaded);
  }, []);

  const filteredSkills = skills.filter(
    (s) =>
      s.name.toLowerCase().includes(filter.toLowerCase()) ||
      s.slug.toLowerCase().includes(filter.toLowerCase()),
  );

  useInput((input, key) => {
    if (key.escape) {
      if (confirmDeleteSlug) {
        setConfirmDeleteSlug(null);
      } else {
        onClose();
      }
      return;
    }

    if (confirmDeleteSlug) {
      if (key.return) {
        // Perform deletion
        try {
          uninstallSkill(confirmDeleteSlug);
          setSkills((prev) => prev.filter((s) => s.slug !== confirmDeleteSlug));
          setMessage({
            text: `Deleted skill: ${confirmDeleteSlug}`,
            type: "success",
          });
          setConfirmDeleteSlug(null);
          // Reset selection if out of bounds
          if (selectedIndex >= filteredSkills.length - 1) {
            setSelectedIndex(Math.max(0, filteredSkills.length - 2));
          }
        } catch (err) {
          setMessage({
            text: `Failed to delete: ${(err as Error).message}`,
            type: "error",
          });
          setConfirmDeleteSlug(null);
        }
      }
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((prev) => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedIndex((prev) => Math.min(filteredSkills.length - 1, prev + 1));
    } else if (key.backspace || key.delete) {
      setFilter((prev) => prev.slice(0, -1));
    } else if (input && !key.ctrl && !key.meta) {
      setFilter((prev) => prev + input);
    } else if (key.return) {
      const selected = filteredSkills[selectedIndex];
      if (selected) {
        setConfirmDeleteSlug(selected.slug);
      }
    }
  });

  // Clear message after timeout
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color="yellow">
        Manage Skills
      </Text>
      <Text dimColor>
        List installed skills. Press Enter to delete, Esc to close. Type to
        filter.
      </Text>

      {/* Search Input Visual */}
      <Box marginTop={1} marginBottom={1}>
        <Text color="cyan">Filter: </Text>
        <Text>{filter || "_"}</Text>
      </Box>

      {message && (
        <Box marginBottom={1}>
          <Text color={message.type === "success" ? "green" : "red"}>
            {message.text}
          </Text>
        </Box>
      )}

      {filteredSkills.length === 0 ? (
        <Box marginTop={1}>
          <Text dimColor>No skills found.</Text>
        </Box>
      ) : (
        <Box flexDirection="column">
          {filteredSkills.map((skill, idx) => {
            const isSelected = idx === selectedIndex;
            const isDeleting = confirmDeleteSlug === skill.slug;

            return (
              <Box key={skill.slug}>
                <Text color={isSelected ? "cyan" : "gray"}>
                  {isSelected ? "❯ " : "  "}
                </Text>
                <Box flexDirection="column" flexGrow={1}>
                  <Text bold color={isDeleting ? "red" : "white"}>
                    {skill.name}
                  </Text>
                  {skill.description && (
                    <Text dimColor wrap="truncate-end">
                      {skill.description}
                    </Text>
                  )}
                  <Text dimColor>
                    Slug: {skill.slug}
                  </Text>
                </Box>
                {isDeleting && (
                  <Box marginLeft={1} alignItems="center">
                    <Text color="red" bold>
                      Confirm Delete? [Y/N]
                    </Text>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>
          Total: {filteredSkills.length} / {skills.length} skills
        </Text>
      </Box>
    </Box>
  );
}
