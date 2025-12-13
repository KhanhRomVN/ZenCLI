#!/bin/bash

# Sửa tất cả relative imports thêm .js
find src -name "*.ts" -o -name "*.tsx" | while read file; do
  sed -i "s|from \"\./\([^\"]*\)\"|from \"./\1.js\"|g" "$file"
  sed -i "s|from \"\.\./\([^\"]*\)\"|from \"../\1.js\"|g" "$file"
  # Fix double .js.js
  sed -i "s|\.js\.js|.js|g" "$file"
done

echo "✅ Fixed all imports!"