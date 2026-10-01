import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { laLoiNapChunk } from "../lazyWithRetry";

interface Props {
  children: ReactNode;
  /**
   * `root`: bọc cả app - hỏng là thay toàn màn hình.
   * `panel`: bọc một bảng - hỏng thì chỉ bảng ấy báo lỗi, sảnh và thanh điều
   * hướng vẫn dùng được, bấm sang bảng khác là thoát.
   * `silent`: bọc đồ trang trí (lớp 3D) - hỏng thì biến mất, không báo gì.
   */
  variant?: "root" | "panel" | "silent";
}

interface State {
  error: unknown;
}

/**
 * Lưới đỡ cuối cùng.
 *
 * React 19 không có lưới nào mặc định: một lỗi ném ra lúc dựng (thường nhất là
 * chunk cũ 404 sau khi deploy) là gỡ SẠCH cả cây, người dùng nhìn một màn hình
 * trắng mà không có nút nào để bấm. Ở đây ít nhất còn lời giải thích và nút
 * "Tải lại".
 *
 * Viết bằng class vì React vẫn chỉ cho class làm error boundary.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  private thuLai = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.variant === "silent") return null;

    const banMoi = laLoiNapChunk(error);
    const loiNho = this.props.variant === "panel";
    const tieuDe = banMoi ? "Đạo Trình vừa có bản mới" : "Có chỗ trục trặc";
    const giaiThich = banMoi
      ? "Phần này thuộc bản cũ và không còn trên máy chủ. Tải lại trang để dùng bản mới - dữ liệu của bạn vẫn nằm nguyên trên máy."
      : "Phần này gặp lỗi khi hiển thị. Dữ liệu của bạn vẫn nằm nguyên trên máy; tải lại trang thường là đủ.";

    return (
      <div
        role="alert"
        className={
          loiNho
            ? "grid place-items-center gap-3 px-4 py-10 text-center"
            : "fixed inset-0 z-[200] grid place-content-center justify-items-center gap-3 bg-[#0d0a08] px-6 text-center text-[#cbb994]"
        }
      >
        <div
          aria-hidden="true"
          className="grid size-16 place-items-center rounded-xl border border-[#cbb99455] text-3xl text-[#e0a83c]"
        >
          道
        </div>
        <h2 className="font-title text-base font-bold tracking-wide">{tieuDe}</h2>
        <p className="max-w-sm text-sm leading-relaxed opacity-80">{giaiThich}</p>
        <div className="mt-1 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="min-h-11 rounded-lg border border-[#e0a83c] bg-[#e0a83c] px-5 font-bold text-[#0d0a08] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5d27a]"
          >
            Tải lại
          </button>
          {loiNho && !banMoi && (
            <button
              type="button"
              onClick={this.thuLai}
              className="min-h-11 rounded-lg border border-current px-5 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5d27a]"
            >
              Thử lại
            </button>
          )}
        </div>
      </div>
    );
  }
}
