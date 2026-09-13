import { useState } from "react";
import {
  CloudOff,
  CloudUpload,
  LogIn,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Upload,
  UserPlus,
} from "lucide-react";
import { useApp } from "../store/AppStore";
import { apiEnabled } from "../lib/api";
import { MetaChip } from "./primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

/**
 * Tài khoản và đồng bộ.
 *
 * Không đăng nhập thì app chạy y như trước: mọi thứ nằm trong máy, không cần
 * mạng, không cần tài khoản. Đăng nhập thì hồ sơ nằm trên máy chủ, dùng được từ
 * nhiều máy, và **máy chủ là bên giữ sổ ghi** - tu vi không còn là con số trong
 * localStorage nữa.
 */
export default function AccountPanel() {
  const { sync, data, notify } = useApp();
  const [che, setChe] = useState<"vao" | "moi">("vao");
  const [email, setEmail] = useState("");
  const [matKhau, setMatKhau] = useState("");
  const [ten, setTen] = useState("");
  const [dangChay, setDangChay] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  if (!apiEnabled) {
    return (
      <div className="space-y-3 pt-5">
        <div className="border-border bg-muted/30 flex items-start gap-3 rounded-lg border p-3">
          <CloudOff className="text-muted-foreground mt-0.5 size-4 shrink-0" />
          <div className="min-w-0 text-xs leading-relaxed">
            <p className="font-medium">Đang chạy một mình trên máy này</p>
            <p className="text-muted-foreground mt-1">
              Mọi thứ nằm trong trình duyệt, không cần mạng cũng không cần tài
              khoản. Muốn dùng chung nhiều máy và để máy chủ giữ sổ ghi thì đặt{" "}
              <code className="bg-muted rounded px-1">VITE_API_URL</code> trong
              tệp <code className="bg-muted rounded px-1">.env</code> rồi mở lại
              app.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const chay = async (viec: () => Promise<void>) => {
    setDangChay(true);
    setLoi(null);
    try {
      await viec();
    } catch (err) {
      setLoi(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setDangChay(false);
    }
  };

  /* ------------------------------------------------------------ đã vào rồi */
  if (sync.user) {
    const troi = data.tasks.length > 0 || data.sessions.length > 0;
    return (
      <div className="space-y-4 pt-5">
        <div className="border-border bg-muted/30 flex flex-wrap items-center gap-3 rounded-lg border p-3">
          <ShieldCheck className="text-success size-5 shrink-0" />
          <div className="min-w-40 flex-1">
            <p className="text-sm font-medium">{sync.user.displayName}</p>
            <p className="text-muted-foreground text-xs">{sync.user.email}</p>
          </div>
          <TrangThaiChip />
        </div>

        <p className="text-muted-foreground text-xs leading-relaxed">
          Máy chủ đang giữ sổ ghi. Mỗi việc bạn làm xong được gửi lên và ký ở đó
          bằng khoá mà trình duyệt không có, nên tu vi không còn sửa được từ máy
          này nữa.
        </p>

        <Separator />

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={dangChay}
            onClick={() => void chay(sync.taiLai)}
          >
            <RefreshCw className={cn("size-3.5", dangChay && "animate-spin")} />
            Tải lại từ máy chủ
          </Button>

          {troi && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={dangChay}
              onClick={() => void chay(() => sync.nhapLenServer(data))}
            >
              <CloudUpload className="size-3.5" /> Đưa hồ sơ máy này lên
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={dangChay}
            onClick={() =>
              void chay(async () => {
                await sync.dangXuat();
                notify("Đã đăng xuất. App quay về chạy một mình trên máy này.");
              })
            }
          >
            <LogOut className="size-3.5" /> Đăng xuất
          </Button>
        </div>

        {loi && <p className="text-destructive text-xs">{loi}</p>}
      </div>
    );
  }

  /* --------------------------------------------------------- chưa vào */
  const guiForm = () =>
    void chay(async () => {
      if (che === "moi") {
        await sync.dangKy(email, matKhau, ten || undefined);
        // Vừa tạo tài khoản trắng: đưa luôn hồ sơ đang có trên máy lên, kẻo
        // người dùng đăng nhập xong thấy màn hình trống và tưởng mất dữ liệu.
        if (data.tasks.length > 0 || data.sessions.length > 0) {
          await sync.nhapLenServer(data);
        }
      } else {
        await sync.dangNhap(email, matKhau);
      }
    });

  return (
    <div className="space-y-4 pt-5">
      <p className="text-muted-foreground text-xs leading-relaxed">
        Đăng nhập để hồ sơ nằm trên máy chủ: dùng được từ nhiều máy, và sổ ghi
        do máy chủ ký nên tu vi không sửa được từ trình duyệt. Không đăng nhập
        thì app vẫn chạy bình thường, chỉ là mọi thứ nằm trong máy này.
      </p>

      <div className="flex gap-1.5">
        <Button
          size="sm"
          variant={che === "vao" ? "default" : "outline"}
          className="flex-1 gap-1.5"
          onClick={() => setChe("vao")}
        >
          <LogIn className="size-3.5" /> Đăng nhập
        </Button>
        <Button
          size="sm"
          variant={che === "moi" ? "default" : "outline"}
          className="flex-1 gap-1.5"
          onClick={() => setChe("moi")}
        >
          <UserPlus className="size-3.5" /> Tạo tài khoản
        </Button>
      </div>

      <div className="grid gap-3">
        {che === "moi" && (
          <div className="grid gap-2">
            <Label htmlFor="tk-ten">Đạo hiệu</Label>
            <Input
              id="tk-ten"
              value={ten}
              maxLength={60}
              placeholder="Để trống cũng được"
              onChange={(e) => setTen(e.target.value)}
            />
          </div>
        )}
        <div className="grid gap-2">
          <Label htmlFor="tk-email">Email</Label>
          <Input
            id="tk-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="tk-mk">Mật khẩu</Label>
          <Input
            id="tk-mk"
            type="password"
            autoComplete={che === "moi" ? "new-password" : "current-password"}
            value={matKhau}
            onChange={(e) => setMatKhau(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && guiForm()}
          />
          {che === "moi" && (
            <p className="text-muted-foreground text-xs">
              Ít nhất 10 ký tự. Không bắt phải có ký tự đặc biệt — mấy luật ấy
              chỉ đẩy người ta tới những mật khẩu dễ đoán hơn.
            </p>
          )}
        </div>
      </div>

      {loi && <p className="text-destructive text-xs">{loi}</p>}

      <Button
        className="w-full gap-2"
        disabled={dangChay || !email || !matKhau}
        onClick={guiForm}
      >
        {che === "moi" ? (
          <UserPlus className="size-4" />
        ) : (
          <LogIn className="size-4" />
        )}
        {che === "moi" ? "Tạo tài khoản và đưa hồ sơ lên" : "Đăng nhập"}
      </Button>

      {che === "moi" && (data.tasks.length > 0 || data.sessions.length > 0) && (
        <p className="text-muted-foreground flex items-start gap-2 text-xs">
          <Upload className="mt-0.5 size-3.5 shrink-0" />
          Hồ sơ đang có trên máy ({data.tasks.length} nhiệm vụ) sẽ được đưa lên
          ngay sau khi tạo tài khoản.
        </p>
      )}
    </div>
  );
}

/** Chấm tình trạng đồng bộ, đủ ngắn để nhét vào một góc. */
export function TrangThaiChip() {
  const { sync } = useApp();

  const meta: Record<typeof sync.status, { chu: string; mau: string }> = {
    tat: { chu: "chạy một mình", mau: "text-muted-foreground" },
    "chua-dang-nhap": { chu: "chưa đăng nhập", mau: "text-muted-foreground" },
    "dang-noi": { chu: "đang nối…", mau: "text-muted-foreground" },
    "da-noi": { chu: "đã đồng bộ", mau: "text-success" },
    "dang-gui": { chu: `đang gửi ${sync.pending}`, mau: "text-gold" },
    "mat-mang": {
      chu: `mất mạng${sync.pending ? ` · ${sync.pending} chờ` : ""}`,
      mau: "text-warning",
    },
  };
  const m = meta[sync.status];

  return (
    <MetaChip className={cn("shrink-0", m.mau)}>
      {sync.status === "mat-mang" ? (
        <CloudOff className="size-3" />
      ) : (
        <ShieldCheck className="size-3" />
      )}
      {m.chu}
    </MetaChip>
  );
}
