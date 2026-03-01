export default function scrollIntoView(id: string, offset = 55) {
  requestAnimationFrame(() => {
    const el = document.getElementById(id)
    if (!el) return

    const y = el.getBoundingClientRect().top + window.scrollY - offset

    window.scrollTo({
      top: y,
      behavior: 'smooth',
    })
  });
}
