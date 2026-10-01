import { Download } from "lucide-react";
import type { AppData } from "../types";
import { exportFile } from "../lib/storage";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Hỏi lại trước mọi thao tác THAY TRẮNG hồ sơ trên máy (nạp mẫu, nhập tệp,
 * khôi phục bản sao, xoá sạch). Một cú bấm nhầm ở đây là mất hết nhiệm vụ,
 * mục tiêu và tu vi - nên luôn mời xuất một bản sao trước khi làm.
 */
export default function ConfirmReplaceDialog({
  open,
  onOpenChange,
  data,
  title = "Dữ liệu hiện tại sẽ bị thay thế",
  description,
  actionLabel,
  destructive,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Hồ sơ đang có - để nút "Xuất bản sao trước" tải về. */
  data: AppData;
  title?: string;
  description: string;
  actionLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <Button
          type="button"
          variant="outline"
          className="justify-center gap-2"
          onClick={() => exportFile(data)}
        >
          <Download className="size-4" /> Xuất bản sao trước
        </Button>
        <AlertDialogFooter>
          <AlertDialogCancel>Huỷ</AlertDialogCancel>
          <AlertDialogAction
            className={destructive ? "bg-destructive hover:bg-destructive/90 text-white" : undefined}
            onClick={onConfirm}
          >
            {actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
