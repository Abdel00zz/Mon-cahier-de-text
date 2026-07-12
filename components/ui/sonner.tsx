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
      icons={{
        success: <div className="hidden" />,
        info: <Info className="h-3.5 w-3.5" />,
        warning: <TriangleAlert className="h-3.5 w-3.5" />,
        error: <OctagonX className="h-3.5 w-3.5" />,
        loading: <LoaderCircle className="h-3.5 w-3.5 animate-spin" />,
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
