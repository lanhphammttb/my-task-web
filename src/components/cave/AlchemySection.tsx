import { Flame, ShoppingBag } from "lucide-react";
import {
  CONSOLATION_CHANCE,
  MARKET_GRADES,
  PILLS,
  PILL_ORDER,
  RECIPES,
  consolationGrade,
  refineChance,
} from "../../lib/pills";
import type { PillGrade } from "../../lib/pills";
import { HERBS, HERB_ORDER, hasHerbs } from "../../lib/field";
import { caveAt, caveRefineBonus } from "../../lib/cave";
import { FIRE_ROOT_BONUS } from "../../lib/pills";
import { stoneBalance } from "../../lib/economy";
import { useApp } from "../../store/AppStore";
import { MetaChip, Section } from "../primitives";
import SectionArt from "../SectionArt";
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
import { cn } from "@/lib/utils";

const pct = (x: number) => `${Math.round(x * 100)}%`;

/**
 * Đan Đường.
 *
 * Trước đây mục này mang tiếng là đan đường nhưng chỉ có mỗi nút Mua - tức là
 * một cái quầy hàng. Giờ trung phẩm và thượng phẩm bắt buộc phải tự luyện: tốn
 * linh thảo mình trồng, tốn củi lửa, và **có thể hỏng**. Chợ chỉ còn bán hạ
 * phẩm với giá cắt cổ, để người mới không bị chặn đứng trước cửa độ kiếp.
 */
export default function AlchemySection() {
  const { data, refinePill, buyPill } = useApp();

  const balance = stoneBalance(data);
  const fireRoot = !!data.root?.elements.includes("hoa");
  const caveBonus = caveRefineBonus(data.caveLevel);
  const cave = caveAt(data.caveLevel);

  return (
    <Section
      id="cave-pill"
      collapsible
      defaultOpen={false}
      icon={Flame}
      title="Đan đường"
      subtitle={`Lò ${cave.name} · tay nghề ${caveBonus > 0 ? `+${pct(caveBonus)}` : "chưa thêm gì"}`}
    >
      <SectionArt
        src="/art/section/lo-dan.png"
        caption="Lò đan trong động"
        tone="#e0a83c"
      >
        Đan độ kiếp phải tự luyện từ linh thảo trong linh điền. Nâng động phủ
        thì lò cháy đều hơn
        {fireRoot
          ? ", và linh căn hệ Hoả của bạn đang cộng thêm " +
            pct(FIRE_ROOT_BONUS)
          : ""}
        .
      </SectionArt>

      <div className="grid gap-2.5">
        {PILL_ORDER.map((grade) => {
          const pill = PILLS[grade];
          const recipe = RECIPES[grade];
          const chance = refineChance(grade, caveBonus, fireRoot);
          const enoughHerbs = hasHerbs(data.herbs, recipe.herbs);
          const enoughStones = balance >= recipe.stones;
          const canRefine = enoughHerbs && enoughStones;
          const salvage = consolationGrade(grade);

          return (
            <div
              key={grade}
              className="flex flex-wrap items-center gap-3 rounded-xl border p-3"
            >
              <img
        loading="lazy"
        decoding="async"
                src={pill.image}
                alt=""
                className="size-12 shrink-0 object-contain drop-shadow-lg"
              />

              <div className="min-w-40 flex-1">
                <div className="flex items-baseline gap-2">
                  <h4 className="font-title text-sm font-bold">{pill.name}</h4>
                  <span className="tabular text-muted-foreground text-[11px]">
                    đang có {data.pills[grade] ?? 0}
                  </span>
                </div>
                <p className="text-muted-foreground mt-0.5 text-[11px]">
                  Độ kiếp {pct(pill.chance)} · luyện thành {pct(chance)}
                </p>

                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {HERB_ORDER.filter((id) => (recipe.herbs[id] ?? 0) > 0).map(
                    (id) => {
                      const need = recipe.herbs[id] ?? 0;
                      const have = data.herbs[id] ?? 0;
                      return (
                        <MetaChip
                          key={id}
                          className={cn(
                            have >= need
                              ? "border-success/35 bg-success/12 text-success"
                              : "border-warning/35 bg-warning/12 text-warning",
                          )}
                        >
                          {HERBS[id].short} {have}/{need}
                        </MetaChip>
                      );
                    },
                  )}
                  <MetaChip
                    className={cn(
                      !enoughStones && "border-warning/35 text-warning",
                    )}
                  >
                    {recipe.stones} linh thạch
                  </MetaChip>
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-1.5">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" disabled={!canRefine} className="gap-1.5">
                      <Flame className="size-3.5" /> Luyện
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Nổi lửa luyện {pill.name}?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Cơ hội thành đan <strong>{pct(chance)}</strong>. Linh
                        thảo và {recipe.stones} linh thạch mất dù thành hay bại.
                        {salvage
                          ? ` Nếu hỏng thì còn ${pct(CONSOLATION_CHANCE)} vớt được một viên ${PILLS[salvage].short}.`
                          : " Hỏng là mất trắng cả mẻ."}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Thôi</AlertDialogCancel>
                      <AlertDialogAction onClick={() => refinePill(grade)}>
                        Nổi lửa
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {MARKET_GRADES.includes(grade) && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={balance < pill.cost}
                    onClick={() => buyPill(grade)}
                    className="gap-1.5"
                  >
                    <ShoppingBag className="size-3.5" /> Mua ({pill.cost})
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-muted-foreground mt-3 text-[11px]">
        Chợ chỉ bán {PILLS[MARKET_GRADES[0] as PillGrade].short}, và bán đắt hơn
        tự luyện nhiều lần. Trung phẩm với thượng phẩm thì không ai bán — muốn
        có phải tự trồng, tự đốt lò.
      </p>
    </Section>
  );
}
