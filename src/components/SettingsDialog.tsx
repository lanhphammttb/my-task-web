import { useRef } from "react";
import {
  Brush,
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
import { exportFile, readFile } from "../lib/storage";
import { useApp } from "../store/AppStore";
import AccountPanel from "./AccountPanel";
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
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SHORTCUTS: [string, string][] = [
  ["N", "Nhiệm vụ mới"],
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
  } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const s = data.settings;

  const doImport = async (file?: File) => {
    if (!file) return;
    try {
      replaceAll(await readFile(file));
      notify("Đã nhập dữ liệu thành công");
      onOpenChange(false);
    } catch {
      notify("Tệp không hợp lệ", "warn");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Cài đặt</DialogTitle>
          <DialogDescription>
            Đặt nhật khoá vừa sức để chuỗi tu luyện không bị đứt oan.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="goals" className="mt-2">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="goals" className="gap-1.5">
              <Wind className="size-3.5" /> Tu luyện
            </TabsTrigger>
            <TabsTrigger value="look" className="gap-1.5">
              <Brush className="size-3.5" /> Giao diện
            </TabsTrigger>
            <TabsTrigger value="data" className="gap-1.5">
              <Database className="size-3.5" /> Dữ liệu
            </TabsTrigger>
            <TabsTrigger value="account" className="gap-1.5">
              <UserRound className="size-3.5" /> Tài khoản
            </TabsTrigger>
          </TabsList>

          <TabsContent value="account">
            <AccountPanel />
          </TabsContent>

          <TabsContent value="goals" className="space-y-4 pt-5">
            <div className="grid gap-2">
              <Label htmlFor="s-dao-name">Đạo hiệu</Label>
              <Input
                id="s-dao-name"
                value={s.daoName}
                maxLength={24}
                onChange={(e) => updateSettings({ daoName: e.target.value })}
                placeholder="Ví dụ: Thanh Vân Tử"
              />
              <p className="text-muted-foreground text-xs">
                Tên hiển thị trên thẻ cảnh giới ở Tiên Lộ.
              </p>
            </div>
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="s-daily">Nhật khoá: nhiệm vụ / ngày</Label>
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
                <Label htmlFor="s-focus-target">Phút nhập định / ngày</Label>
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
              <Timer className="size-3.5" /> Đồng hồ bế quan
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="s-focus-len">
                  Độ dài phiên nhập định (phút)
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
                <Label htmlFor="s-break-len">Độ dài điều tức (phút)</Label>
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
              <input
                type="checkbox"
                className="accent-primary size-4 shrink-0"
                checked={s.soundEnabled}
                onChange={(e) =>
                  updateSettings({ soundEnabled: e.target.checked })
                }
              />
            </label>

            <label className="border-border hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors">
              <Film className="text-muted-foreground size-4 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">
                  Video & nhạc nền khi bế quan
                </span>
                <span className="text-muted-foreground text-xs">
                  Phát video tu luyện kèm nhạc nền trong lúc nhập định; tắt để
                  tiết kiệm pin
                </span>
              </span>
              <input
                type="checkbox"
                className="accent-primary size-4 shrink-0"
                checked={s.ambientEnabled}
                onChange={(e) =>
                  updateSettings({ ambientEnabled: e.target.checked })
                }
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
            <div
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
                    <ShieldCheck className="text-success size-4" /> Sổ ghi liền
                    mạch
                  </>
                ) : (
                  <>
                    <TriangleAlert className="text-destructive size-4" /> Sổ ghi
                    có dấu hiệu bị sửa
                  </>
                )}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Đã kiểm {audit.verified}/{data.ledger.length} bản ghi. Mỗi nhiệm
                vụ hoàn thành và mỗi phiên bế quan đều được móc vào một chuỗi
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

              {!audit.ok && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2.5 gap-1.5"
                  onClick={resealLedger}
                >
                  <ShieldCheck className="size-3.5" /> Chấp nhận & ký lại sổ ghi
                </Button>
              )}
            </div>

            <Separator />
            <p className="text-muted-foreground text-xs">
              Dữ liệu nằm trong trình duyệt của bạn. Xuất tệp định kỳ để sao lưu
              hoặc chuyển sang máy khác.
            </p>
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
                    <AlertDialogTitle>Xoá lịch sử nhiệm vụ đã xong?</AlertDialogTitle>
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
                onClick={loadSample}
              >
                <Sparkles className="size-4" /> Nạp dữ liệu mẫu
              </Button>
            </div>

            <Separator />

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive w-full justify-start gap-2"
                >
                  <Trash2 className="size-4" /> Xoá sạch dữ liệu
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Xoá toàn bộ dữ liệu?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Mọi nhiệm vụ, mục tiêu và lịch sử tập trung sẽ bị xoá vĩnh
                    viễn. Chuỗi ngày và huy hiệu cũng mất theo. Hành động này
                    không thể hoàn tác.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Huỷ</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive hover:bg-destructive/90 text-white"
                    onClick={resetAll}
                  >
                    Xoá hết
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
