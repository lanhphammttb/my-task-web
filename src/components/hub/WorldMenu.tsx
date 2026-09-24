import { useState } from "react";
import { Compass, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import ArtImage from "../ArtImage";
import type { ViewKey } from "../../types";
import type { RailIcon } from "../../lib/icons";
import { railSrc } from "../../lib/icons";

export interface WorldLink {
  view: ViewKey;
  icon: RailIcon;
  label: string;
  hint: string;
  badge?: number;
  alert?: boolean;
}

export default function WorldMenu({
  view,
  searching,
  links,
  onSelect,
}: {
  view: ViewKey | null;
  searching: boolean;
  links: WorldLink[];
  onSelect: (view: ViewKey, anchor?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = !searching && links.some((link) => view === link.view);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="primary-destination"
          aria-label="Tiên giới"
          aria-current={active ? "page" : undefined}
        >
          <span className="destination-icon">
            <Compass className="size-5" />
            {links.some((link) => link.alert) && (
              <i className="nav-notification" />
            )}
          </span>
          <span>Tiên giới</span>
          <small>Khám phá & tiến triển</small>
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={12}
        className="world-menu"
        aria-label="Khám phá tiên giới"
      >
        <div className="world-menu-heading">
          <Compass className="size-5" />
          <div>
            <h2>Tiên giới</h2>
            <p>Công sức mỗi ngày, một bước tiến xa hơn.</p>
          </div>
        </div>
        <nav aria-label="Các khu trong Tiên giới">
          {links.map((link) => {
            const selected = !searching && view === link.view;
            return (
              <button
                key={link.label}
                type="button"
                aria-label={link.label}
                aria-current={selected ? "page" : undefined}
                onClick={() => {
                  setOpen(false);
                  onSelect(link.view);
                }}
              >
                <ArtImage
                  src={railSrc(link.icon)}
                  alt=""
                  className="size-8 shrink-0 object-contain"
                />
                <span className="min-w-0 flex-1">
                  <strong>{link.label}</strong>
                  <small>{link.hint}</small>
                </span>
                {link.alert && <span className="world-attention">Cần xem</span>}
                {!!link.badge && (
                  <span className="tabular text-xs text-gold-bright">
                    {link.badge}
                  </span>
                )}
                <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
              </button>
            );
          })}
        </nav>
      </PopoverContent>
    </Popover>
  );
}
