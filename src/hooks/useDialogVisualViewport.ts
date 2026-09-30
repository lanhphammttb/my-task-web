import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

type VisibleArea = { height: number; bottom: number; left: number; right: number };
type ViewportStyle = CSSProperties & {
  "--dialog-visible-height"?: string;
  "--dialog-bottom-inset"?: string;
  "--dialog-left-inset"?: string;
  "--dialog-right-inset"?: string;
};

/** Keep mobile sheets inside the visible screen when the on-screen keyboard opens. */
export function useDialogVisualViewport(open: boolean, mobile: boolean): ViewportStyle | undefined {
  const [area, setArea] = useState<VisibleArea | null>(null);

  useEffect(() => {
    if (!open || !mobile) {
      return;
    }

    const viewport = window.visualViewport;
    const update = () => {
      const height = viewport?.height ?? window.innerHeight;
      const offsetTop = viewport?.offsetTop ?? 0;
      const bottom = Math.max(0, window.innerHeight - height - offsetTop);
      const width = viewport?.width ?? window.innerWidth;
      const offsetLeft = viewport?.offsetLeft ?? 0;
      const left = Math.max(0, offsetLeft);
      const right = Math.max(0, window.innerWidth - width - offsetLeft);
      setArea((current) =>
        current?.height === height && current.bottom === bottom && current.left === left && current.right === right
          ? current
          : { height, bottom, left, right },
      );
    };

    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update, { passive: true });
    window.addEventListener("orientationchange", update, { passive: true });

    return () => {
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, [open, mobile]);

  if (!open || !mobile || !area) return undefined;
  return {
    "--dialog-visible-height": `${area.height}px`,
    "--dialog-bottom-inset": `${area.bottom}px`,
    "--dialog-left-inset": `${area.left}px`,
    "--dialog-right-inset": `${area.right}px`,
  };
}
