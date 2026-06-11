# Lịch thi đấu World Cup 2026 PWA

Đây là một ứng dụng Web App / PWA thuần (Vanilla HTML/CSS/JS) giúp xem lịch thi đấu và kết quả World Cup 2026. Ứng dụng được tối ưu hóa mobile-first cho iPhone Safari.

## Cách chạy dự án Local

Vì ứng dụng được xây dựng hoàn toàn bằng HTML/CSS/JS thuần và không dùng build tool như Vite (để bạn dễ chạy nhất mà không cần cài Node.js), bạn có thể chạy nó theo các cách sau:

**Cách 1: Sử dụng VS Code Live Server (Khuyến nghị)**
1. Mở thư mục dự án trong Visual Studio Code.
2. Cài đặt extension **Live Server**.
3. Chuột phải vào file `index.html` và chọn "Open with Live Server".

**Cách 2: Sử dụng Python (nếu máy có cài sẵn Python)**
Mở Terminal/PowerShell trong thư mục dự án và chạy:
```bash
python -m http.server 8000
```
Sau đó mở trình duyệt và truy cập: `http://localhost:8000`

## Cách triển khai (Deploy) lên GitHub Pages hoàn toàn miễn phí

Vì đây là dự án cấu trúc tĩnh (HTML/CSS/JS thuần), bạn có thể dùng **GitHub Pages** để host hoàn toàn miễn phí.

**Các bước thực hiện:**
1. Tạo một repository mới trên [GitHub](https://github.com/new) (ví dụ đặt tên là `worldcup-2026`). Để ở chế độ Public.
2. Push toàn bộ mã nguồn trong thư mục này lên repository vừa tạo:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/Tên_Tài_Khoản_Của_Bạn/worldcup-2026.git
   git push -u origin main
   ```
3. Sau khi code đã lên GitHub, vào phần **Settings** của repository.
4. Ở menu bên trái, chọn **Pages**.
5. Trong mục "Build and deployment" > "Source", chọn **Deploy from a branch**.
6. Dưới mục "Branch", chọn nhánh `main` và thư mục `/ (root)`, sau đó nhấn **Save**.
7. Đợi 1-2 phút, GitHub sẽ cung cấp cho bạn đường link (ví dụ: `https://ten-tai-khoan.github.io/worldcup-2026`).

## Cách cài đặt API Proxy / Thêm Token API

Mặc định, ứng dụng đang đọc dữ liệu từ file tĩnh `src/data/worldcup-2026.json`.
Nếu bạn muốn dùng API thực tế từ `football-data.org`:

1. Mở file `src/services/dataService.js`.
2. Sửa biến `this.useMockData = false;`.
3. Điền API token của bạn vào `this.apiToken = 'TOKEN_CUA_BAN';`.

*(Lưu ý: Nếu deploy public qua GitHub Pages, việc để lộ token trong file JS frontend là không an toàn. Nếu bạn dùng API thật, hãy cẩn thận vấn đề này)*.

## Cách cập nhật file worldcup-2026.json thủ công

1. Mở file `src/data/worldcup-2026.json`.
2. File có mảng `matches`. Bạn có thể sao chép một Object trận đấu và thay đổi các thông tin: `utcDate` (giờ gốc chuẩn ISO 8601), `homeTeam`, `awayTeam`, `score`.
3. Sửa `status` thành `FINISHED` để nó xuất hiện trong tab **Kết quả**.
4. Ứng dụng tự động tính toán bảng xếp hạng dựa trên `score` của các trận có `status: "FINISHED"`.

## Cách Add to Home Screen trên iPhone

1. Mở link Netlify của bạn bằng trình duyệt **Safari** trên iPhone.
2. Ở thanh công cụ bên dưới của Safari, nhấn vào biểu tượng **Share** (hình vuông có mũi tên trỏ lên).
3. Cuộn xuống và chọn **"Add to Home Screen"** (Thêm vào MH chính).
4. Nhấn **"Add"** (Thêm) ở góc trên bên phải.
5. Thoát ra màn hình chính của iPhone, bạn sẽ thấy ứng dụng có icon như một App thật và mở ra toàn màn hình (không có thanh địa chỉ của Safari).
