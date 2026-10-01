import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { taiLaiMotLan } from "./lazyWithRetry";
import "./index.css";
import "./components/hub/hub.css";
// Nạp sau cùng: đợt mài giũa điện thoại/theme sáng đè lên hai tệp trên.
import "./ui-polish.css";

/*
 * Vite báo lỗi nạp trước (preload) một chunk JS/CSS qua sự kiện này - chuyện
 * xảy ra khi trang cũ còn mở mà máy chủ đã thay bản mới. Tải lại một lần để
 * lấy HTML mới; `preventDefault` để lỗi không ném tiếp. Đã tải lại gần đây mà
 * vẫn hỏng thì để lỗi đi tiếp tới ErrorBoundary.
 */
window.addEventListener("vite:preloadError", (e) => {
  if (taiLaiMotLan()) e.preventDefault();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary variant="root">
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
