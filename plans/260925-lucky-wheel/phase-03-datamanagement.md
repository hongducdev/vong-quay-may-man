---
phase: 3
title: DataManagement
status: completed
priority: P1
effort: 2h
dependencies:
  - '1'
---

# Phase 3: DataManagement

## Overview

Xây dựng hệ thống quản lý danh sách học sinh: Đọc file Excel client-side không cần mạng, nhập dải số (1..N), paste danh sách thủ công, quản lý danh sách còn lại vs danh sách đã gọi, và tự động lưu trạng thái vào LocalStorage.

## Requirements

- Functional:
  - Nhập file Excel (`.xlsx`, `.xls`, `.csv`):
    - Đọc file an toàn qua HTML5 File API (`FileReader.readAsArrayBuffer`) và Drag & Drop (tương thích 100% offline, không phụ thuộc Tauri filesystem permissions).
    - Tự động nhận diện cột chứa tên học sinh (tìm kiếm các cột có header như "Họ và tên", "Họ tên", "Tên", "Học sinh", hoặc tự động lấy cột dạng chuỗi dài nhất).
    - Hỗ trợ xem trước danh sách sau khi import và cho phép người dùng đổi cột nếu muốn.
  - Nhập theo số lượng / dải số:
    - Nhập số lượng `N` (sinh danh sách 1, 2, 3, ..., N).
    - Hoặc nhập dải số `Từ - Đến` (ví dụ: từ 1 đến 45).
  - Nhập nhanh qua văn bản:
    - Textarea cho phép paste danh sách tên từ clipboard (mỗi dòng một bạn).
  - Quản lý danh sách & Sao lưu:
    - Thêm / Sửa / Xóa từng học sinh trực tiếp trên giao diện.
    - Đếm số lượng học sinh còn lại và số lượng đã quay.
    - Hỗ trợ nút "Xuất danh sách / Sao lưu" (Export sang text hoặc Excel) để giáo viên chuyển danh sách sang máy khác khi cần.
  - Lưu trữ cục bộ (Offline Local Storage):
    - Tự động lưu danh sách hiện tại vào `localStorage`. Khi mở lại app, danh sách vẫn nguyên vẹn.
    - Lưu lịch sử các lần quay trong phiên học.
- Non-functional:
  - Tải file Excel 500 dòng trong dưới 200ms.
  - Hoàn toàn offline, không tải dữ liệu lên bất kỳ máy chủ nào.

## Architecture

- `src/utils/excel.ts`: Đọc file bằng SheetJS và thuật toán heuristic nhận diện cột tên.
- `src/store/wheelStore.ts`: Quản lý state toàn cục bằng Zustand (items, availableItems, winners, spinHistory, config).
- `src/components/modals/ImportExcelModal.tsx`: Giao diện import file, preview và chọn sheet/cột.
- `src/components/modals/NumberRangeModal.tsx`: Giao diện nhập dải số.
- `src/components/modals/ManualInputModal.tsx`: Giao diện nhập danh sách nhanh.

## Related Code Files

- Create: `src/utils/excel.ts`, `src/store/wheelStore.ts`, `src/components/modals/ImportExcelModal.tsx`, `src/components/modals/NumberRangeModal.tsx`, `src/components/modals/ManualInputModal.tsx`

## Implementation Steps

1. Xây dựng Zustand store quản lý danh sách mục và lịch sử quay.
2. Tích hợp thư viện `xlsx` và viết parser đọc file Excel trích xuất danh sách tên.
3. Viết component ImportExcelModal hỗ trợ drag-and-drop file và chọn cột.
4. Viết component NumberRangeModal để sinh danh sách số 1..N.
5. Viết component ManualInputModal hỗ trợ dán danh sách và phân tách theo dòng.
6. Thiết lập cơ chế tự động đồng bộ (persist) vào `localStorage`.

## Success Criteria

- [ ] Import mượt mà file Excel mẫu lớp học và trích xuất đúng danh sách tên.
- [ ] Sinh đúng dải số theo yêu cầu.
- [ ] Dữ liệu được lưu và khôi phục chính xác khi F5 hoặc khởi động lại app.

## Risk Assessment

- File Excel có cấu trúc phức tạp (merge cell, nhiều dòng tiêu đề): Thêm bước xem trước (preview) và cho phép người dùng chọn dòng bắt đầu và cột dữ liệu.
