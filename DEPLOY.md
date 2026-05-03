# 🚀 HƯỚNG DẪN DEPLOY MYTOUR.VN LÊN CLOUD MIỄN PHÍ

## OPTION A — Railway (Khuyến nghị, dễ nhất, có MySQL miễn phí)

### Bước 1: Đẩy code lên GitHub
```bash
# Trong terminal VSCode, chạy từng lệnh:
git init
git add .
git commit -m "Initial commit - Mytour.vn TMDT"
```
Vào https://github.com/new → tạo repo tên `mytour-vn` → copy URL repo

```bash
git remote add origin https://github.com/TEN_BAN/mytour-vn.git
git branch -M main
git push -u origin main
```

### Bước 2: Deploy lên Railway
1. Vào https://railway.app → Sign up bằng GitHub
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Chọn repo `mytour-vn`
4. Railway tự detect Node.js và deploy

### Bước 3: Thêm MySQL database
1. Trong Railway dashboard → Click **"+ New"** → **"Database"** → **"MySQL"**
2. Click vào MySQL service → Tab **"Variables"** → copy:
   - `MYSQL_HOST`
   - `MYSQL_PORT`  
   - `MYSQL_USER`
   - `MYSQL_PASSWORD`
   - `MYSQL_DATABASE`

### Bước 4: Set Environment Variables
Click vào Web Service → Tab **"Variables"** → thêm:
```
DB_HOST      = (copy từ MYSQL_HOST)
DB_PORT      = (copy từ MYSQL_PORT)
DB_USER      = (copy từ MYSQL_USER)
DB_PASSWORD  = (copy từ MYSQL_PASSWORD)
DB_NAME      = (copy từ MYSQL_DATABASE)
JWT_SECRET   = mytour_production_secret_2024
NODE_ENV     = production
```

### Bước 5: Chạy Schema SQL
1. Trong Railway → Click MySQL service → Tab **"Data"** → **"Query"**
2. Paste toàn bộ nội dung file `backend/config/schema.sql` → Run

### Kết quả:
- ✅ URL public: `https://mytour-vn-production.up.railway.app`
- ✅ GitHub: `https://github.com/TEN_BAN/mytour-vn`

---

## OPTION B — Vercel (Frontend) + PlanetScale (MySQL)

### Bước 1: Tạo MySQL miễn phí tại PlanetScale
1. Vào https://planetscale.com → Sign up
2. Create database → tên `mytour-db` → region Singapore
3. Click **"Connect"** → chọn **"Node.js"** → copy connection string
4. Vào **"Console"** → paste nội dung `schema.sql` → Run

### Bước 2: Deploy lên Vercel
```bash
npm install -g vercel
vercel login
vercel --prod
```

Hoặc:
1. Vào https://vercel.com → Import Git Repository
2. Chọn repo GitHub
3. Framework Preset: **Other**
4. Build Command: để trống
5. Output Directory: để trống

### Bước 3: Set Environment Variables trên Vercel
Dashboard → Settings → Environment Variables → thêm:
```
DB_HOST      = (từ PlanetScale)
DB_PORT      = 3306
DB_USER      = (từ PlanetScale)
DB_PASSWORD  = (từ PlanetScale)
DB_NAME      = mytour-db
JWT_SECRET   = mytour_production_secret_2024
NODE_ENV     = production
```

---

## OPTION C — Render (Đơn giản, giống Railway)

1. Vào https://render.com → New → Web Service
2. Connect GitHub repo
3. Build Command: `npm install`
4. Start Command: `node server.js`
5. Thêm MySQL qua **Render PostgreSQL** hoặc dùng PlanetScale
6. Set env variables tương tự Option B

---

## SAU KHI DEPLOY XONG

Kiểm tra tại:
- `https://your-url.railway.app` — trang chủ
- `https://your-url.railway.app/debug` — kiểm tra static files
- `https://your-url.railway.app/api/hotels` — kiểm tra API

Đăng nhập Admin:
- Email: `admin@mytour.vn`
- Password: `Admin@123`

---

## NỘP BÀI — Điền vào báo cáo

```
GitHub Repository : https://github.com/[username]/mytour-vn
Public URL        : https://[app-name].up.railway.app
Admin URL         : https://[app-name].up.railway.app/#admin
Figma Mockup      : [xem file mytour-mockup.html]
```
