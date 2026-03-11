export function scrollToThread(threadId: string) {
  const el = document.querySelector(
    `[data-thread-list-item-id="${threadId}"]`
  ) as HTMLElement | null

  if (!el) return

  el.scrollIntoView({
    behavior: "smooth",
    block: "center",
  })

  requestAnimationFrame(() => {
    (el as HTMLElement).focus()
  })
}