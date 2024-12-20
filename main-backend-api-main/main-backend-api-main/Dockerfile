# Menggunakan image Node.js versi terbaru dengan Alpine untuk ukuran lebih kecil
FROM node:18-alpine

# Mengatur direktori kerja dalam container
WORKDIR /app

# Menyalin file package.json dan package-lock.json ke dalam container
COPY package.json ./

# Menyalin seluruh proyek ke dalam container
COPY . .

# Install dependencies
RUN npm install --production && npm install --only=dev

# Menyediakan port yang akan digunakan aplikasi
EXPOSE 443

# Mengatur perintah default untuk menjalankan aplikasi
CMD ["npm", "start"]
