---
title: Vong Quay May Man Windows Offline
description: >-
  Ứng dụng Windows vòng quay may mắn ngẫu nhiên học sinh, hỗ trợ import Excel,
  nhập số lượng số, 100% offline.
status: completed
priority: P1
branch: main
tags:
  - tauri
  - react
  - lucky-wheel
  - offline
  - windows
  - education
blockedBy: []
blocks: []
created: '2026-09-25T12:17:23.583Z'
createdBy: 'ck:plan'
source: skill
---

# Vong Quay May Man Windows Offline

## Overview
Xây dựng ứng dụng desktop Windows gọn nhẹ (~10MB) phục vụ giáo viên quay số / gọi tên học sinh ngẫu nhiên trong giờ học. Ứng dụng hoạt động độc lập 100% offline, tích hợp animation vòng quay mượt mà, âm thanh sinh động, pháo hoa trúng thưởng, nhập danh sách từ file Excel (.xlsx) hoặc dải số (1..N), tùy chọn loại trừ người đã trúng và lưu lịch sử.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Setup](./phase-01-setup.md) | Completed |
| 2 | [WheelEngine](./phase-02-wheelengine.md) | Completed |
| 3 | [DataManagement](./phase-03-datamanagement.md) | Completed |
| 4 | [ClassroomUI](./phase-04-classroomui.md) | Completed |
| 5 | [Packaging](./phase-05-packaging.md) | Completed |

## Architecture & Tech Stack
- **Desktop Shell**: Tauri v2 (Rust backend, WebView2 Windows host)
- **Frontend Core**: React 19 + TypeScript + Vite + Tailwind CSS
- **Wheel Canvas Engine**: HTML5 Canvas với easing curve physics (cubic-bezier / decelerate), pointer indicator, dynamic slice text scaling
- **Audio & FX**: Web Audio API tổng hợp âm thanh offline (không sợ lỗi thiếu file mp3) + canvas-confetti bundle
- **Data Parser**: SheetJS (`xlsx`) đọc file Excel offline trong memory
- **State & Storage**: Zustand + LocalStorage để tự động lưu danh sách học sinh và lịch sử quay
