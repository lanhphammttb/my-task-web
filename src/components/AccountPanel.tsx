import { useState } from "react";
import {
  ArchiveRestore,
  CloudOff,
  CloudUpload,
  Download,
  LogIn,
  LogOut,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  Upload,
  UserPlus,
} from "lucide-react";
import { useApp } from "../store/AppStore";
import type { SyncStatus } from "../store/useServerSync";
import { apiEnabled } from "../lib/api";
import { coDuLieu, danhSachSaoLuu, docSaoLuu, exportFile } from "../lib/storage";
import { MetaChip } from "./primitives";
import ConfirmReplaceDialog from "./ConfirmReplaceDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
import { cn } from "@/lib/utils";

/** Những trạng thái đáng đưa lỗi ra cho người dùng đọc. */
const TRANG_THAI_LOI = new Set<SyncStatus>([
  "mat-mang",
  "loi-may-chu",
  "khong-tuong-thich",
  "het-phien",
  "lenh-ket",
  "lech-gio",
]);

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
  // Phiên hết hạn thì điền sẵn email của tài khoản đang giữ hồ sơ.
  const [email, setEmail] = useState(() => sync.chu?.email ?? "");
  const [matKhau, setMatKhau] = useState("");
  const [ten, setTen] = useState("");
  const [dangChay, setDangChay] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [hoiThay, setHoiThay] = useState(false);
  const [hoiRa, setHoiRa] = useState(false);
  const [xoaMay, setXoaMay] = useState(false);

  if (!apiEnabled) {
    return (
      <div className="space-y-3 pt-5">
        <div className="border-border bg-muted/30 flex items-start gap-3 rounded-lg border p-3">
          <CloudOff className="text-muted-foreground mt-0.5 size-4 shrink-0" />
          <div className="min-w-0 text-xs leading-relaxed">
            <p className="font-medium">Dữ liệu đang lưu trên máy này.</p>
            <p className="text-muted-foreground mt-1">
              Không cần mạng cũng không cần tài khoản. Nhớ xuất tệp sao lưu ở mục
              Dữ liệu định kỳ để không mất khi đổi máy hay xoá trình duyệt.
            </p>
            {import.meta.env.DEV && (
              <p className="text-muted-foreground mt-1">
                (Dev) Đặt <code className="bg-muted rounded px-1">VITE_API_URL</code>{" "}
                trong <code className="bg-muted rounded px-1">.env</code> để bật
                đồng bộ tài khoản.
              </p>
            )}
          </div>
        </div>
        <SaoLuu />
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

  const baoLoiDongBo = TRANG_THAI_LOI.has(sync.status) && sync.loi && (
    <p role="status" className="text-warning break-words text-xs leading-relaxed">
      {sync.loi}
    </p>
  );

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

        {baoLoiDongBo}
        <LenhKet />

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
            onClick={() => {
              setXoaMay(false);
              setHoiRa(true);
            }}
          >
            <LogOut className="size-3.5" /> Đăng xuất
          </Button>
        </div>

        {loi && <p className="text-destructive text-xs">{loi}</p>}

        <SaoLuu />

        {/* M9: đăng xuất trên máy dùng chung thì nên được hỏi có xoá bản sao không. */}
        <AlertDialog open={hoiRa} onOpenChange={setHoiRa}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Đăng xuất khỏi {sync.user.email}?</AlertDialogTitle>
              <AlertDialogDescription>
                Hồ sơ vẫn nằm an toàn trên máy chủ. Mặc định bản sao trên máy
                này được giữ lại để dùng tiếp khi không đăng nhập.
                {sync.pending > 0 &&
                  ` Còn ${sync.pending} thao tác chưa gửi: giữ lại thì lần sau đăng nhập đúng tài khoản này chúng được gửi tiếp.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <label className="flex items-start gap-2 text-xs leading-relaxed">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={xoaMay}
                onChange={(e) => setXoaMay(e.target.checked)}
              />
              <span>
                Xoá bản sao hồ sơ của tài khoản này
                {sync.pending > 0 && ` và ${sync.pending} thao tác chưa gửi (sẽ mất hẳn)`} khỏi
                máy này. Nên chọn nếu đây là máy dùng chung.
              </span>
            </label>
            <AlertDialogFooter>
              <AlertDialogCancel>Ở lại</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  void chay(async () => {
                    await sync.dangXuat(xoaMay);
                    notify(
                      xoaMay
                        ? "Đã đăng xuất và xoá bản sao trên máy này."
                        : "Đã đăng xuất. App quay về chạy một mình trên máy này.",
                    );
                  })
                }
              >
                Đăng xuất
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  /* --------------------------------------------------------- chưa vào */
  const coMay = coDuLieu(data);
  /*
   * Đăng nhập là thay hồ sơ trên máy bằng hồ sơ trên tài khoản. Nếu hồ sơ trên
   * máy không phải bản sao của chính tài khoản ấy (chạy một mình, hoặc của tài
   * khoản khác) thì phải hỏi trước - một bản sao lưu vẫn được giữ, nhưng người
   * dùng cần biết để còn tìm lại.
   */
  const canHoi =
    coMay && (!sync.chu || sync.chu.email.trim().toLowerCase() !== email.trim().toLowerCase());

  const vao = () =>
    void chay(async () => {
      if (che === "moi") {
        // Lệnh đưa hồ sơ lên được xếp hàng trước khi lấy bản trắng của server
        // về, nên màn hình không trống trơn giữa chừng.
        await sync.dangKy(email, matKhau, ten || undefined, coMay ? data : undefined);
      } else {
        await sync.dangNhap(email, matKhau);
      }
    });
  const guiForm = () => {
    if (che === "vao" && canHoi) setHoiThay(true);
    else vao();
  };

  return (
    <div className="space-y-4 pt-5">
      {sync.chu && (
        <div role="status" className="border-warning/40 bg-warning/10 text-warning flex items-start gap-2 rounded-lg border p-3 text-xs leading-relaxed">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Phiên của <strong>{sync.chu.email}</strong> đã hết hạn.
            {sync.pending > 0
              ? ` ${sync.pending} thao tác đang chờ gửi - đăng nhập lại đúng tài khoản này để gửi tiếp.`
              : " Đăng nhập lại để tiếp tục đồng bộ."}{" "}
            Việc làm trong lúc chờ vẫn được xếp hàng, không mất.
          </span>
        </div>
      )}
      {!sync.chu && baoLoiDongBo}

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

      {che === "moi" && coMay && (
        <p className="text-muted-foreground flex items-start gap-2 text-xs">
          <Upload className="mt-0.5 size-3.5 shrink-0" />
          Hồ sơ đang có trên máy ({data.tasks.length} việc) sẽ được đưa lên
          ngay sau khi tạo tài khoản.
        </p>
      )}

      <SaoLuu />

      <AlertDialog open={hoiThay} onOpenChange={setHoiThay}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Thay hồ sơ trên máy bằng hồ sơ của tài khoản?</AlertDialogTitle>
            <AlertDialogDescription>
              Máy này đang có {data.tasks.length} việc và {data.sessions.length} phiên
              bế quan chưa thuộc tài khoản {email.trim()}. Đăng nhập sẽ thay chúng bằng
              hồ sơ trên máy chủ. Một bản sao lưu được giữ lại trên máy, khôi phục hoặc
              tải về ở mục "Bản sao lưu trên máy" bên dưới. Muốn đưa hồ sơ này lên máy
              chủ thì chọn "Tạo tài khoản" thay vì đăng nhập.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huỷ</AlertDialogCancel>
            <AlertDialogAction onClick={vao}>Đăng nhập và thay</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * Lệnh kẹt ở đầu hàng đợi, chờ người dùng quyết.
 *
 * Không bao giờ tự bỏ: bỏ một lệnh là bỏ một việc người dùng đã làm. Nhưng
 * cũng không để nó chặn cả hàng đợi mãi - nên đưa ra đây, nói rõ nó là gì và
 * vì sao kẹt, rồi để người dùng chọn.
 */
function LenhKet() {
  const { sync } = useApp();
  const [dangChay, setDangChay] = useState(false);
  const k = sync.ket;
  if (!k) return null;
  const lam = async (cach: "bo" | "gui-lai") => {
    setDangChay(true);
    try {
      await sync.xuLyLenhKet(cach);
    } finally {
      setDangChay(false);
    }
  };
  return (
    <div role="alert" className="border-destructive/40 bg-destructive/10 space-y-2 rounded-lg border p-3 text-xs leading-relaxed">
      <p className="text-destructive flex items-center gap-1.5 font-semibold">
        <TriangleAlert className="size-3.5" /> Thao tác “{k.ten}” chưa gửi được
      </p>
      <p>{k.lyDo}</p>
      <p className="text-muted-foreground">
        {k.loai === "ngay-cu"
          ? "Gửi lại theo ngày hôm nay thì máy chủ tính thao tác này như vừa làm hôm nay. Bỏ thì thay đổi ấy mất và hồ sơ lấy lại theo máy chủ."
          : "Các thao tác sau nó vẫn nằm chờ. Bỏ thì thay đổi ấy mất và hồ sơ lấy lại theo máy chủ."}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={dangChay} onClick={() => void lam("gui-lai")}>
          {k.loai === "ngay-cu" ? "Gửi lại theo ngày hôm nay" : "Thử gửi lại"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-destructive hover:text-destructive"
          disabled={dangChay}
          onClick={() => void lam("bo")}
        >
          Bỏ thao tác này
        </Button>
      </div>
    </div>
  );
}

/**
 * Bản sao lưu tự động trước mỗi lần hồ sơ trên máy bị thay bằng hồ sơ của
 * một tài khoản. Khôi phục vào máy chỉ làm được khi chạy một mình - đang đăng
 * nhập thì hồ sơ là của máy chủ, chỉ tải tệp hoặc đưa lên (nếu tài khoản còn
 * trắng) được thôi.
 */
function SaoLuu() {
  const { sync, replaceAll, notify, data } = useApp();
  // Bản sao lưu đang chờ xác nhận khôi phục (khôi phục là thay trắng hồ sơ).
  const [khoiPhuc, setKhoiPhuc] = useState<{ key: string; ban: ReturnType<typeof docSaoLuu> } | null>(null);
  // Đọc lại mỗi lần vẽ: danh sách ngắn (tối đa ba bản), và đổi ngay khi vừa đăng nhập.
  const ds = danhSachSaoLuu();
  if (!ds.length) return null;
  const doc = (key: string) => {
    const d = docSaoLuu(key);
    if (!d) notify("Bản sao lưu này không đọc được", "warn");
    return d;
  };
  return (
    <div className="space-y-2">
      <Separator />
      <p className="flex items-center gap-1.5 text-xs font-semibold">
        <ArchiveRestore className="size-3.5" /> Bản sao lưu trên máy
      </p>
      <ul className="space-y-2">
        {ds.map((b) => (
          <li key={b.key} className="border-border flex flex-wrap items-center gap-2 rounded-lg border p-2 text-xs">
            <div className="min-w-40 flex-1">
              <p className="font-medium">
                {b.luc ? new Date(b.luc).toLocaleString("vi-VN") : "Không rõ lúc"} · {b.soNhiemVu} việc, {b.soPhien} phiên
              </p>
              {b.lyDo && <p className="text-muted-foreground">{b.lyDo}</p>}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1"
              onClick={() => {
                const d = doc(b.key);
                if (d) exportFile(d);
              }}
            >
              <Download className="size-3.5" /> Tải tệp
            </Button>
            {sync.chu ? (
              sync.user && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1"
                  onClick={() => {
                    const d = doc(b.key);
                    if (d) void sync.nhapLenServer(d);
                  }}
                >
                  <CloudUpload className="size-3.5" /> Đưa lên tài khoản
                </Button>
              )
            ) : (
              <Button
                size="sm"
                variant="ghost"
                className="gap-1"
                onClick={() => {
                  const d = doc(b.key);
                  if (d) setKhoiPhuc({ key: b.key, ban: d });
                }}
              >
                <ArchiveRestore className="size-3.5" /> Khôi phục vào máy
              </Button>
            )}
          </li>
        ))}
      </ul>
      <ConfirmReplaceDialog
        open={!!khoiPhuc}
        onOpenChange={(v) => !v && setKhoiPhuc(null)}
        data={data}
        description="Hồ sơ trên máy này sẽ được thay bằng bản sao lưu đã chọn. Những gì làm sau lúc sao lưu sẽ mất nếu bạn chưa xuất tệp."
        actionLabel="Khôi phục bản này"
        destructive
        onConfirm={() => {
          if (khoiPhuc?.ban) {
            replaceAll(khoiPhuc.ban);
            notify("Đã khôi phục hồ sơ từ bản sao lưu");
          }
          setKhoiPhuc(null);
        }}
      />
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
    "loi-may-chu": { chu: `lỗi máy chủ${sync.pending ? ` · ${sync.pending} chờ` : ""}`, mau: "text-destructive" },
    "khong-tuong-thich": { chu: "máy chủ lệch phiên bản", mau: "text-destructive" },
    "het-phien": { chu: `phiên hết hạn${sync.pending ? ` · ${sync.pending} chờ` : ""}`, mau: "text-warning" },
    "lenh-ket": { chu: "thao tác bị kẹt", mau: "text-destructive" },
    "lech-gio": { chu: "đồng hồ máy lệch", mau: "text-warning" },
  };
  const m = meta[sync.status];
  const loi = TRANG_THAI_LOI.has(sync.status);

  return (
    <MetaChip className={cn("shrink-0", m.mau)}>
      {loi ? (
        <CloudOff className="size-3" />
      ) : (
        <ShieldCheck className="size-3" />
      )}
      {m.chu}
    </MetaChip>
  );
}
