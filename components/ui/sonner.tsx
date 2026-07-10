import {
  CircleCheck,
  Info,
  LoaderCircle,
  OctagonX,
  TriangleAlert,
} from "lucide-react"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      // Style unifié SOMBRE (fond quasi-noir, texte blanc) piloté par les
      // variables CSS de Sonner — s'applique à TOUS les types (succès, erreur,
      // info…) : l'icône seule porte le sens, le cadre reste identique.
      style={
        {
          "--normal-bg": "hsl(var(--foreground))",
          "--normal-text": "hsl(var(--background))",
          "--normal-border": "hsl(var(--foreground))",
          "--border-radius": "0.85rem",
        } as React.CSSProperties
      }
      icons={{
        success: <CircleCheck className="h-4 w-4" />,
        info: <Info className="h-4 w-4" />,
        warning: <TriangleAlert className="h-4 w-4" />,
        error: <OctagonX className="h-4 w-4" />,
        loading: <LoaderCircle className="h-4 w-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast !gap-2.5 !rounded-2xl !border-transparent !shadow-xl !shadow-foreground/25 !backdrop-blur-sm",
          title: "!text-[13px] !font-semibold",
          description: "!text-background/70 !text-[12px] !leading-snug",
          icon: "!text-background",
          actionButton: "!rounded-lg !bg-background !text-foreground !font-semibold",
          cancelButton: "!rounded-lg !bg-background/15 !text-background",
          closeButton:
            "!bg-foreground !text-background !border-background/25 hover:!bg-background/20 hover:!text-background",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
