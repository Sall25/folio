export function scrollToComment(commentId: string) {
  const el = document.querySelector(
    `[data-comment-id="${commentId}"]`
  ) as HTMLElement | null

  if (!el) return

  el.scrollIntoView({
    behavior: "smooth",
    block: "center",
  })

  el.classList.add("comment-flash")

  setTimeout(() => {
    el.classList.remove("comment-flash")
  }, 1500)
}