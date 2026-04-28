# 1. Chọn môi trường chạy (Base Image)
FROM node:18-alpine

# 2. Tạo thư mục làm việc bên trong container
WORKDIR /app

# 3. Copy file quản lý thư viện vào trước để tận dụng cache
COPY package*.json ./

# 4. Cài đặt thư viện
RUN npm install

# 5. Copy toàn bộ mã nguồn vào container
COPY . .

# 6. Mở cổng mà server của bạn đang chạy (ví dụ: 3000)
EXPOSE 8080

# 7. Lệnh để khởi động server
CMD ["npm", "server.js"]