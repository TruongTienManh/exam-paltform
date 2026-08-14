# Nền tảng Kiểm tra & Đánh giá Học sinh

## Cách chạy (không cần biết lập trình)

1. Cài Node.js (nếu máy chưa có): tải bản LTS tại https://nodejs.org, cài như phần mềm bình thường.
2. Giải nén thư mục `app` này ra Desktop.
3. Mở Terminal (macOS) / Command Prompt (Windows) tại thư mục `app`, gõ lần lượt 2 lệnh:
   ```
   npm install
   npm start
   ```
4. Mở trình duyệt vào: http://localhost:3000
5. Đăng nhập Admin: tài khoản `admin`, mật khẩu `admin123`.

## Quy trình sử dụng
1. Vào **Học sinh** → nhập họ tên từng dòng → bấm "Tạo tài khoản tự động" → in/chụp bảng tài khoản-mật khẩu phát cho học sinh.
2. Vào **Đề thi** → tạo đề, đặt thời gian làm bài & số lượt cho phép.
3. Bấm **Câu hỏi** trên đề vừa tạo → nhập câu hỏi theo mẫu (đáp án đúng đánh dấu `*` ở đầu dòng) → Thêm vào đề.
4. Học sinh vào http://localhost:3000/student/login, đăng nhập bằng tài khoản được cấp, chọn đề và làm bài.
5. Vào **Thống kê** để xem điểm số, biểu đồ phân bố điểm cả lớp và tiến bộ từng học sinh.

Dữ liệu lưu trong file `data.sqlite` cùng thư mục — sao lưu bằng cách copy file này.
