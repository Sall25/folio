import { useEffect, useState } from "react"

export function useAnimationFrame() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setOpen(true))

    return () => cancelAnimationFrame(raf)
  }, [])

  return { open }
}