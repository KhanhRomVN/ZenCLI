import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import {
  searchSkills,
  fetchSkillDetail,
  installSkill,
  listInstalledSkills,
  type SkillSummary,
  type SkillDetail,
} from "../services/SkillService.js";
import { logToFile } from "../services/api.js";

interface AddSkillProps {
  onClose: (reason?: "user_cancel" | "closed" | "done", payload?: any) => void;
}

const PAGE_SIZE = 12;

export function AddSkill({ onClose }: AddSkillProps): React.JSX.Element {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SkillSummary[]>([]);
  const [installedSlugs, setInstalledSlugs] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const [step, setStep] = useState<"list" | "detail">("list");
  const [selectedSkill, setSelectedSkill] = useState<SkillDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Load initial list and installed status on mount
  useEffect(() => {
    loadPage(1);
    refreshInstalledStatus();
  }, []);

  const refreshInstalledStatus = () => {
    const installed = listInstalledSkills();
    setInstalledSlugs(new Set(installed.map(s => s.slug)));
  };

  const loadPage = async (pageNum: number) => {
    setLoading(true);
    setMessage(null);
    try {
      const offset = (pageNum - 1) * PAGE_SIZE;
      const res = await searchSkills(query, PAGE_SIZE, offset);
      
      // DEBUG LOG: Print raw skill names returned by API
      if (res.skills && res.skills.length > 0) {
        logToFile(`[AddSkill Debug] Loaded ${res.skills.length} skills.`);
        res.skills.forEach((s, i) => {
          logToFile(`  [${i}] name="${s.name}", author="${s.author}", slug="${s.slug}"`);
        });
      } else {
        logToFile(`[AddSkill Debug] No skills returned from API.`);
      }

      const totalCount = res.total ?? (res.skills.length >= PAGE_SIZE ? pageNum * PAGE_SIZE + 1 : (pageNum - 1) * PAGE_SIZE + res.skills.length);
      setTotalPages(Math.ceil(totalCount / PAGE_SIZE) || 1);
      
      setResults(res.skills || []);
      setPage(pageNum);
      setSelectedIndex(0);
    } catch (err) {
      logToFile(`[AddSkill Error] Failed to load: ${(err as Error).message}`);
      setMessage({
        text: `Failed to load skills: ${(err as Error).message}`,
        type: "error",
      });
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = () => {
    loadPage(1); // Reset to page 1 on new search
  };

  const handleViewDetail = async (skill: SkillSummary) => {
    setDetailLoading(true);
    setMessage(null);
    try {
      const detail = await fetchSkillDetail(skill.slug);
      setSelectedSkill(detail);
      setStep("detail");
    } catch (err) {
      setMessage({
        text: `Failed to load details: ${(err as Error).message}`,
        type: "error",
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleInstall = async () => {
    if (!selectedSkill) return;

    setDetailLoading(true);
    setMessage({ text: "Installing...", type: "info" });

    try {
      const skillName = selectedSkill.name;
      await installSkill(selectedSkill);
      refreshInstalledStatus(); // Update local state
      
      // Close panel with success reason immediately
      onClose("done", { installed: skillName });
    } catch (err) {
      setMessage({
        text: `Install failed: ${(err as Error).message}`,
        type: "error",
      });
    } finally {
      setDetailLoading(false);
    }
  };

  // Handle input based on current step
  useInput((input, key) => {
    if (key.escape || (key.ctrl && input === "c")) {
      if (step === "detail") {
        setStep("list");
        setSelectedSkill(null);
      } else {
        onClose("user_cancel");
      }
      return;
    }

    if (loading || detailLoading) return;

    if (step === "list") {
      // Navigation within list
      if (key.upArrow) {
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      } else if (key.downArrow) {
        setSelectedIndex((prev) => Math.min(results.length - 1, prev + 1));
      } 
      // Pagination using Left/Right arrows (Safe from IME)
      else if (key.leftArrow) {
        if (page > 1) loadPage(page - 1);
      } else if (key.rightArrow) {
        if (page < totalPages) loadPage(page + 1);
      }
      // Search Input handling
      else if (key.return) {
        if (query.trim() && !results.some(r => r.name.toLowerCase().includes(query.toLowerCase()))) {
           // If typed something new that isn't in current list, trigger search
           handleSearchSubmit();
        } else if (results[selectedIndex]) {
           // Otherwise, enter detail view
           handleViewDetail(results[selectedIndex]);
        }
      } else if (key.backspace || key.delete) {
        setQuery((prev) => prev.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta && !key.upArrow && !key.downArrow && !key.leftArrow && !key.rightArrow) {
        setQuery((prev) => prev + input);
      }
    } else if (step === "detail") {
      if (key.return) {
        handleInstall();
      }
    }
  });

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text bold color="yellow">
        Install New Skill
      </Text>
      <Text dimColor>
        Browse and install skills from mcp.directory.
      </Text>

      {step === "list" && (
        <>
          {/* Search Bar */}
          <Box marginTop={1} marginBottom={1}>
            <Text color="cyan">Search: </Text>
            <Text>
              {query || "_"}
              {!loading && <Text color="gray">█</Text>}
            </Text>
          </Box>

          {/* Pagination Info */}
          <Box justifyContent="space-between" marginBottom={1}>
            <Text dimColor>Page {page} of {totalPages}</Text>
            <Text dimColor>
              ← Prev · Next → | Enter View Details
            </Text>
          </Box>

          {message && (
            <Box marginBottom={1}>
              <Text
                color={
                  message.type === "success"
                    ? "green"
                    : message.type === "error"
                      ? "red"
                      : "blue"
                }
              >
                {message.text}
              </Text>
            </Box>
          )}

          {loading && <Text dimColor>Loading...</Text>}
          {detailLoading && <Text dimColor>Fetching details...</Text>}

          {!loading && !detailLoading && results.length > 0 && (() => {
            const maxDescWidth = Math.floor((process.stdout.columns || 80) * 0.7);
            return (
              <Box flexDirection="column" gap={2} height={24} overflow="hidden">
                {results.map((skill, idx) => {
                  const isSelected = idx === selectedIndex;
                  const isInstalled = installedSlugs.has(skill.slug);
                  const authorStr = skill.author || "unknown";
                  const cursor = isSelected ? "❯ " : "  ";
                  const rawDesc = (skill.description || "").replace(/\s+/g, " ").trim();
                  const desc = rawDesc.length > maxDescWidth
                    ? `${rawDesc.slice(0, maxDescWidth - 3)}...`
                    : rawDesc;

                  return (
                    <Box
                      key={skill.slug}
                      flexDirection="column"
                      backgroundColor={isSelected ? "#005f87" : undefined}
                      paddingLeft={1}
                      paddingRight={1}
                    >
                      {/* Row 1: Cursor + Name + Author (+ INSTALLED badge) */}
                      <Box flexDirection="row" minHeight={1}>
                        {/* Left: Cursor + Name + Author */}
                        <Box flexDirection="row" flexGrow={1}>
                          <Text color={isSelected ? "white" : "gray"}>{cursor}</Text>
                          <Text bold color="white" wrap="truncate-end">
                            {skill.name}
                          </Text>
                          <Text color={isSelected ? "grayBright" : "gray"} wrap="truncate-end">
                            {` @${authorStr}`}
                          </Text>
                        </Box>

                        {/* Right: Status Badge (Only if Installed) */}
                        {isInstalled && (
                          <Box backgroundColor="green" paddingX={1}>
                            <Text color="black">
                              INSTALLED
                            </Text>
                          </Box>
                        )}
                      </Box>

                      {/* Row 2: Description (truncated to 70% width) */}
                      {desc && (
                        <Box paddingLeft={2}>
                          <Text dimColor={!isSelected} color={isSelected ? "grayBright" : "gray"} wrap="truncate-end">
                            {desc}
                          </Text>
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>
            );
          })()}
          {!loading && results.length === 0 && !message && (
            <Box marginTop={1}>
              <Text dimColor>No skills found matching your criteria.</Text>
            </Box>
          )}

          <Box marginTop={1}>
            <Text dimColor>↑↓ Navigate · ←→ Page · Enter Details · Esc(Ctrl+C) Close</Text>
          </Box>
        </>
      )}

      {step === "detail" && selectedSkill && (
        <>
          <Box
            marginTop={1}
            borderStyle="single"
            borderColor="blue"
            paddingX={1}
            flexDirection="column"
            height={15}
            overflow="hidden"
          >
            {/* Header */}
            <Box flexDirection="row" justifyContent="space-between">
              <Text bold color="cyan">
                {selectedSkill.name}
              </Text>
              <Text dimColor>{selectedSkill.slug}</Text>
            </Box>
            
            {/* Meta */}
            <Box flexDirection="row" gap={2} marginTop={1}>
               {selectedSkill.author && <Text dimColor>Author: {selectedSkill.author}</Text>}
               {typeof selectedSkill.views === 'number' && <Text dimColor>Views: {selectedSkill.views.toLocaleString()}</Text>}
               {typeof selectedSkill.installs === 'number' && <Text dimColor>Installs: {selectedSkill.installs.toLocaleString()}</Text>}
            </Box>

            {/* Description */}
            {selectedSkill.description && (
              <Box marginTop={1}>
                <Text wrap="wrap">{selectedSkill.description}</Text>
              </Box>
            )}

            {/* Full Content Preview (Truncated for TUI readability) */}
            {selectedSkill.content && (
              <Box marginTop={1} flexDirection="column">
                <Text bold dimColor>--- Instructions ---</Text>
                <Box height={8} overflow="hidden">
                   <Text wrap="wrap" dimColor>
                     {selectedSkill.content.length > 500 
                       ? `${selectedSkill.content.slice(0, 500)}...` 
                       : selectedSkill.content}
                   </Text>
                </Box>
              </Box>
            )}

            {message && (
              <Box marginTop={1}>
                <Text
                  color={
                    message.type === "success"
                      ? "green"
                      : message.type === "error"
                        ? "red"
                        : "blue"
                  }
                >
                  {message.text}
                </Text>
              </Box>
            )}
          </Box>

          <Box marginTop={1}>
            <Text dimColor>Enter Install · Esc Back to List</Text>
          </Box>
        </>
      )}
    </Box>
  );
}
