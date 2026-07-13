import {
  Info,
  Loader2,
  CircleX,
  TriangleAlert,
} from "./icons"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <div className="hidden" />,
        info: <Info className="h-3.5 w-3.5" />,
        warning: <TriangleAlert className="h-3.5 w-3.5" />,
        error: <CircleX className="h-3.5 w-3.5" />,
        loading: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast: "group toast",
          title: "font-sans",
          description: "font-sans",
          closeButton: "close-btn",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
