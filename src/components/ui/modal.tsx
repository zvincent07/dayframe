import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

export type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "5xl" | "responsive" | "full"

export interface ModalProps {
  /** Controls whether the modal is visible */
  isOpen: boolean
  /** Callback fired when the modal should be closed (e.g., clicking overlay, pressing ESC) */
  onClose: (isOpen: boolean) => void
  /** Optional overlay classes (e.g. backdrop blur). */
  overlayClassName?: string
  /** The primary title of the modal (renders in DialogHeader) */
  title?: React.ReactNode
  /** Optional subtitle or description (renders in DialogDescription) */
  description?: React.ReactNode
  /** Main content of the modal */
  children: React.ReactNode
  /** Optional footer content (e.g., action buttons) */
  footer?: React.ReactNode
  /** Size variant controlling the max-width of the modal */
  size?: ModalSize
  /** Additional CSS classes for the modal content container */
  className?: string
  /** If true, hides the default top-right X close button */
  hideCloseButton?: boolean
}

/** Shell shared with workout “Manage routines” / “Set plan” modals: default overlay, rounded-lg panel, header + scroll + optional footer. */
export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  className,
  hideCloseButton = false,
  overlayClassName,
}: ModalProps) {
  // Map size prop to Tailwind max-width classes
  const sizeClasses: Record<ModalSize, string> = {
    sm: "sm:max-w-sm",
    md: "sm:max-w-md",
    lg: "sm:max-w-lg",
    xl: "sm:max-w-xl",
    "2xl": "sm:max-w-2xl",
    "5xl": "sm:max-w-5xl",
    responsive: "w-[95vw] sm:max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl",
    full: "sm:max-w-[calc(100vw-2rem)] h-[calc(100vh-2rem)]",
  }

  const hasHeader = title != null || description != null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        overlayClassName={overlayClassName}
        className={cn(
          "flex flex-col gap-0 max-h-[85vh]",
          sizeClasses[size], 
          className
        )} 
        showCloseButton={!hideCloseButton}
        aria-describedby={"modal-description"}
      >
        {hasHeader ? (
          <DialogHeader className="mb-4 shrink-0">
            {title ? <DialogTitle>{title}</DialogTitle> : null}
            <DialogDescription id="modal-description" asChild>
              {description ? <div>{description}</div> : <VisuallyHidden>Modal Description</VisuallyHidden>}
            </DialogDescription>
          </DialogHeader>
        ) : (
          <span id="modal-description" className="sr-only">
            Dialog content
          </span>
        )}
        
        {/* Scrollable content area — matches workout routine editor inner padding */}
        <div
          className={cn(
            "relative isolate z-0 flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-list",
            hasHeader ? "py-1 pr-1" : "p-0",
          )}
        >
          {children}
        </div>

        {footer && (
          <DialogFooter className="mt-6 shrink-0 border-t border-border/50 pt-4">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
