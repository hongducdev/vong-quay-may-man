---
phase: 1
title: Setup
status: completed
priority: P1
effort: 1h
dependencies: []
---

# Phase 1: Setup

## Overview

Thiết lập bộ khung dự án desktop bằng Tauri v2 kết hợp React, TypeScript, Vite và Tailwind CSS, cấu hình hoàn toàn offline và sẵn sàng chạy trên Windows.

## Requirements

- Functional:
  - Khởi tạo project Tauri v2 + React 19 + TypeScript + Vite.
  - Cấu hình Tailwind CSS và Lucide Icons cho giao diện.
  - Cấu hình hệ thống Font Offline: Sử dụng Windows native system font stack (`'Segoe UI', -apple-system, system-ui, Arial, sans-serif`) hiển thị tiếng Việt hoàn hảo không cần tải từ CDN.
  - Cấu hình cửa sổ Tauri: Tiêu đề "Vòng Quay May Mắn", kích thước mặc định 1200x800, min 900x600, hỗ trợ chế độ fullscreen.
- Non-functional:
  - Tất cả dependencies và assets phải hoạt động hoàn toàn offline.
  - Thời gian build dev và hot-reload dưới 1 giây.

## Architecture

- `src-tauri/`: Cấu hình Tauri v2, tauri.conf.json, window controls, native capabilities.
- `src/`: Mã nguồn React frontend, các component, hooks, store, utils.

## Related Code Files

- Create: `src-tauri/tauri.conf.json`, `src/App.tsx`, `src/main.tsx`, `package.json`, `tailwind.config.js`

## Implementation Steps

1. Khởi tạo project Tauri + React + Vite + TypeScript trong thư mục hiện tại.
2. Cài đặt các thư viện phụ trợ: `tailwindcss`, `lucide-react`, `canvas-confetti`, `xlsx`, `zustand`.
3. Cấu hình `tauri.conf.json` tối ưu cho Windows Desktop (icon, resizable, title).
4. Kiểm tra chạy dev môi trường `npm run tauri dev` hoặc `npm run dev` để đảm bảo hệ thống trơn tru.

## Success Criteria

- [ ] Dự án khởi tạo thành công với cấu trúc rõ ràng.
- [ ] Giao diện Vite + React + Tailwind hiển thị tốt trên trình duyệt và cửa sổ Tauri.
- [ ] Không có phụ thuộc vào CDN bên ngoài.

## Risk Assessment

- Rust compilation lần đầu cho Tauri có thể mất 3-5 phút: Sử dụng chế độ dev song song trên web browser trong lúc dev UI để tăng tốc.
