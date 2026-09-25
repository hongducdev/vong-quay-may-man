---
phase: 4
title: ClassroomUI
status: completed
priority: P1
effort: 2h
dependencies:
  - '2'
  - '3'
---

# Phase 4: ClassroomUI

## Overview

Thiết kế giao diện người dùng chuyên biệt cho lớp học: Bố cục trực quan, tối ưu cho màn chiếu/TV thông minh, tích hợp popup vinh danh học sinh trúng thưởng, cơ chế loại trừ, bảng lịch sử và các phím tắt tiện lợi.

## Requirements

- Functional:
  - Bố cục chính:
    - Khu vực trung tâm: Vòng quay may mắn lớn, nút "QUAY" trung tâm hoặc bên dưới to rõ.
    - Cột bên phải/trái: Danh sách học sinh tham gia & Danh sách học sinh đã gọi (Lịch sử).
    - Thanh công cụ trên cùng: Các nút Import Excel, Nhập số, Nhập tay, Cài đặt âm thanh, Nút Toàn màn hình (Fullscreen), Nút Reset vòng quay.
  - Popup kết quả (Winner Dialog):
    - Hiệu ứng xuất hiện rực rỡ kèm âm thanh và pháo hoa.
    - Tên học sinh hiển thị to, rõ ràng, dễ nhìn từ cuối lớp học.
    - Nút "Loại khỏi vòng quay" (Xóa bạn này để không quay trúng lần sau).
    - Nút "Giữ lại" (Để bạn này vẫn có thể được gọi tiếp).
  - Phím tắt (Hotkeys):
    - `Phím Space`: Bắt đầu quay / Dừng vòng quay.
    - `Phím F11`: Bật/Tắt chế độ toàn màn hình.
    - `Phím Esc`: Đóng popup kết quả.
  - Cài đặt tùy chọn:
    - Bật / Tắt âm thanh quay và nhạc trúng thưởng.
    - Điều chỉnh thời gian quay (ngắn: 3s, vừa: 5s, kịch tính: 8s).
- Non-functional:
  - Giao diện thân thiện, màu sắc tươi sáng, font chữ tiếng Việt rõ nét, không lỗi font.
  - Tương thích tốt với các độ phân giải màn hình khác nhau (HD, Full HD, 4K, tỉ lệ 16:9, 4:3 của máy chiếu).

## Architecture

- `src/components/layout/Header.tsx`: Thanh điều hướng và nút chức năng.
- `src/components/sidebar/StudentListSidebar.tsx`: Danh sách học sinh và lịch sử.
- `src/components/modals/WinnerModal.tsx`: Hộp thoại chúc mừng trúng thưởng.
- `src/components/modals/SettingsModal.tsx`: Cài đặt thời gian, âm thanh.
- `src/hooks/useKeyboardShortcuts.ts`: Lắng nghe phím Space, F11, Esc.

## Related Code Files

- Create: `src/components/layout/Header.tsx`, `src/components/sidebar/StudentListSidebar.tsx`, `src/components/modals/WinnerModal.tsx`, `src/components/modals/SettingsModal.tsx`, `src/hooks/useKeyboardShortcuts.ts`

## Implementation Steps

1. Xây dựng bố cục tổng thể responsive cho lớp học.
2. Hoàn thiện WinnerModal với hiệu ứng chúc mừng và 2 lựa chọn (Loại bỏ / Giữ lại).
3. Hoàn thiện StudentListSidebar cho phép xem danh sách, xóa từng bạn, xem lịch sử trúng.
4. Tích hợp hook lắng nghe phím tắt `Space`, `F11`, `Esc`.
5. Tích hợp toggle Fullscreen qua Tauri API hoặc HTML5 Fullscreen API.

## Success Criteria

- [ ] Nhấn Space để quay mượt mà.
- [ ] Popup trúng thưởng hiển thị tên to rõ, dễ nhìn từ xa.
- [ ] Chọn loại bỏ thì tên học sinh lập tức biến mất khỏi vòng quay và chuyển sang danh sách đã gọi.
- [ ] Chế độ toàn màn hình hoạt động trơn tru trên màn chiếu.

## Risk Assessment

- Máy chiếu phòng học có tỉ lệ 4:3 (1024x768): Cần đảm bảo vòng quay tự co giãn (responsive scale) không bị tràn màn hình.
