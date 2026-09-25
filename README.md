# VÒNG QUAY MAY MẮN - QUAY THƯỞNG LỚP HỌC (WINDOWS OFFLINE)

Ứng dụng Windows chuyên biệt phục vụ giáo viên gọi tên / quay số học sinh ngẫu nhiên trong giờ học, hoạt động **100% Offline**, siêu nhẹ, khởi động tức thì và **tối ưu cho máy cấu hình thấp (không có card đồ hoạ rời)**.

---

## 🚀 CÁCH SỬ DỤNG NHANH CHO GIÁO VIÊN

Trong thư mục `dist-windows/`:

| File | Mô tả |
|---|---|
| **`VongQuayMayMan.exe`** | Bản **Portable** độc lập. Copy vào USB hoặc Desktop, nhấp đúp là chạy ngay, không cần cài đặt. |
| **`VongQuayMayMan_Setup.exe`** | Bản cài đặt - tự tạo biểu tượng Desktop và Start Menu. **Không cần quyền Administrator** (không hiện hộp thoại UAC). |
| `KhoiDong_VongQuay.bat` | Dùng khi nhấp đúp `.exe` mà không mở được: tự kiểm tra và **tải + cài Microsoft Edge WebView2** nếu máy còn thiếu (máy Windows 10 đời cũ). |
| `Chay_Che_Do_Tuong_Thich.bat` | Dùng khi ứng dụng bị giật / nháy / màn hình trắng: ép WebView2 về chế độ vẽ mềm. |
| `Go_Chan_Bao_Mat_Cua_Windows.bat` | Gỡ chặn "Mark of the Web" cho các file tải từ Internet. |
| `HuongDanSuDung.txt` | Hướng dẫn chi tiết cho giáo viên. |
| `THONG_TIN_PHIEN_BAN.txt` | Phiên bản, ngày build, chế độ WebView2 và **tình trạng chữ ký số** của từng file. |

---

## 🎯 CÁC TÍNH NĂNG CHÍNH

1. **Hoạt động 100% Offline**:
   - Không cần kết nối Internet hoặc Wifi khi sử dụng.
   - Toàn bộ font chữ tiếng Việt, âm thanh tíc-tắc, hiệu ứng pháo hoa và bộ đọc Excel đều được đóng gói trực tiếp bên trong ứng dụng.
2. **Nhập danh sách học sinh linh hoạt**:
   - **Nhập file Excel (`.xlsx`, `.xls`, `.csv`)**: Tự động nhận diện cột họ và tên, cho phép chọn sheet và cột, xem trước kết quả trước khi nhập.
   - **Quay theo dải số (STT)**: Tạo nhanh theo sĩ số lớp (ví dụ: 30, 35, 40, 45, 50 bạn hoặc dải số tùy chỉnh).
   - **Dán danh sách nhanh**: Copy & Paste danh sách học sinh từ Word, Zalo, Excel (mỗi bạn một dòng).
3. **Trải nghiệm lớp học chuyên nghiệp**:
   - **Phím Space (Phím cách)**: Nhấn để Bắt đầu quay hoặc Dừng quay nhanh chóng khi đang giảng bài.
   - **Phím F11**: Phóng to toàn màn hình máy chiếu / TV thông minh.
   - **Cơ chế loại trừ học sinh đã trúng**: Sau khi quay trúng một bạn, app hiển thị popup vinh danh và hỏi "Loại khỏi vòng quay" hoặc "Giữ lại quay tiếp".
   - **Lịch sử gọi tên**: Ghi lại chi tiết danh sách và thời gian các bạn đã được gọi trong buổi học.
   - **Xuất kết quả**: Hỗ trợ xuất danh sách và kết quả buổi học ra file Excel hoặc Text.
   - **Tự động lưu**: Danh sách lớp học và lịch sử được lưu tự động trên máy tính, lần sau mở app lên dữ liệu vẫn còn nguyên.

---

## ⚡ TỐI ƯU CHO MÁY CẤU HÌNH THẤP

Ứng dụng tự nhận biết cấu hình máy và chọn **chế độ đồ họa** phù hợp, đồng thời **tự hạ mức nếu phát hiện máy không theo kịp** (quyết định này được ghi nhớ cho lần mở sau).

Có thể chọn thủ công trong **Cài đặt → Chế độ đồ họa**: `Tự động` / `Cao` / `Trung bình` / `Thấp (Siêu nhẹ)`. Bật **"Hiện chỉ số FPS"** để xem trực tiếp FPS và thời gian vẽ mỗi khung hình.

Các kỹ thuật chính đã áp dụng:

- **Vẽ vòng quay một lần, mỗi khung hình chỉ dán ảnh đã xoay**: mặt vòng quay (ô màu, chữ, đinh, vành) được dựng sẵn ra canvas ngoài màn hình. Trước đây mỗi khung hình phải vẽ lại toàn bộ 45 ô chữ kèm `measureText` và `shadowBlur`; nay chỉ còn **1 lần dán ảnh + vài bóng đèn LED sáng**.
- **Không còn `shadowBlur` trong vòng lặp khung hình** - đây là phép toán đắt nhất khi máy phải vẽ bằng phần mềm (không có GPU rời).
- **Chỉ đổi kích thước canvas khi thật sự cần**: trước đây mỗi khung hình đều gán lại `canvas.width` (cấp phát lại toàn bộ bộ nhớ đệm + xoá sạch trạng thái context).
- **Giới hạn devicePixelRatio** (2 / 1.5 / 1.0 theo mức): trên màn hình 4K tỉ lệ 200%, canvas từng bị vẽ ở ~3440×3440 điểm ảnh mỗi khung hình.
- **Giới hạn FPS theo mức** (60 / 60 / 30 khung hình/giây). Chuyển động vẫn mượt vì toạ độ quay tính theo thời gian thực, chỉ giảm số lần lấy mẫu.
- **Tạm dừng khi cửa sổ bị ẩn/thu nhỏ**, và tự bù lại mốc thời gian để vòng quay không bị nhảy.
- **Nạp chậm các thư viện nặng**: `xlsx` (424 KB, chỉ cần khi nhập/xuất Excel) và `canvas-confetti` được tách khỏi gói khởi động. Gói khởi động giảm từ ~700 KB xuống **~282 KB**.
- **Dọn canvas pháo hoa** sau khi bắn xong (trước đây là một lớp phủ toàn màn hình tồn tại vĩnh viễn), và chống chồng nhiều loạt pháo hoa khi thời gian quay ngắn.
- **Không còn gọi `AudioContext.resume()` mỗi tiếng tíc-tắc** (trước đây tạo promise rác ~30 lần/giây).
- **Bản build Rust** bật `lto`, `codegen-units=1`, `opt-level="s"`, `strip`, `panic="abort"` → file nhỏ hơn, khởi động nhanh hơn, ít RAM hơn.
- **Tự động tải và cài WebView2** trên Windows 10 đời cũ (xem bên dưới).

---

## 🔐 CHỮ KÝ SỐ (WINDOWS CODE SIGNING)

Hai vấn đề **khác nhau**, thường bị gộp làm một:

| Hiện tượng | Nguyên nhân | Cách xử lý |
|---|---|---|
| "Windows protected your PC" khi **tải/chạy** file | File bị gắn **Mark of the Web** | **Chữ ký số không xoá được MOTW** → dùng `Go_Chan_Bao_Mat_Cua_Windows.bat`, hoặc chọn "More info → Run anyway" |
| "Unknown publisher" khi **cài đặt** | File `.exe` chưa ký Authenticode | **Ký số** (đã có sẵn công cụ trong repo) |

> ⚠️ **Chứng chỉ tự ký KHÔNG làm hết cảnh báo SmartScreen trên máy người khác.** Nó chỉ có tác dụng trên những máy đã tin cậy chứng chỉ đó (lab của trường, USB nội bộ). Muốn phát hành công khai, cần chứng chỉ **OV/EV do CA cấp** hoặc **Azure Trusted Signing**.

Công cụ có sẵn (**không cần cài Windows SDK** - script tự tải `signtool.exe` từ NuGet):

```powershell
# 1. Tạo chứng chỉ tự ký (dùng nội bộ / test) và tin cậy trên máy này
.\scripts\New-CodeSigningCert.ps1 -Trust

# 2. Build + ký + kiểm tra chữ ký + gom vào dist-windows/
.\scripts\Build-Windows.ps1 -Thumbprint <THUMBPRINT>

# 3. Build cho máy đích KHÔNG có Internet (nhúng sẵn WebView2 ~150 MB)
.\scripts\Build-Windows.ps1 -OfflineWebView2 -Thumbprint <THUMBPRINT>
```

Script hỗ trợ **`-Thumbprint` (khuyến nghị)** cho chứng chỉ có khoá không thể xuất (OV/EV hiện đại), **`-PfxPath`/`-PfxPassword`**, hoặc biến môi trường `VONGQUAY_CERT_THUMBPRINT` / `VONGQUAY_CERT_PFX` / `VONGQUAY_CERT_PASSWORD`.

👉 Chi tiết đầy đủ: **[`packaging/HUONG_DAN_KY_UNGDUNG.md`](packaging/HUONG_DAN_KY_UNGDUNG.md)**

---

## 🌐 WEBVIEW2 (MÁY WINDOWS 10 ĐỜI CŨ)

Ứng dụng cần Microsoft Edge WebView2. Windows 11 và Windows 10 đã cập nhật đã có sẵn; máy Windows 10 đời cũ (hoặc bản LTSC / "N") có thể chưa có. Đã có **3 lớp bảo vệ**:

1. **Bộ cài** (`VongQuayMayMan_Setup.exe`): tự kiểm tra và **tự tải + cài WebView2** nếu máy còn thiếu.
2. **Bản Portable**: đi kèm `KhoiDong_VongQuay.bat` để kiểm tra, tải và cài WebView2 rồi mở ứng dụng.
3. **Chế độ offline hoàn toàn**: build với `-OfflineWebView2` để nhúng sẵn toàn bộ runtime, cài được trên máy không có mạng.

---

## 🛠 HƯỚNG DẪN DÀNH CHO LẬP TRÌNH VIÊN (DEVELOPMENT)

- **Cài đặt thư viện**: `npm install`
- **Chạy chế độ dev**: `npm run tauri dev`
- **Kiểm tra chất lượng**: `npm run lint`
- **Chỉ build frontend**: `npm run build`
- **Build bản phát hành Windows** (khuyến nghị - tự ký, tự kiểm tra, tự gom file):
  ```powershell
  .\scripts\Build-Windows.ps1 -Thumbprint <THUMBPRINT>
  ```
- **Build nhanh không ký** (chỉ để test): `.\scripts\Build-Windows.ps1 -SkipSign`

### Cấu trúc thư mục

```
scripts/
  lib/SignTool.ps1          Tìm / tự tải signtool.exe (không cần Windows SDK)
  New-CodeSigningCert.ps1   Tạo chứng chỉ tự ký
  Sign-WindowsBinary.ps1    Ký file .exe (SHA-256 + timestamp RFC 3161)
  Build-Windows.ps1         Build -> ký -> kiểm tra -> gom dist-windows/
packaging/                  File đi kèm cho người dùng cuối + tài liệu ký số
src/utils/perf.ts           Nhận biết cấu hình máy + các mức chất lượng
src/utils/perfMonitor.ts    Đo FPS/thời gian vẽ (throttled)
src/components/dev/PerfHud.tsx  Lớp phủ chỉ số FPS
```

### Công nghệ

- Tauri v2 (Rust)
- React 19 + TypeScript + Vite
- Tailwind CSS
- HTML5 Canvas & Web Audio API (offline)
- SheetJS (`xlsx`) - nạp chậm, offline
- NSIS installer (`installMode: currentUser` - không cần quyền Admin)

### Ghi chú kỹ thuật đã biết

- `bundle.targets` chỉ build **NSIS**, không build MSI. MSI mặc định cài theo máy (`perMachine`) nên sẽ hiện hộp thoại UAC - trái với mục tiêu "không chặn khi cài đặt". Nếu cần MSI, thêm `msi` vào `targets` và lưu ý điều này.
- Phần `xlsx` trên npm đang ở bản 0.18.5, có cảnh báo bảo mật đã biết (prototype pollution / ReDoS) và bản vá chỉ có trên kênh phát hành riêng của SheetJS. Rủi ro thấp vì ứng dụng chỉ đọc file do chính giáo viên chọn, nhưng nên nâng cấp khi có điều kiện.
- `app.security.csp` đang là `null`. Chưa đặt CSP để tránh làm hỏng luồng xuất file (blob/data URL); nên siết lại trong tương lai.
- Máy build cần `npm`, Rust, và Internet **một lần** để tải `signtool.exe` (nếu chưa có Windows SDK) cùng bộ WebView2 bootstrapper.
