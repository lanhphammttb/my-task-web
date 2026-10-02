import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Brush,
  ChevronDown,
  Database,
  Download,
  Eraser,
  Film,
  Keyboard,
  ShieldCheck,
  Sparkles,
  Timer,
  Trash2,
  TriangleAlert,
  Upload,
  UserRound,
  Volume2,
  Wind,
} from "lucide-react";
import type { AppData } from "../types";
import { exportFile, readFile } from "../lib/storage";
import { useApp } from "../store/AppStore";
import AccountPanel from "./AccountPanel";
import ConfirmReplaceDialog from "./ConfirmReplaceDialog";
import { useCaiDatNhac } from "../hooks/useNhacViec";
import {
  MOC_TRUOC_HAN,
  ghiCaiDatNhac,
  hoTroThongBao,
  laIOS,
  type MocTruocHan,
} from "../lib/nhacViec";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TAB_CLS =
  "min-h-11 flex-col gap-1 px-1 py-1.5 text-xs sm:flex-row sm:gap-2 sm:text-sm";

const SHORTCUTS: [string, string][] = [
  ["N", "Thêm việc"],
  ["1 – 8", "Chuyển màn hình"],
  ["/", "Tìm kiếm"],
  ["T", "Về hôm nay"],
  ["Esc", "Đóng hộp thoại"],
];

export default function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const {
    data,
    audit,
    resealLedger,
    updateSettings,
    replaceAll,
    loadSample,
    resetAll,
    clearDone,
    notify,
    sync,
  } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const s = data.settings;
  /*
   * Đang đăng nhập thì máy chủ giữ hồ sơ: nhập tệp, nạp mẫu, xoá sạch hay ký
   * lại sổ đều chỉ đổi được bản ở máy, và lần đồng bộ sau server ghi đè lại -
   * tệ hơn là trong lúc chờ, màn hình nói một đằng còn server giữ một nẻo.
   */
  const coServer = !!sync.chu;
  /*
   * Thao tác thay trắng hồ sơ đang chờ người dùng xác nhận. Nạp mẫu, nhập tệp
   * và xoá sạch đều đè lên dữ liệu thật - bấm nhầm một lần là mất hết - nên
   * luôn hỏi lại kèm lối "Xuất bản sao trước".
   */
  const [hoi, setHoi] = useState<
    | { loai: "mau" }
    | { loai: "tep"; ban: AppData; ten: string }
    | { loai: "xoa" }
    | null
  >(null);

  const doImport = async (file?: File) => {
    if (!file) return;
    try {
      // Đọc và kiểm tệp trước: tệp hỏng thì báo ngay, không bắt xác nhận vô ích.
      setHoi({ loai: "tep", ban: await readFile(file), ten: file.name });
    } catch {
      notify("Tệp không hợp lệ", "warn");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const xacNhan = () => {
    if (!hoi) return;
    if (hoi.loai === "mau") {
      loadSample();
      onOpenChange(false);
    } else if (hoi.loai === "tep") {
      replaceAll(hoi.ban);
      notify("Đã nhập dữ liệu thành công");
      onOpenChange(false);
    } else {
      resetAll();
    }
    setHoi(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Neo mép trên: đổi tab dài/ngắn không làm hộp thoại nhảy lên xuống. */}
      <DialogContent className="settings-dialog top-[max(12px,env(safe-area-inset-top))] max-h-[calc(100dvh-24px)] translate-y-0 overflow-y-auto overscroll-contain sm:top-[8vh] sm:max-h-[84dvh] sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Cài đặt</DialogTitle>
          <DialogDescription className="sr-only sm:not-sr-only">
            Đặt nhật khoá vừa sức để chuỗi tu luyện không bị đứt oan.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="goals" className="mt-2">
          {/* Điện thoại: biểu tượng nằm trên nhãn, mỗi tab cao ≥44px cho ngón cái. */}
          <TabsList className="grid h-auto! w-full grid-cols-4">
            <TabsTrigger value="goals" className={TAB_CLS}>
              <Wind className="size-4" /> Tu luyện
            </TabsTrigger>
            <TabsTrigger value="look" className={TAB_CLS}>
              <Brush className="size-4" /> Giao diện
            </TabsTrigger>
            <TabsTrigger value="data" className={TAB_CLS}>
              <Database className="size-4" /> Dữ liệu
            </TabsTrigger>
            <TabsTrigger value="account" className={TAB_CLS}>
              <UserRound className="size-4" /> Tài khoản
            </TabsTrigger>
          </TabsList>

          <TabsContent value="account">
            <AccountPanel />
          </TabsContent>

          <TabsContent value="goals" className="space-y-4 pt-5">
            <div className="grid gap-2">
              <Label htmlFor="s-dao-name">Đạo hiệu</Label>
              <DaoNameInput value={s.daoName} onCommit={(daoName) => updateSettings({ daoName })} />
              <p className="text-muted-foreground text-xs">
                Tên hiển thị trên thẻ cảnh giới ở Tiên Lộ.
              </p>
            </div>
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="s-daily">Số việc mỗi ngày</Label>
                <Input
                  id="s-daily"
                  type="number"
                  min={1}
                  max={30}
                  value={s.dailyTarget}
                  onChange={(e) =>
                    updateSettings({ dailyTarget: Number(e.target.value) || 1 })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="s-focus-target">Phút tập trung / ngày</Label>
                <Input
                  id="s-focus-target"
                  type="number"
                  min={15}
                  step={15}
                  value={s.dailyFocusTarget}
                  onChange={(e) =>
                    updateSettings({
                      dailyFocusTarget: Number(e.target.value) || 15,
                    })
                  }
                />
              </div>
            </div>
            <Separator />
            <p className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
              <Timer className="size-3.5" /> Đồng hồ tập trung (bế quan)
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="s-focus-len">
                  Độ dài một phiên tập trung (phút)
                </Label>
                <Input
                  id="s-focus-len"
                  type="number"
                  min={5}
                  max={120}
                  step={5}
                  value={s.focusLength}
                  onChange={(e) =>
                    updateSettings({ focusLength: Number(e.target.value) || 5 })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="s-break-len">Nghỉ giữa phiên (phút)</Label>
                <Input
                  id="s-break-len"
                  type="number"
                  min={1}
                  max={60}
                  value={s.breakLength}
                  onChange={(e) =>
                    updateSettings({ breakLength: Number(e.target.value) || 1 })
                  }
                />
              </div>
            </div>
            <Separator />
            <NhacViecCaiDat notify={notify} />
          </TabsContent>

          <TabsContent value="look" className="space-y-4 pt-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Giao diện</Label>
                <Select
                  value={s.theme}
                  onValueChange={(v) =>
                    updateSettings({ theme: v as "dark" | "light" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Tối</SelectItem>
                    <SelectItem value="light">Sáng</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Tuần bắt đầu từ</Label>
                <Select
                  value={String(s.weekStartsOn)}
                  onValueChange={(v) =>
                    updateSettings({ weekStartsOn: Number(v) as 0 | 1 })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Thứ Hai</SelectItem>
                    <SelectItem value="0">Chủ Nhật</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <label className="border-border hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors">
              <Volume2 className="text-muted-foreground size-4 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">
                  Âm thanh phản hồi
                </span>
                <span className="text-muted-foreground text-xs">
                  Tiếng ting khi xong việc, nhạc ngắn khi đột phá cảnh giới
                </span>
              </span>
              <Switch
                aria-label="Âm thanh phản hồi"
                checked={s.soundEnabled}
                onCheckedChange={(v) => updateSettings({ soundEnabled: v })}
              />
            </label>

            <label className="border-border hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors">
              <Film className="text-muted-foreground size-4 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">
                  Video + âm thanh nền khi bế quan
                </span>
                <span className="text-muted-foreground text-xs">
                  Phát video tu luyện kèm tiếng gió và không gian hang lúc nhập định; tắt để tiết kiệm pin
                </span>
              </span>
              <Switch
                aria-label="Video và âm thanh nền khi bế quan"
                checked={s.ambientEnabled}
                onCheckedChange={(v) => updateSettings({ ambientEnabled: v })}
              />
            </label>

            <div className="border-border rounded-lg border p-3">
              <p className="mb-2.5 flex items-center gap-2 text-sm font-medium">
                <Keyboard className="text-muted-foreground size-4" /> Phím tắt
              </p>
              <dl className="grid gap-1.5 sm:grid-cols-2">
                {SHORTCUTS.map(([key, meaning]) => (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <kbd className="bg-muted border-border min-w-8 rounded border px-1.5 py-0.5 text-center font-mono text-[10.5px]">
                      {key}
                    </kbd>
                    <span className="text-muted-foreground">{meaning}</span>
                  </div>
                ))}
              </dl>
            </div>
          </TabsContent>

          <TabsContent value="data" className="space-y-3 pt-5">
            {/* --------------------------------------- toàn vẹn dữ liệu */}
            {/*
             * Một dòng trạng thái cho người dùng; chuyện chuỗi băm, chống gian
             * lận là chi tiết kỹ thuật - gấp vào "Tìm hiểu thêm".
             */}
            <div
              role="status"
              className={cn(
                "rounded-lg border p-3",
                audit.ok
                  ? "border-success/40 bg-success/[0.07]"
                  : "border-destructive/45 bg-destructive/[0.07]",
              )}
            >
              <p className="flex items-center gap-2 text-sm font-semibold">
                {audit.ok ? (
                  <>
                    <ShieldCheck className="text-success size-4" /> Dữ liệu toàn vẹn
                  </>
                ) : (
                  <>
                    <TriangleAlert className="text-destructive size-4" /> Dữ liệu có
                    chỗ bất thường
                  </>
                )}
              </p>
              {!audit.ok && (
                <p className="text-muted-foreground mt-1 text-xs">
                  Lịch sử tu luyện có vẻ đã bị sửa ngoài app. Xem chi tiết bên dưới.
                </p>
              )}

              {!audit.ok && !coServer && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2.5 gap-1.5"
                  onClick={resealLedger}
                >
                  <ShieldCheck className="size-3.5" /> Chấp nhận & ký lại sổ ghi
                </Button>
              )}

              <details className="group mt-2 text-xs">
                <summary className="text-muted-foreground hover:text-foreground flex min-h-8 cursor-pointer list-none items-center gap-1 font-medium [&::-webkit-details-marker]:hidden">
                  Tìm hiểu thêm
                  <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
                </summary>
                <p className="text-muted-foreground mt-1">
                  Đã kiểm {audit.verified}/{data.ledger.length} bản ghi. Mỗi việc
                  hoàn thành và mỗi phiên bế quan đều được móc vào một chuỗi
                  băm; sửa tay ở bất kỳ đâu sẽ làm đứt chuỗi.
                </p>
                {audit.findings.length > 0 && (
                  <ul className="mt-2.5 space-y-1.5">
                    {audit.findings.map((f) => (
                      <li
                        key={f.code}
                        className={cn(
                          "rounded border px-2.5 py-1.5 text-[11.5px]",
                          f.severity === "error"
                            ? "border-destructive/35 bg-destructive/10 text-destructive"
                            : "border-warning/35 bg-warning/10 text-warning",
                        )}
                      >
                        {f.message}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-muted-foreground mt-2.5 text-[11px] leading-relaxed">
                  App chạy hoàn toàn trên máy bạn nên{" "}
                  <strong>không thể chống gian lận tuyệt đối</strong> — người
                  quyết tâm vẫn có thể đọc mã nguồn rồi tự dựng chuỗi hợp lệ. Muốn
                  chống thật thì phải có server ký sổ ghi.
                </p>
              </details>
            </div>

            <Separator />
            <p className="text-muted-foreground text-xs">
              Dữ liệu nằm trong trình duyệt của bạn. Xuất tệp định kỳ để sao lưu
              hoặc chuyển sang máy khác.
            </p>
            {coServer && (
              <p role="note" className="border-warning/40 bg-warning/10 text-warning rounded-lg border px-3 py-2 text-xs leading-relaxed">
                Đang đăng nhập: máy chủ giữ hồ sơ, nên nhập từ tệp, nạp dữ liệu
                mẫu và xoá sạch bị khoá - chúng chỉ đổi được bản trên máy rồi bị
                máy chủ ghi đè. Đăng xuất trước nếu muốn làm, hoặc dùng "Đưa hồ sơ
                máy này lên" ở mục Tài khoản khi tài khoản còn trắng.
              </p>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                variant="outline"
                className="justify-start gap-2"
                onClick={() => exportFile(data)}
              >
                <Download className="size-4" /> Xuất tệp JSON
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-2"
                disabled={coServer}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="size-4" /> Nhập từ tệp
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                hidden
                onChange={(e) => void doImport(e.target.files?.[0])}
              />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="justify-start gap-2">
                    <Eraser className="size-4" /> Dọn việc đã xong
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Xoá lịch sử việc đã xong?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Thao tác này xoá các việc đã hoàn thành trước hôm nay, không phải cất chúng vào kho.
                      Tu vi, linh thạch, chuỗi ngày và tiến độ liên quan sẽ được tính lại và có thể giảm.
                      Nếu muốn giữ thành quả tu luyện, hãy huỷ và giữ lịch sử này.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Giữ lịch sử</AlertDialogCancel>
                    <AlertDialogAction onClick={() => clearDone()}>Xoá lịch sử cũ</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button
                variant="outline"
                className="justify-start gap-2"
                disabled={coServer}
                onClick={() => setHoi({ loai: "mau" })}
              >
                <Sparkles className="size-4" /> Nạp dữ liệu mẫu
              </Button>
            </div>

            <Separator />

            <Button
              variant="outline"
              disabled={coServer}
              className="text-destructive hover:text-destructive w-full justify-start gap-2"
              onClick={() => setHoi({ loai: "xoa" })}
            >
              <Trash2 className="size-4" /> Xoá sạch dữ liệu
            </Button>

            <ConfirmReplaceDialog
              open={!!hoi}
              onOpenChange={(v) => !v && setHoi(null)}
              data={data}
              title={hoi?.loai === "xoa" ? "Xoá toàn bộ dữ liệu?" : undefined}
              description={
                hoi?.loai === "xoa"
                  ? "Mọi việc, mục tiêu và lịch sử tập trung sẽ bị xoá vĩnh viễn. Chuỗi ngày và huy hiệu cũng mất theo. Hành động này không thể hoàn tác."
                  : hoi?.loai === "tep"
                    ? `Hồ sơ trên máy này sẽ được thay bằng nội dung tệp "${hoi.ten}". Việc, mục tiêu và tu vi hiện có sẽ mất nếu bạn chưa sao lưu.`
                    : "Hồ sơ trên máy này sẽ được thay bằng dữ liệu mẫu. Việc, mục tiêu và tu vi hiện có sẽ mất nếu bạn chưa sao lưu."
              }
              actionLabel={
                hoi?.loai === "xoa" ? "Xoá hết" : hoi?.loai === "tep" ? "Thay bằng tệp này" : "Thay bằng dữ liệu mẫu"
              }
              destructive
              onConfirm={xacNhan}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Bật/tắt nhắc việc trên máy này.
 *
 * Bật lên là xin quyền thông báo ngay trong cú bấm (trình duyệt chỉ cho xin
 * quyền khi người dùng vừa bấm). Bị từ chối thì để công tắc tắt và nói rõ phải
 * mở lại ở đâu - công tắc bật mà không bao giờ báo thì tệ hơn không có.
 */
function NhacViecCaiDat({ notify }: { notify: (msg: string, tone?: "warn") => void }) {
  const cai = useCaiDatNhac();
  const coTB = hoTroThongBao();
  const ios = laIOS();
  const [quyen, setQuyen] = useState<NotificationPermission | "khong-co">(
    coTB ? Notification.permission : "khong-co",
  );
  const bat = cai.bat && quyen === "granted";

  const doi = async (v: boolean) => {
    if (!v) {
      ghiCaiDatNhac({ ...cai, bat: false });
      return;
    }
    if (!coTB) {
      notify(
        ios
          ? "Thêm app vào Màn hình chính rồi mở từ đó để bật nhắc việc."
          : "Trình duyệt này không hỗ trợ thông báo.",
        "warn",
      );
      return;
    }
    let q = Notification.permission;
    if (q === "default") {
      try {
        q = await Notification.requestPermission();
      } catch {
        q = Notification.permission;
      }
    }
    setQuyen(q);
    if (q !== "granted") {
      notify("Chưa được phép gửi thông báo - mở lại trong cài đặt trình duyệt.", "warn");
      return;
    }
    ghiCaiDatNhac({ ...cai, bat: true });
    notify("Đã bật nhắc việc");
  };

  return (
    <div className="space-y-3">
      <label className="border-border hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors">
        <Bell className="text-muted-foreground size-4 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">Nhắc việc</span>
          <span className="text-muted-foreground text-xs">
            Báo đúng giờ bắt đầu và trước hạn chót của việc chưa xong (hôm nay và ngày mai)
          </span>
        </span>
        <Switch aria-label="Nhắc việc" checked={bat} onCheckedChange={(v) => void doi(v)} />
      </label>
      {bat && (
        <div className="grid gap-2 sm:grid-cols-2 sm:items-center">
          <Label htmlFor="s-nhac-truoc">Nhắc trước hạn chót</Label>
          <Select
            value={String(cai.truocHan)}
            onValueChange={(v) => ghiCaiDatNhac({ ...cai, truocHan: Number(v) as MocTruocHan })}
          >
            <SelectTrigger id="s-nhac-truoc">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MOC_TRUOC_HAN.map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {m === 60 ? "1 giờ" : `${m} phút`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {quyen === "denied" && (
        <p role="note" className="border-warning/40 bg-warning/10 text-warning rounded-lg border px-3 py-2 text-xs leading-relaxed">
          Trình duyệt đang chặn thông báo của app. Mở lại quyền thông báo trong cài đặt trình duyệt rồi bật lại ở đây.
        </p>
      )}
      <p className="text-muted-foreground text-xs leading-relaxed">
        Nhắc chạy ngay trên máy, không qua máy chủ: chỉ báo được khi app đang mở
        hoặc vừa chạy nền. Mở lại app thì những lời nhắc lỡ trong 10 phút gần nhất
        được báo bù một lần.
        {ios || !coTB ? " " : ""}
        {(ios || !coTB) && (
          <strong className="text-foreground font-medium">
            iPhone/iPad: cần iOS 16.4 trở lên và thêm app vào Màn hình chính (Chia sẻ → Thêm vào MH chính), rồi mở app từ biểu tượng đó.
          </strong>
        )}
      </p>
    </div>
  );
}

/**
 * Ô đạo hiệu: gõ thì chỉ đổi trong ô, dừng tay 600ms hoặc rời ô mới lưu.
 *
 * Mỗi lần lưu là một lệnh gửi lên máy chủ và một lần ghi cả hồ sơ xuống đĩa -
 * lưu theo từng phím thì gõ một cái tên mười chữ là mười lệnh nối đuôi nhau.
 */
function DaoNameInput({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [nhap, setNhap] = useState<string | null>(null);
  const hen = useRef<number | undefined>(undefined);
  const chot = (v: string | null) => {
    if (hen.current !== undefined) window.clearTimeout(hen.current);
    hen.current = undefined;
    if (v !== null && v !== value) onCommit(v);
  };
  // Đóng hộp thoại giữa lúc đang gõ thì vẫn lưu nốt.
  const cuoi = useRef({ nhap, chot });
  useEffect(() => {
    cuoi.current = { nhap, chot };
  });
  useEffect(() => () => cuoi.current.chot(cuoi.current.nhap), []);
  return (
    <Input
      id="s-dao-name"
      value={nhap ?? value}
      maxLength={24}
      onFocus={() => setNhap(value)}
      onChange={(e) => {
        const v = e.target.value;
        setNhap(v);
        if (hen.current !== undefined) window.clearTimeout(hen.current);
        hen.current = window.setTimeout(() => chot(v), 600);
      }}
      onBlur={() => {
        chot(nhap);
        setNhap(null);
      }}
      onKeyDown={(e) => e.key === "Enter" && chot(nhap)}
      placeholder="Ví dụ: Thanh Vân Tử"
    />
  );
}
