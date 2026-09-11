export interface GalleryDropTarget {
  card: HTMLElement | null;
  beforeRecordId: string | null;
}

export const columnKeyAtPoint = (
  grid: HTMLElement,
  x: number,
): string | null => {
  const marked = grid.querySelectorAll<HTMLElement>("[data-col-key]");
  let best: { key: string; dist: number } | null = null;
  for (const el of marked) {
    const r = el.getBoundingClientRect();
    if (x >= r.left && x <= r.right) return el.getAttribute("data-col-key");
    const cx = (r.left + r.right) / 2;
    const d = Math.abs(x - cx);
    const key = el.getAttribute("data-col-key");
    if (key && (!best || d < best.dist)) best = { key, dist: d };
  }
  return best?.key ?? null;
};

export const beforeCardAtPoint = (
  grid: HTMLElement,
  columnKey: string,
  y: number,
  skipId: string,
): string | null => {
  const cards = Array.from(
    grid.querySelectorAll<HTMLElement>(
      `[data-record-id][data-col-key="${columnKey}"]`,
    ),
  ).filter((c) => c.getAttribute("data-record-id") !== skipId);
  for (const c of cards) {
    const r = c.getBoundingClientRect();
    if (y < r.top + r.height / 2) return c.getAttribute("data-record-id");
  }
  return null;
};

export function beforeGalleryCardAtPoint(
  gallery: HTMLElement,
  clientX: number,
  clientY: number,
  skipId: string,
): string | null {
  const cards = Array.from(
    gallery.querySelectorAll<HTMLElement>(
      '[data-type="database-record"][data-record-id]',
    ),
  ).filter(
    (card) =>
      card.dataset.recordId !== skipId &&
      card.getClientRects().length > 0 &&
      getComputedStyle(card).display !== "none",
  );

  // CSS `order` means DOM order is not necessarily visual order.
  cards.sort((a, b) => {
    const ar = a.getBoundingClientRect();
    const br = b.getBoundingClientRect();

    if (Math.abs(ar.top - br.top) > 1) {
      return ar.top - br.top;
    }

    return ar.left - br.left;
  });

  for (const card of cards) {
    const rect = card.getBoundingClientRect();

    if (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    ) {
      const midpoint = rect.left + rect.width / 2;

      return clientX < midpoint
        ? (card.dataset.recordId ?? null)
        : getNextVisualCard(cards, card);
    }
  }

  return null;
}

export function beforeRecordAtPoint(
  container: HTMLElement,
  clientY: number,
  draggingId: string,
): string | null {
  const cards = Array.from(
    container.querySelectorAll<HTMLElement>("[data-record-id]"),
  ).filter((el) => el.dataset.recordId !== draggingId);

  for (const card of cards) {
    const rect = card.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;

    if (clientY < midpoint) {
      return card.dataset.recordId ?? null;
    }
  }

  return null;
}

function getNextVisualCard(
  cards: HTMLElement[],
  current: HTMLElement,
): string | null {
  const index = cards.indexOf(current);
  const next = cards[index + 1];

  return next?.dataset.recordId ?? null;
}

export function getGalleryDropIndicator(gallery: HTMLElement): HTMLElement {
  let indicator = gallery.querySelector<HTMLElement>(
    ".db-gallery-drop-indicator",
  );

  if (!indicator) {
    indicator = document.createElement("div");
    indicator.className = "db-gallery-drop-indicator";
    gallery.appendChild(indicator);
  }

  return indicator;
}

export function hideGalleryDropIndicator(gallery: HTMLElement): void {
  const indicator = gallery.querySelector<HTMLElement>(
    ".db-gallery-drop-indicator",
  );

  if (indicator) {
    indicator.style.display = "none";
  }
}

export function showGalleryDropIndicator(
  gallery: HTMLElement,
  card: HTMLElement,
): void {
  const indicator = getGalleryDropIndicator(gallery);

  const galleryRect = gallery.getBoundingClientRect();
  const cardRect = card.getBoundingClientRect();

  const x = cardRect.left - galleryRect.left - 6;

  indicator.style.height = `${cardRect.height}px`;
  indicator.style.transform = `translate3d(${x}px, ${
    cardRect.top - galleryRect.top
  }px, 0)`;

  indicator.style.display = "block";
}

export function getGalleryCards(
  gallery: HTMLElement,
  skipId: string,
): HTMLElement[] {
  return Array.from(
    gallery.querySelectorAll<HTMLElement>(
      '[data-type="database-record"][data-record-id]',
    ),
  )
    .filter(
      (card) =>
        card.dataset.recordId !== skipId &&
        card.getClientRects().length > 0 &&
        getComputedStyle(card).display !== "none",
    )
    .sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();

      if (Math.abs(ar.top - br.top) > 2) {
        return ar.top - br.top;
      }

      return ar.left - br.left;
    });
}
export function galleryDropTargetAtPoint(
  gallery: HTMLElement,
  clientX: number,
  clientY: number,
  skipId: string,
): GalleryDropTarget {
  const cards = getGalleryCards(gallery, skipId);

  if (cards.length === 0) {
    return {
      card: null,
      beforeRecordId: null,
    };
  }

  for (const card of cards) {
    const rect = card.getBoundingClientRect();

    if (clientY < rect.bottom && clientX < rect.right) {
      const midpoint = rect.left + rect.width / 2;

      if (clientX < midpoint) {
        return {
          card,
          beforeRecordId: card.dataset.recordId ?? null,
        };
      }
    }
  }

  // Dropped after all cards.
  return {
    card: null,
    beforeRecordId: null,
  };
}

export function showGalleryEndIndicator(gallery: HTMLElement): void {
  const indicator = getGalleryDropIndicator(gallery);

  const cards = Array.from(
    gallery.querySelectorAll<HTMLElement>(
      '[data-type="database-record"][data-record-id]',
    ),
  );

  if (cards.length === 0) {
    hideGalleryDropIndicator(gallery);
    return;
  }

  // CSS `order` controls the visual order, so DOM order
  // cannot be trusted.
  cards.sort((a, b) => {
    const aRect = a.getBoundingClientRect();
    const bRect = b.getBoundingClientRect();

    if (Math.abs(aRect.top - bRect.top) > 1) {
      return aRect.top - bRect.top;
    }

    return aRect.left - bRect.left;
  });

  const lastCard = cards[cards.length - 1];

  const galleryRect = gallery.getBoundingClientRect();
  const cardRect = lastCard.getBoundingClientRect();

  const x = cardRect.right - galleryRect.left + 6;
  const y = cardRect.top - galleryRect.top;

  indicator.style.height = `${cardRect.height}px`;
  indicator.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  indicator.style.display = "block";
}
