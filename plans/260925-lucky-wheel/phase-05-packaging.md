---
phase: 5
title: Packaging
status: completed
priority: P2
effort: 1h
dependencies:
  - '1'
  - '2'
  - '3'
  - '4'
---

# Phase 5: Packaging

## Overview

Kiểm thử toàn diện chế độ offline (ngắt kết nối internet), tối ưu hóa tài nguyên và đóng gói ứng dụng thành file thực thi Windows `.exe` độc lập (Portable & NSIS Installer) sẵn sàng sử dụng.

## Requirements

- Functional:
  - Đóng gói ứng dụng thành file `.exe` chạy độc lập (Standalone Portable) cho giáo viên mang theo trên USB (~10-15MB).
  - Tùy chọn đóng gói bộ cài NSIS (`.exe` installer) tự tạo shortcut trên Desktop và Start Menu.
  - Cấu hình Icon ứng dụng đẹp mắt, chuyên nghiệp (icon vòng quay may mắn).
  - Cung cấp tài liệu và file standalone installer Microsoft WebView2 (offline installer) cho các máy tính Windows cũ không có sẵn WebView2.
- Non-functional:
  - Hệ điều hành mục tiêu: Windows 10 (bản 1809 trở lên) và Windows 11 (đã có sẵn Microsoft WebView2 Runtime tích hợp sẵn trong Windows).
  - Ứng dụng chạy mượt mà ngay cả khi ngắt toàn bộ Wifi/LAN (100% Offline validation).
  - Kích thước file thực thi tối ưu (< 15MB).
  - Không yêu cầu kết nối mạng để tải thêm bất kỳ thành phần nào.

## Architecture

- `src-tauri/icons/`: Bộ icon Windows (`.ico`, `.png`).
- `src-tauri/tauri.conf.json`: Cấu hình bundle targets (`nsis` installer và standalone exe).
- `dist/`: Frontend static build đã bundle toàn bộ assets.

## Related Code Files

- Modify: `src-tauri/tauri.conf.json`, `package.json`
- Create: `README.md` (hướng dẫn sử dụng cho giáo viên)

## Implementation Steps

1. Tiến hành kiểm thử Offline: Ngắt kết nối mạng và test lại toàn bộ luồng: mở app, import file Excel, quay số, nghe âm thanh, xem pháo hoa, lưu lịch sử.
2. Tạo bộ icon ứng dụng (.ico, .png) đặt vào thư mục `src-tauri/icons`.
3. Cấu hình bản build release trong `tauri.conf.json` (tối ưu hóa kích thước và bảo mật).
4. Thực thi lệnh build: `npm run tauri build`.
5. Kiểm tra file output trong `src-tauri/target/release/bundle/`.
6. Viết tài liệu `README.md` ngắn gọn hướng dẫn giáo viên cách dùng.

## Success Criteria

- [ ] File `.exe` được tạo thành công và chạy ổn định trên Windows 10/11.
- [ ] Dung lượng file < 15MB.
- [ ] Ứng dụng hoạt động hoàn hảo khi máy tính ở chế độ máy bay (Airplane mode).
- [ ] Có tài liệu hướng dẫn sử dụng nhanh cho giáo viên.

## Risk Assessment

- Máy tính trường học chạy bản Windows 10 rất cũ chưa có WebView2: Đính kèm gói `MicrosoftEdgeWebView2RuntimeInstallerX64.exe` (chạy offline độc lập) trong thư mục phát hành để cài một lần duy nhất nếu máy tính chưa có.
