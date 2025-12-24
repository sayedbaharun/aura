import * as React from "react"

/**
 * VisuallyHidden component hides content visually while keeping it accessible
 * to screen readers. This is useful for dialog titles that should be announced
 * to screen readers but not displayed visually.
 *
 * Based on the CSS approach recommended by Radix UI:
 * https://radix-ui.com/primitives/docs/components/dialog#title
 */
const VisuallyHidden = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ children, ...props }, ref) => (
  <span
    ref={ref}
    style={{
      position: "absolute",
      border: 0,
      width: 1,
      height: 1,
      padding: 0,
      margin: -1,
      overflow: "hidden",
      clip: "rect(0, 0, 0, 0)",
      whiteSpace: "nowrap",
      wordWrap: "normal",
    }}
    {...props}
  >
    {children}
  </span>
))
VisuallyHidden.displayName = "VisuallyHidden"

export { VisuallyHidden }
