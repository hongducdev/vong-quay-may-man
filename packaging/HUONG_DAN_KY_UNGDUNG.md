# Hướng dẫn ký số ứng dụng (Windows Code Signing)

Tài liệu này giải thích **hai vấn đề khác nhau** mà mọi người thường gộp làm một, và cách xử lý từng vấn đề.

---

## 1. Hai vấn đề khác nhau

| Vấn đề | Nguyên nhân | Cách xử lý |
|---|---|---|
| **"Windows protected your PC" (SmartScreen)** khi tải/chạy file | File bị gắn **Mark of the Web (MOTW)** — dấu `Zone.Identifier` do trình duyệt/Zalo/Email thêm vào | **Chữ ký số KHÔNG xoá được MOTW.** Người dùng phải bỏ chặn, hoặc bạn phải có chứng chỉ đủ uy tín để SmartScreen không cảnh báo |
| **"Unknown publisher" (UAC)** khi cài đặt | File `.exe` **chưa được ký Authenticode** | Ký bằng chứng chỉ code signing |

**Điểm quan trọng:** ký số không làm MOTW biến mất. Vì vậy bộ cài vẫn cần file `Go_Chan_Bao_Mat_Cua_Windows.bat` đi kèm. Điều mà chữ ký số làm được là:

- Bỏ hộp thoại "Unknown publisher" của UAC.
- Giúp SmartScreen **xây dựng uy tín** theo thời gian (với chứng chỉ OV), hoặc **được tin ngay lập tức** (với chứng chỉ EV / Azure Trusted Signing).
- Cho phép người dùng xác minh file thật sự đến từ bạn.

### Ba mức độ "được tin"

| Loại chứng chỉ | SmartScreen trên máy người khác | Ghi chú |
|---|---|---|
| **Không ký** | Cảnh báo nặng | Tệ nhất |
| **Tự ký (self-signed)** | Vẫn cảnh báo | Chỉ hết cảnh báo trên máy nào đã tin cậy chứng chỉ này (lab của trường, USB nội bộ) |
| **OV (Organization Validation)** | Cảnh báo lúc đầu, giảm dần khi có đủ lượt tải | Chứng chỉ in tên tổ chức; cần pháp nhân/đăng ký kinh doanh |
| **EV (Extended Validation)** | Được tin ngay lập tức | Đắt nhất, yêu cầu token/HSM |
| **Azure Trusted Signing** | Được tin ngay, tính phí theo tháng | Thay thế hiện đại cho EV, không cần token vật lý |

> **Nếu bạn phát hành cho nhiều trường/giáo viên không kiểm soát được máy của họ:** bắt buộc phải có chứng chỉ do CA cấp (OV/EV) hoặc Azure Trusted Signing. Không có cách nào khác.

---

## 2. Công cụ đã có sẵn trong repo

| Script | Chức năng |
|---|---|
| `scripts/lib/SignTool.ps1` | Tìm `signtool.exe`; nếu máy chưa có Windows SDK thì **tự tải từ NuGet** vào `%LOCALAPPDATA%\VongQuayMayMan\tools\signtool` |
| `scripts/New-CodeSigningCert.ps1` | Tạo chứng chỉ **tự ký** (dùng nội bộ / test) |
| `scripts/Sign-WindowsBinary.ps1` | Ký một hoặc nhiều file `.exe` (SHA-256 + timestamp RFC 3161) |
| `scripts/Build-Windows.ps1` | Build → ký → kiểm tra chữ ký → gom vào `dist-windows/` |

Không cần cài Windows SDK. `signtool.exe` (~21 MB, tải một lần) là đủ.

---

## 3. Chứng chỉ tự ký — dùng khi bạn kiểm soát được máy đích

Phù hợp cho: lab tin học của trường, máy phòng giáo viên, USB nội bộ.

```powershell
# Tạo chứng chỉ và tin cậy nó trên MÁY NÀY (có thể hiện hộp thoại xác nhận của Windows)
.\scripts\New-CodeSigningCert.ps1 -Trust

# Build đã ký
.\scripts\Build-Windows.ps1 -Thumbprint 576BCF818F68D36C4D814DAE448038D41C8A9993
```

Để chữ ký hợp lệ trên **máy khác**, phải tin cậy chứng chỉ công khai (`.cer`) ở máy đó **trước** khi chạy:

```powershell
Import-Certificate -FilePath VongQuayMayMan-CodeSigning.cer -CertStoreLocation Cert:\LocalMachine\Root
Import-Certificate -FilePath VongQuayMayMan-CodeSigning.cer -CertStoreLocation Cert:\LocalMachine\TrustedPublisher
```

> Thư mục `certs/` chứa khoá riêng tư và **không được commit** (đã có trong `.gitignore`).
> Chỉ chia sẻ file `.cer` (công khai). **Không bao giờ** chia sẻ file `.pfx`.

---

## 4. Chứng chỉ do CA cấp — dùng khi phát hành công khai

Sau khi nhận chứng chỉ từ nhà cung cấp (DigiCert, Sectigo, SSL.com, GlobalSign...):

```powershell
# Xem chứng chỉ đã cài trong kho của người dùng hiện tại
Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert |
  Select-Object Subject, Thumbprint, NotAfter

# Build đã ký bằng chứng chỉ trong kho
.\scripts\Build-Windows.ps1 -Thumbprint <THUMBPRINT>
```

**Luôn ưu tiên `-Thumbprint` hơn `-PfxPath`.** Chứng chỉ OV/EV hiện đại thường được cấp với **khoá không thể xuất** (lưu trong TPM/HSM theo yêu cầu của CA/Browser Forum), nên không có file `.pfx` nào cả. Dùng thumbprint cũng tránh việc mật khẩu bị ghi ra đĩa.

Nếu buộc phải dùng `.pfx`:

```powershell
.\scripts\Build-Windows.ps1 -PfxPath .\certs\cert.pfx -PfxPassword "<mật khẩu>"
```

Script sẽ import `.pfx` vào kho người dùng, build, rồi **xoá chứng chỉ khỏi kho** khi kết thúc.

Có thể truyền qua biến môi trường để không lộ mật khẩu trên dòng lệnh:

```powershell
$env:VONGQUAY_CERT_THUMBPRINT = '<thumbprint>'
$env:VONGQUAY_TIMESTAMP_URL   = 'http://timestamp.digicert.com'
```

---

## 5. WebView2 — máy Windows 10 đời cũ

Ứng dụng cần **Microsoft Edge WebView2**. Windows 11 và Windows 10 đã cập nhật đã có sẵn; Windows 10 đời cũ (hoặc LTSC / bản "N") thì có thể chưa có.

**Ba lớp bảo vệ đã được cài đặt:**

1. **Bộ cài (`VongQuayMayMan_Setup.exe`)** — mặc định dùng `embedBootstrapper`: bộ cài tự kiểm tra và **tự tải + cài WebView2** nếu máy còn thiếu. Cần Internet.
2. **Bản Portable (`VongQuayMayMan.exe`)** — không có bộ cài để kiểm tra, nên đi kèm `KhoiDong_VongQuay.bat`. File này kiểm tra WebView2, tự tải và cài nếu thiếu, rồi mở ứng dụng.
3. **Chế độ hoàn toàn offline** — nếu máy đích **không có Internet**:

   ```powershell
   .\scripts\Build-Windows.ps1 -OfflineWebView2 -Thumbprint <THUMBPRINT>
   ```

   Bộ cài sẽ **nhúng sẵn toàn bộ WebView2 Runtime** (~150 MB). Cài được trên máy hoàn toàn không có mạng.

> **Đánh đổi:** mặc định (`embedBootstrapper`) giữ bộ cài nhỏ (~2 MB) nhưng cần Internet một lần nếu máy thiếu WebView2. `-OfflineWebView2` cho bộ cài rất lớn (~150 MB) nhưng cài được offline. Chọn theo thực tế triển khai.

---

## 6. UAC — tránh hộp thoại xin quyền quản trị

Bộ cài đã được cấu hình `installMode: currentUser`, nghĩa là **không cần quyền Administrator** và **không hiện hộp thoại UAC**. Ứng dụng cài vào `%LOCALAPPDATA%`, không đụng tới `Program Files`.

Đây là lựa chọn có chủ đích: giáo viên thường không có quyền quản trị máy phòng học, và bỏ được UAC thì bỏ luôn được cảnh báo "Unknown publisher" khi cài.

---

## 7. Quy trình phát hành đầy đủ

```powershell
# 1. Kiểm tra chất lượng
npm run lint
npm run build

# 2. Build + ký + gom bộ cài (dùng chứng chỉ tự ký, triển khai nội bộ)
.\scripts\Build-Windows.ps1 -Thumbprint <THUMBPRINT>

# Hoặc build cho máy offline (nhúng sẵn WebView2)
.\scripts\Build-Windows.ps1 -OfflineWebView2 -Thumbprint <THUMBPRINT>

# 3. Kiểm tra chữ ký
Get-AuthenticodeSignature .\dist-windows\VongQuayMayMan.exe |
  Format-List Status, SignerCertificate, TimeStamperCertificate
```

Script `Build-Windows.ps1` **tự kiểm tra chữ ký** của cả file `.exe` ứng dụng và bộ cài trước khi gom vào `dist-windows/`, và ghi kết quả vào `THONG_TIN_PHIEN_BAN.txt`. Nếu thiếu chữ ký, script cảnh báo rõ ràng.

Nếu muốn phát hành **không ký** (ví dụ để test):

```powershell
.\scripts\Build-Windows.ps1 -SkipSign
```

---

## 8. Câu hỏi thường gặp

**Đã ký rồi mà SmartScreen vẫn cảnh báo?**
Đúng, và đó là hành vi bình thường với chứng chỉ tự ký hoặc OV mới. Người dùng chọn "More info" → "Run anyway", hoặc chạy `Go_Chan_Bao_Mat_Cua_Windows.bat`. Với OV, cảnh báo sẽ giảm dần khi file được tải đủ nhiều.

**Tôi ký trên máy khác thì có dùng được không?**
Có, miễn là chứng chỉ (hoặc `.pfx` + mật khẩu) có trên máy đó. Với chứng chỉ không thể xuất khoá, phải ký trên chính máy có token/HSM.

**Timestamp để làm gì?**
Không có timestamp, chữ ký sẽ **hết hiệu lực khi chứng chỉ hết hạn**, dù file đã phát hành từ trước. Có timestamp RFC 3161 thì chữ ký vẫn hợp lệ vĩnh viễn. Script mặc định dùng `http://timestamp.digicert.com`.

**Vì sao `THONG_TIN_PHIEN_BAN.txt` báo "trust status: UnknownError"?**
Vì chứng chỉ tự ký chưa được tin cậy trên máy build. Chữ ký **vẫn có** và vẫn đúng — chỉ là Windows chưa tin chứng chỉ. Đây không phải lỗi ký.
