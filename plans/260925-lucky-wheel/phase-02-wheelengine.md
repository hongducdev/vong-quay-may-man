---
phase: 2
title: WheelEngine
status: completed
priority: P1
effort: 2h
dependencies:
  - '1'
---

# Phase 2: WheelEngine

## Overview

Phát triển động cơ vòng quay may mắn trên HTML5 Canvas với hiệu ứng vật lý quay chậm dần mượt mà, bộ tạo âm thanh tíc-tắc bằng Web Audio API offline và hiệu ứng pháo hoa chúc mừng.

## Requirements

- Functional:
  - Vẽ vòng tròn chia nan quạt đều theo số lượng mục (học sinh / số).
  - Màu sắc các nan quạt phối gradient hoặc bảng màu rực rỡ xen kẽ nhau đẹp mắt.
  - Vẽ chữ tên học sinh hướng từ tâm ra ngoài, tự động căn chỉnh cỡ chữ (font size) theo độ dài tên và số lượng nan quạt.
  - Vẽ kim chỉ (pointer) ở vị trí chuẩn (đỉnh hoặc cạnh bên) kèm hiệu ứng kim nảy (tick) khi qua nan quạt.
  - Thuật toán quay: Random góc dừng, xoay tối thiểu 5-8 vòng, giảm tốc theo hàm Cubic Easing (`ease-out-cubic` / `deceleration`).
  - Âm thanh offline 100%: Dùng Web Audio API tổng hợp âm thanh click/tick mỗi khi kim vượt qua ranh giới nan quạt; âm thanh chuông chiến thắng (fanfare) khi vòng quay dừng lại.
  - Pháo hoa: Tích hợp `canvas-confetti` bung lụa khi có kết quả.
- Non-functional:
  - Khung hình 60 FPS ổn định, không giật lag.
  - Hoàn toàn không tải file âm thanh từ bên ngoài mạng.

## Architecture

- `src/components/wheel/WheelCanvas.tsx`: Canvas render và requestAnimationFrame loop.
- `src/utils/audio.ts`: Bộ tổng hợp âm thanh Web Audio (AudioContext, OscillatorNode, GainNode).
- `src/utils/colors.ts`: Bảng màu pastel / vibrant tối ưu cho độ tương phản chữ.
- `src/utils/easing.ts`: Công thức tính toán gia tốc và góc quay.

## Related Code Files

- Create: `src/components/wheel/WheelCanvas.tsx`, `src/utils/audio.ts`, `src/utils/colors.ts`, `src/utils/confetti.ts`

## Implementation Steps

1. Xây dựng Canvas renderer vẽ nan quạt, viền sáng và văn bản xoay tròn theo góc.
2. Xây dựng thuật toán tính toán góc dừng và xác định chính xác mục trúng thưởng (Winner calculation).
3. Hiện thực cơ chế âm thanh `Web Audio API` (tiếng tíc-tắc theo nhịp kim và tiếng chuông reo mừng).
4. Tích hợp pháo hoa confetti khi vòng quay kết thúc.
5. Kiểm thử các trường hợp danh sách ít mục (3-5 mục) đến nhiều mục (40-60 mục).

## Success Criteria

- [ ] Vòng quay xoay mượt mà ở 60 FPS.
- [ ] Vòng quay dừng chuẩn xác tại mục được tính toán trước.
- [ ] Kim chỉ nảy và phát âm thanh tíc-tắc theo từng nan quạt.
- [ ] Pháo hoa nổ đẹp mắt khi trúng thưởng.

## Risk Assessment

- Danh sách quá dài (> 50 mục) khiến tên bị đè lên nhau: Xử lý cắt ngắn văn bản, giảm font size, hoặc thêm tooltip hiển thị tên đầy đủ.
