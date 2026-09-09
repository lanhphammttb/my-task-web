import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "color-mix(in oklab, var(--gold) 42%, transparent)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          // Viền vàng mảnh + đổ bóng sâu cho hợp bảng màu tu tiên.
          toast: "cn-toast !shadow-[0_10px_30px_rgb(0_0_0/55%)]",
          success: "[&_svg]:text-[var(--success)]",
          warning: "[&_svg]:text-[var(--warning)]",
          error: "[&_svg]:text-[var(--destructive)]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
