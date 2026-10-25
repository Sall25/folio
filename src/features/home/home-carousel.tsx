import {
  Children,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight } from "src/components/icons";
import { useTranslation } from "react-i18next";
import { Button } from "src/components/tiptap-ui-primitive/button";

// A horizontal row of cards: scrolls sideways and fades
// out (the "fog") at an edge that has more to show. On that edge, a bare
// chevron sits ON TOP of the fog and the cards: the whole fog strip is the
// button, layered above the cards, so clicking it scrolls and never opens a
// card. Desktop only — touch screens swipe. Each child gets the same width
// (`cardWidth`, capped on narrow screens).
//
// `fit` (e.g. 6): the row is laid out for that many cards. 3 up to `fit`
// cards stretch to fill the width; more than `fit` show `fit` at a time and
// scroll; 1 or 2 keep the width of one of `fit` cards. `cardWidth` is then
// the narrowest a card may get (small screens scroll instead).
export function HomeCarousel({
  children,
  title,
  label,
  cardWidth,
  fit,
  style,
}: {
  children: ReactNode;
  /** The row's heading (left side of the header). */
  title: ReactNode;
  /** Accessible name of the row (e.g. "Recently visited"). */
  label: string;
  cardWidth: number;
  fit?: number;
  style?: CSSProperties;
}) {
  const { t } = useTranslation();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  // Which edges still have content beyond them (1px slack for rounding).
  const measure = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const left = el.scrollLeft > 1;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setEdges((prev) =>
      prev.left === left && prev.right === right ? prev : { left, right },
    );
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", measure, { passive: true });
    // Fires once on observe, then on every size change (sidebar, window).
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, [measure]);

  const scrollBy = (dir: -1 | 1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  const count = Children.count(children);
  const fitClass = fit
    ? ` home-carousel--fit${count >= 3 && count <= fit ? " is-filled" : ""}`
    : "";

  return (
    <section
      className={`home-carousel${fitClass}`}
      aria-label={label}
      style={{
        ...style,
        ["--home-card-w" as string]: `${cardWidth}px`,
        ...(fit ? { ["--home-fit" as string]: fit } : null),
      }}
    >
      <div className="home-carousel__header">{title}</div>

      <div className="home-carousel__viewport">
        <div ref={trackRef} className="home-carousel__track">
          {Children.map(children, (child) => (
            <div className="home-carousel__item">{child}</div>
          ))}
        </div>
        {edges.left && (
          <>
            <div className="home-carousel__fog home-carousel__fog--left" />
            <button
              type="button"
              className="home-carousel__arrow home-carousel__arrow--left"
              aria-label={t("home.scrollLeft", "Scroll left")}
              onClick={() => scrollBy(-1)}
            >
              <ChevronLeft size={fit ? 17 : 22} strokeWidth={fit ? 2 : 2.2} />
            </button>
          </>
        )}
        {edges.right && (
          <>
            <div className="home-carousel__fog home-carousel__fog--right" />
            <Button
              type="button"
              className="home-carousel__arrow home-carousel__arrow--right"
              aria-label={t("home.scrollRight", "Scroll right")}
              onClick={() => scrollBy(1)}
            >
              <ChevronRight size={fit ? 17 : 22} strokeWidth={fit ? 2 : 2.2} />
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
