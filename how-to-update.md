# How to Update & Publish New Versions

This guide describes the standard procedure for updating version numbers, building artifacts, and publishing the `@khanhromvn/zencli` package to npm.

---

## Prerequisites

- Node.js >= 18.0.0 installed locally.
- Valid npm account with publish access to the `@khanhromvn` scope.
- An active npm automation token (recommended) or logged-in session via `npm login`.

---

## Step-by-Step Process

### 1. Update Version Number

Edit `package.json` and increment the version according to [Semantic Versioning](https://semver.org/):

- **Patch** (`x.y.Z`): Bug fixes, minor documentation updates.
- **Minor** (`x.Y.z`): New features, backward-compatible changes.
- **Major** (`X.y.z`): Breaking changes, incompatible API modifications.

Example command using npm CLI (safer than manual editing):
```bash
# For patch release
npm version patch

# For minor release
npm version minor

# For major release
npm version major
```

> ⚠️ **Note:** Running `npm version` automatically creates a git commit and tag. Ensure your working directory is clean before running this command unless you intend to include uncommitted changes.

If manually editing, ensure consistency across:
- `package.json` → `"version"` field.
- `README.md` → Badge URL (e.g., `img.shields.io/badge/version-X.X.X-blue.svg`).

### 2. Build Artifacts

Compile TypeScript source files into JavaScript outputs in the `dist/` folder:

```bash
npm run build
```

Verify that:
- No compilation errors occur.
- The `dist/cli.js` entry point exists and has correct permissions/shebang if applicable.
- All required assets are copied correctly (if any non-TS resources exist).

### 3. Test Locally (Optional but Recommended)

Before publishing, test the built package locally:

```bash
# Link globally for testing
npm link

# Run from terminal
zen-cli --help
zen-cli
```

Unlink after testing:
```bash
npm unlink -g @khanhromvn/zencli
```

### 4. Publish to npm Registry

Publish the updated version publicly:

```bash
npm publish --access public
```

#### Using Automation Token (CI/CD Friendly)

Avoid hardcoding tokens in scripts. Use environment variables instead:

```bash
export NPM_TOKEN="your_npm_automation_token_here"
npm config set //registry.npmjs.org/:_authToken=${NPM_TOKEN}
npm publish --access public
rm ~/.npmrc-temp # Clean up temp config if used
```

Or inline safely without persisting:
```bash
echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > .npmrc-temp && \
npm publish --access public --userconfig=.npmrc-temp && \
rm .npmrc-temp
```

> 🔐 **Security Warning:** Never commit `.npmrc` files containing real tokens to Git repositories. Always use temporary configs or secure secret managers in CI pipelines.

### 5. Post-Publication Verification

Check availability on npm website:
👉 https://www.npmjs.com/package/@khanhromvn/zencli

Test installation fresh:
```bash
npm install -g @khanhromvn/zencli@latest
zen-cli --version
```

Update GitHub Releases (optional):
Go to repository → Releases → Draft new release → Tag as `vX.X.X` → Attach changelog notes.

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| `ENEEDAUTH` error during publish | Verify token validity; check registry URL matches auth config. |
| Duplicate version rejected | Increment version number again — cannot overwrite published versions. |
| Missing shebang warning (`bin[...] cleaned`) | Add `#!/usr/bin/env node` at top of `src/cli.tsx`; rebuild. |
| Stale cache after publish | Wait ~1–5 minutes for CDN propagation; force refresh browser/cache. |

---

## Checklist Before Publishing

✅ Updated `package.json` version  
✅ Synced badge/version in `README.md`  
✅ Ran `npm run build` successfully  
✅ Tested local execution (`zen-cli`)  
✅ Confirmed no sensitive data leaked in logs/tokens  
✅ Published with `--access public` flag  

---

*Last reviewed: October 2026*