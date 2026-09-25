---
title: "Báo cáo Thiết kế Ứng dụng Vòng quay May mắn Windows (Offline)"
date: "2026-09-25"
status: "approved"
type: "brainstorm-report"
---

# Báo cáo Thiết kế: Ứng dụng Vòng quay May mắn Windows (Hỗ trợ Offline)

## 1. Problem Statement & Requirements
- **Mục tiêu**: Xây dựng ứng dụng Windows phục vụ giáo viên quay số/tên học sinh ngẫu nhiên trong lớp học.
- **Yêu cầu cốt lõi**:
  - Hoạt động **100% Offline**, không phụ thuộc Internet (chạy tốt từ USB hoặc máy chiếu không mạng).
  - Hỗ trợ nhập dữ liệu linh hoạt:
    - File Excel (`.xlsx`, `.xls`, `.csv`).
    - Nhập số lượng / dải số (1..N).
    - Dán nhanh danh sách tên học sinh từ clipboard.
  - Vòng quay nan quạt mượt mà, màu sắc sinh động, âm thanh tíc-tắc, hiệu ứng pháo hoa khi trúng.
  - Cơ chế loại trừ học sinh đã trúng (tránh gọi trùng) hoặc giữ lại quay tiếp.
  - Lưu lịch sử gọi tên và lưu trữ danh sách lớp cục bộ (Local Storage).
  - Phím tắt (Spacebar để Quay/Dừng) và chế độ Toàn màn hình (F11) cho máy chiếu.

## 2. Evaluated Approaches

| Tiêu chí | Tauri v2 + React / Canvas (Lựa chọn) | C# .NET 8 (WPF / WinUI 3) | Electron + React |
| :--- | :--- | :--- | :--- |
| **Kích thước file** | ~10 - 15 MB (Siêu nhẹ) | ~25 - 40 MB (Trung bình) | ~100 - 150 MB (Nặng) |
| **Animation & Âm thanh** | Rất mượt, phong phú qua Web Audio & Canvas | Mất nhiều công tùy biến đồ họa | Mượt nhưng tốn RAM |
| **Khởi động** | Tức thì (< 1s, dùng WebView2) | Nhanh | Chậm hơn |
| **Xử lý Excel** | SheetJS (xlsx) client-side thuần offline | MiniExcel / ClosedXML | SheetJS |
| **Phân phối** | 1 file `.exe` Portable không cần cài đặt | Single-File Executable | Installer / Portable |

## 3. Final Recommended Solution
- **Tech Stack**:
  - **Framework**: Tauri v2 (Rust backend tối giản đóng gói WebView2).
  - **Frontend**: React 18 / 19 + TypeScript + Vite + Tailwind CSS.
  - **Vòng quay**: HTML5 Canvas với easing physics (xoay chậm dần tự nhiên, tính toán góc dừng chính xác).
  - **Hiệu ứng & Âm thanh**: `canvas-confetti` offline, Web Audio API / audio files cục bộ.
  - **Xử lý Excel**: `xlsx` (SheetJS) offline parsing.
  - **Lưu trữ**: LocalStorage / IndexedDB / App Local Config cho dữ liệu lớp học.

## 4. Implementation Considerations & Risks
- **Lớp học đông (> 40 học sinh)**: Nan quạt chữ quá nhỏ -> Hỗ trợ tự động ẩn bớt viền chữ, phóng to lát cắt khi dừng, hoặc chế độ quay số (Slot/Wheel hybrid).
- **Offline Assets**: Tuyệt đối không import font/icon/script từ CDN; đóng gói 100% assets (fonts, audio, icons) vào bundle.
- **Excel Schema linh hoạt**: Người dùng có thể để tên ở cột B, C hoặc có dòng tiêu đề -> Cho xem trước (Preview) và chọn cột Tên nếu cần.

## 5. Success Metrics & Validation Criteria
- App khởi động dưới 2 giây trên máy tính cấu hình cơ bản.
- Dung lượng bộ cài/file chạy `.exe` < 20MB.
- Chạy trơn tru khi ngắt toàn bộ kết nối mạng (Airplane mode).
- Đọc đúng các file Excel mẫu danh sách lớp.
- Vòng quay dừng mượt mà, trúng đúng mục tiêu hiển thị, phát âm thanh và hiệu ứng confetti.

## 6. Next Steps
1. Khởi tạo plan chi tiết với `ck plan create`.
2. Khởi tạo dự án Tauri v2 + Vite + React + Tailwind CSS.
3. Cài đặt các module cốt lõi: Wheel Canvas engine, Excel/List parser, Audio/FX manager, UI Layout & Controls.
4. Kiểm thử offline và đóng gói Windows `.exe`.
