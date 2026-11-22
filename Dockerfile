
# 1. Base image: Node.js 24 trên Debian
FROM node:24-bookworm-slim

# 2. Cài LibreOffice và font hỗ trợ xuất PDF
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice-writer \
    fonts-liberation \
    fonts-dejavu-core \
    fonts-noto-core \
    libatomic1 \
    && rm -rf /var/lib/apt/lists/*

# 3. Thư mục làm việc
WORKDIR /app

# 4. Copy package files trước để tận dụng Docker cache
COPY package*.json ./

# 5. Cài dependencies theo package-lock.json
RUN npm ci

# 6. Copy mã nguồn
COPY . .

# 7. Khai báo cổng mặc định
EXPOSE 8080

# 8. Khởi động ứng dụng
CMD ["npm", "start"]
