#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

// Tạo file bin/zencli.js
const binContent = `#!/usr/bin/env node

import { startCLI } from '../dist/index.js';

startCLI();
`;

writeFileSync('./bin/zencli.js', binContent);
execSync('chmod +x ./bin/zencli.js');

console.log('✅ CLI build completed!');