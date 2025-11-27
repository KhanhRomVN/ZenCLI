#!/bin/bash

# Script để chạy Cline CLI từ source code trong môi trường dev
# Không cần cài đặt vào máy, chạy trực tiếp từ thư mục hiện tại

# Đảm bảo CLI đã được build
if [ ! -f "cli/bin/cline" ]; then
 echo "Building Cline CLI..."
 cd cli && go build -o bin/cline ./cmd/cline && cd ..
fi

if [ ! -f "cli/bin/cline-host" ]; then
 echo "Building Cline Host..."
 cd cli && go build -o bin/cline-host ./cmd/cline-host && cd ..
fi

# Chạy CLI với các tham số được truyền vào
./cli/bin/cline "$@"
