import { useState } from "react";
import { Droplets, Minus, Repeat } from "lucide-react";
import {
  ELEMENTS,
  ELEMENT_ORDER,
  MIN_ROOT_ELEMENTS,
  REFINE_COST,
  ROOT_GRADES,
  condenseCost,
  gradeOf,
} from "../../lib/spirit";
import type { Element } from "../../lib/spirit";
import { stoneBalance } from "../../lib/economy";
import { useApp } from "../../store/AppStore";
import ElementSeal from "../ElementSeal";
import { MetaChip, Section } from "../primitives";
import ChoiceCard from "./ChoiceCard";
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
 * Tẩy tuỷ đúng nghĩa.
 *
 * Trước đây chỗ này chỉ có mỗi nút roll lại toàn bộ linh căn - trúng Thiên Linh
 * Căn rồi lỡ bấm thêm lần nữa là mất trắng, mà không có cách nào sửa đúng một
 * hệ mình không ưng. Hai phép ở đây cho người tu quyền định hình linh căn:
 * **tẩy hệ** thì đổi một hệ và giữ nguyên phẩm cấp, **ngưng luyện** thì bỏ bớt
 * một hệ để lên phẩm - đổi lại mất luôn thiên phú của hệ ấy.
 */
export default function RootRefineSection() {
  const { data, refineRootElement, condenseRootElement } = useApp();

  // Mỗi phép một hộp thoại dùng chung, nhớ đang thao tác trên hệ nào.
  const [swapFrom, setSwapFrom] = useState<Element | null>(null);
  const [dropEl, setDropEl] = useState<Element | null>(null);

  const root = data.root;
  if (!root) return null;

  const balance = stoneBalance(data);
  const grade = gradeOf(root);
  const canCondense = root.elements.length > MIN_ROOT_ELEMENTS;
  const condense = condenseCost(root.elements.length);
  const nextGrade = ROOT_GRADES.find(
    (g) => g.count === root.elements.length - 1,
  );
  const available = ELEMENT_ORDER.filter((e) => !root.elements.includes(e));

  return (
    <Section
      id="cave-refine"
      collapsible
      defaultOpen={false}
      icon={Droplets}
      title="Tẩy tuỷ"
      subtitle={`${grade.name} · hệ số tu vi ×${grade.multiplier}`}
    >
      <p className="text-muted-foreground mb-3 text-xs leading-relaxed">
        Tẩy tuỷ là gột rửa dần chứ không phải gieo lại xúc xắc. Đổi một hệ thì
        phẩm cấp giữ nguyên; bỏ bớt một hệ thì linh căn thuần hơn và hấp thu
        nhanh hơn, nhưng <strong>mất luôn thiên phú</strong> của hệ đã bỏ.
      </p>

      <div className="grid gap-2.5">
        {root.elements.map((el) => {
          const meta = ELEMENTS[el];
          return (
            <div
              key={el}
              className="flex flex-wrap items-center gap-3 rounded-xl border p-3"
            >
              <ElementSeal element={el} className="size-10 shrink-0" />

              <div className="min-w-40 flex-1">
                <h4
                  className="font-title text-sm font-bold"
                  style={{ color: meta.color }}
                >
                  {meta.label} · {meta.perk}
                </h4>
                <p className="text-muted-foreground mt-0.5 text-[11px]">
                  {meta.perkNote}
                </p>
              </div>

              <div className="flex shrink-0 gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={available.length === 0 || balance < REFINE_COST}
                  onClick={() => setSwapFrom(el)}
                >
                  <Repeat className="size-3.5" /> Tẩy ({REFINE_COST})
                </Button>

                {canCondense && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={balance < condense}
                    onClick={() => setDropEl(el)}
                  >
                    <Minus className="size-3.5" /> Bỏ ({condense})
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!canCondense && (
        <MetaChip className="mt-3">
          Đơn hệ đã là tận cùng của thuần khiết
        </MetaChip>
      )}

      {/* ------------------------------------------------------- đổi một hệ */}
      <AlertDialog
        open={swapFrom !== null}
        onOpenChange={(open) => !open && setSwapFrom(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Tẩy hệ {swapFrom ? ELEMENTS[swapFrom].label : ""} thành hệ nào?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tốn {REFINE_COST} linh thạch. Số hệ giữ nguyên nên vẫn là{" "}
              {grade.name}, chỉ đổi thiên phú đi kèm.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid min-w-0 gap-2">
            {available.map((to) => (
              <ChoiceCard
                key={to}
                tone={ELEMENTS[to].color}
                leading={<ElementSeal element={to} size={40} />}
                title={`${ELEMENTS[to].label} · ${ELEMENTS[to].perk}`}
                onClick={() => {
                  if (swapFrom) refineRootElement(swapFrom, to);
                  setSwapFrom(null);
                }}
              >
                <span className="text-muted-foreground text-[11px]">
                  {ELEMENTS[to].perkNote}
                </span>
              </ChoiceCard>
            ))}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Thôi</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ------------------------------------------------------- ngưng luyện */}
      <AlertDialog
        open={dropEl !== null}
        onOpenChange={(open) => !open && setDropEl(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Ngưng luyện, bỏ hệ {dropEl ? ELEMENTS[dropEl].label : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tốn {condense} linh thạch. Linh căn lên{" "}
              <strong>{nextGrade?.name ?? "phẩm cao hơn"}</strong>, hệ số tu vi
              từ ×{grade.multiplier} lên ×
              {nextGrade?.multiplier ?? grade.multiplier}. Đổi lại mất vĩnh viễn
              thiên phú <strong>{dropEl ? ELEMENTS[dropEl].perk : ""}</strong>
              {dropEl ? ` — ${ELEMENTS[dropEl].perkNote.toLowerCase()}` : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Thôi</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (dropEl) condenseRootElement(dropEl);
                setDropEl(null);
              }}
            >
              Ngưng luyện
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Section>
  );
}
