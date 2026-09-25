---
title: "Khởi tạo Ý tưởng và Lập kế hoạch Ứng dụng Vòng quay May mắn Windows Offline"
date: "2026-09-25"
type: "journal"
status: "completed"
tags: ["brainstorm", "plan", "tauri", "offline", "lucky-wheel"]
---

# Nhật ký Kỹ thuật: Brainstorm & Lập kế hoạch Vòng quay May mắn

## Context
Người dùng yêu cầu xây dựng ứng dụng Windows có vòng quay may mắn để quay ngẫu nhiên học sinh trong lớp học. Ứng dụng cần hỗ trợ nhập file Excel danh sách tên hoặc nhập số lượng số để quay, và đặc biệt là phải hoạt động **100% Offline** cho môi trường lớp học/máy chiếu.

## What Happened
- Phân tích và khảo sát hiện trạng môi trường máy tính (`Node.js`, `Rust/Cargo`, `.NET`).
- Đề xuất và so sánh 3 phương án kiến trúc:
  1. Tauri v2 + React / Canvas (Tối ưu nhất: ~10MB, mượt mà, offline hoàn toàn).
  2. C# .NET 8 (WPF / WinUI 3).
  3. Electron + React.
- Thống nhất các tính năng trải nghiệm lớp học:
  - Import Excel tự nhận diện cột tên + nhập dải số 1..N + paste danh sách nhanh.
  - Vòng quay Canvas 60 FPS, âm thanh Web Audio offline, pháo hoa trúng thưởng.
  - Cơ chế loại trừ học sinh đã trúng (tránh gọi trùng), lưu lịch sử gọi tên và lưu trữ cục bộ (LocalStorage).
  - Phím tắt Spacebar quay/dừng và F11 toàn màn hình cho máy chiếu.
- Người dùng đã phê duyệt (Approve) thiết kế kiến trúc.
- Tạo báo cáo brainstorm: `plans/reports/260925-1916-vong-quay-may-man-brainstorm-report.md`.
- Sử dụng `ck plan create` để khởi tạo kế hoạch chi tiết gồm 5 phases tại `plans/260925-lucky-wheel/plan.md`.

## Reflection
- Việc chọn Tauri v2 thay vì Electron giúp file chạy cực nhẹ (~10-15MB), mở tức thì trên máy tính trường học vốn thường có cấu hình hạn chế.
- Đóng gói toàn bộ âm thanh qua Web Audio API (tổng hợp dao động tần số trực tiếp trong code) thay vì dùng file MP3 bên ngoài đảm bảo không bao giờ bị lỗi mất tài nguyên hoặc phụ thuộc internet.

## Decisions
- **Framework**: Tauri v2 + React 19 + TypeScript + Vite + Tailwind CSS.
- **Offline Storage**: Sử dụng LocalStorage kết hợp Zustand để ghi nhớ danh sách học sinh và lịch sử các lượt quay.
- **Excel Parsing**: Sử dụng SheetJS (`xlsx`) xử lý hoàn toàn client-side.

## Next Steps
- Bắt đầu thực hiện **Phase 1: Setup** (khởi tạo project Tauri + React + Vite + Tailwind).
- Sau đó tuần tự triển khai Phase 2 (WheelEngine) -> Phase 3 (DataManagement) -> Phase 4 (ClassroomUI) -> Phase 5 (Packaging).
