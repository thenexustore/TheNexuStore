"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  getActiveBanners,
  transformBannerToCarouselConfig,
} from "@/app/lib/banners";

const carouselConfig = {
  autoplay: true,
  delay: 5000,
  navigation: {
    arrows: {
      show: true,
      bg: "rgba(255,255,255,0.25)",
      hoverBg: "rgba(255,255,255,0.45)",
      color: "#ffffff",
      size: "44px",
      radius: "9999px",
      blur: "8px",
      shadow: "0 10px 30px rgba(0,0,0,.3)",
    },
    dots: {
      show: true,
      activeColor: "#ffffff",
      inactiveColor: "rgba(255,255,255,0.4)",
      activeWidth: "28px",
      inactiveWidth: "8px",
      height: "8px",
      radius: "9999px",
    },
  },
};

const FALLBACK_SLIDE: Slide = {
  id: "fallback",
  image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1999&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  overlay: "linear-gradient(to top, rgba(0,0,0,.7), transparent)",
  content: {
    align: "center",
    gap: "12px",
    padding: "40px",
    title: {
      text: "Welcome to Our Store",
      color: "#ffffff",
      size: "48px",
      weight: "800",
      family: "Poppins, sans-serif",
      letterSpacing: "1px",
      lineHeight: "1.1",
      transform: "uppercase",
      shadow: "0 6px 20px rgba(0,0,0,.4)",
    },
    subtitle: {
      text: "Discover amazing products at unbeatable prices",
      color: "#e5e5e5",
      size: "20px",
      family: "Poppins, sans-serif",
      letterSpacing: "0.5px",
      lineHeight: "1.4",
      opacity: 0.9,
    },
    button: {
      show: true,
      text: "Shop Now",
      link: "/shop",
      bg: "#ffffff",
      hoverBg: "#beb5b5",
      color: "#000000",
      radius: "9999px",
      padding: "14px 36px",
      fontSize: "16px",
      fontWeight: "600",
      fontFamily: "Poppins, sans-serif",
      letterSpacing: "0.5px",
      shadow: "0 10px 30px rgba(0,0,0,.4)",
      border: "none",
    },
  },
};

interface Slide {
  id: string | number;
  image: string;
  overlay: string;
  content: {
    align: "left" | "right" | "center";
    gap: string;
    padding: string;
    title: {
      text: string;
      color: string;
      size: string;
      weight: string;
      family: string;
      letterSpacing: string;
      lineHeight: string;
      transform: string;
      shadow: string;
    };
    subtitle: {
      text: string;
      color: string;
      size: string;
      family: string;
      letterSpacing: string;
      lineHeight: string;
      opacity: number;
    };
    button: {
      show: boolean;
      text: string;
      link: string;
      bg: string;
      hoverBg: string;
      color: string;
      radius: string;
      padding: string;
      fontSize: string;
      fontWeight: string;
      fontFamily: string;
      letterSpacing: string;
      shadow: string;
      border: string;
    };
  };
}

export default function StoreCarousel() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nav = carouselConfig.navigation;

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      setError(null);
      setLoading(true);

      const banners = await getActiveBanners();

      if (banners.length === 0) {
        setSlides([]);
        return;
      }

      const transformedSlides = banners.map(transformBannerToCarouselConfig);

      // For infinite scroll effect, duplicate the first slide if we have banners
      const slidesForCarousel =
        transformedSlides.length > 0
          ? [...transformedSlides, transformedSlides[0]]
          : [];

      setSlides(slidesForCarousel);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load banners");
      console.error("Error fetching banners:", err);
      setSlides([]);
    } finally {
      setLoading(false);
    }
  };

  const realSlides = slides.length > 0 ? slides.slice(0, -1) : [];

  const next = useCallback(() => {
    if (slides.length === 0) return;
    setCurrent((p) => p + 1);
  }, [slides.length]);

  const prev = () => {
    if (slides.length === 0) return;

    if (current === 0) {
      const track = document.getElementById("carousel-track");
      if (track) track.style.transition = "none";
      setCurrent(realSlides.length - 1);
      requestAnimationFrame(() => {
        if (track) track.style.transition = "transform 0.7s ease";
      });
    } else {
      setCurrent((p) => p - 1);
    }
  };

  useEffect(() => {
    if (slides.length === 0) return;

    if (current === realSlides.length) {
      setTimeout(() => {
        const track = document.getElementById("carousel-track");
        if (track) track.style.transition = "none";
        setCurrent(0);
        requestAnimationFrame(() => {
          if (track) track.style.transition = "transform 0.7s ease";
        });
      }, 700);
    }
  }, [current, realSlides.length, slides.length]);

  useEffect(() => {
    if (!carouselConfig.autoplay || paused || slides.length === 0) return;
    const i = setInterval(next, carouselConfig.delay);
    return () => clearInterval(i);
  }, [next, paused, slides.length]);

  if (loading) {
    return (
      <div className="relative w-full overflow-hidden rounded-xl h-[450px] bg-gray-200 animate-pulse">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-gray-500">Loading banners...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative w-full overflow-hidden rounded-xl h-[450px] bg-gray-100">
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
          <div className="text-red-600 mb-2">Failed to load banners</div>
          <button
            onClick={fetchBanners}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="relative w-full overflow-hidden rounded-xl h-[450px]">
        <Image
          src={FALLBACK_SLIDE.image}
          alt="Store banner"
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        <div
          className="absolute inset-0 flex flex-col justify-end items-center text-center"
          style={{
            background: FALLBACK_SLIDE.overlay,
            padding: FALLBACK_SLIDE.content.padding,
            gap: FALLBACK_SLIDE.content.gap,
          }}
        >
          <h2
            style={{
              color: FALLBACK_SLIDE.content.title.color,
              fontSize: FALLBACK_SLIDE.content.title.size,
              fontWeight: FALLBACK_SLIDE.content.title.weight,
              fontFamily: FALLBACK_SLIDE.content.title.family,
              letterSpacing: FALLBACK_SLIDE.content.title.letterSpacing,
              lineHeight: FALLBACK_SLIDE.content.title.lineHeight,
              textTransform: FALLBACK_SLIDE.content.title.transform,
              textShadow: FALLBACK_SLIDE.content.title.shadow,
            }}
          >
            {FALLBACK_SLIDE.content.title.text}
          </h2>
          <p
            style={{
              color: FALLBACK_SLIDE.content.subtitle.color,
              fontSize: FALLBACK_SLIDE.content.subtitle.size,
              fontFamily: FALLBACK_SLIDE.content.subtitle.family,
              letterSpacing: FALLBACK_SLIDE.content.subtitle.letterSpacing,
              lineHeight: FALLBACK_SLIDE.content.subtitle.lineHeight,
              opacity: FALLBACK_SLIDE.content.subtitle.opacity,
            }}
          >
            {FALLBACK_SLIDE.content.subtitle.text}
          </p>
          <a
            href={FALLBACK_SLIDE.content.button.link}
            style={{
              background: FALLBACK_SLIDE.content.button.bg,
              color: FALLBACK_SLIDE.content.button.color,
              borderRadius: FALLBACK_SLIDE.content.button.radius,
              padding: FALLBACK_SLIDE.content.button.padding,
              fontSize: FALLBACK_SLIDE.content.button.fontSize,
              fontWeight: FALLBACK_SLIDE.content.button.fontWeight,
              fontFamily: FALLBACK_SLIDE.content.button.fontFamily,
              letterSpacing: FALLBACK_SLIDE.content.button.letterSpacing,
              boxShadow: FALLBACK_SLIDE.content.button.shadow,
              border: FALLBACK_SLIDE.content.button.border,
              display: "inline-block",
            }}
          >
            {FALLBACK_SLIDE.content.button.text}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        id="carousel-track"
        className="flex transition-transform duration-700"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {slides.map((slide, i) => (
          <div
            key={`${slide.id}-${i}`}
            className="min-w-full relative h-[450px]"
          >
            <Image
              src={slide.image}
              alt={slide.content.title.text}
              fill
              className="object-cover"
              sizes="100vw"
              priority={i === 0}
            />
            <div
              className="absolute inset-0 flex flex-col justify-end"
              style={{
                background: slide.overlay,
                alignItems:
                  slide.content.align === "left"
                    ? "flex-start"
                    : slide.content.align === "right"
                    ? "flex-end"
                    : "center",
                textAlign: slide.content.align as "left" | "right" | "center",
                padding: slide.content.padding,
                gap: slide.content.gap,
              }}
            >
              <h2
                style={{
                  color: slide.content.title.color,
                  fontSize: slide.content.title.size,
                  fontWeight: slide.content.title.weight,
                  fontFamily: slide.content.title.family,
                  letterSpacing: slide.content.title.letterSpacing,
                  lineHeight: slide.content.title.lineHeight,
                  textTransform: slide.content.title.transform,
                  textShadow: slide.content.title.shadow,
                }}
              >
                {slide.content.title.text}
              </h2>
              <p
                style={{
                  color: slide.content.subtitle.color,
                  fontSize: slide.content.subtitle.size,
                  fontFamily: slide.content.subtitle.family,
                  letterSpacing: slide.content.subtitle.letterSpacing,
                  lineHeight: slide.content.subtitle.lineHeight,
                  opacity: slide.content.subtitle.opacity,
                }}
              >
                {slide.content.subtitle.text}
              </p>
              {slide.content.button.show && (
                <a
                  href={slide.content.button.link}
                  style={{
                    background: slide.content.button.bg,
                    color: slide.content.button.color,
                    borderRadius: slide.content.button.radius,
                    padding: slide.content.button.padding,
                    fontSize: slide.content.button.fontSize,
                    fontWeight: slide.content.button.fontWeight,
                    fontFamily: slide.content.button.fontFamily,
                    letterSpacing: slide.content.button.letterSpacing,
                    boxShadow: slide.content.button.shadow,
                    border: slide.content.button.border,
                    display: "inline-block",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      slide.content.button.hoverBg)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = slide.content.button.bg)
                  }
                >
                  {slide.content.button.text}
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {nav.arrows.show && slides.length > 1 && (
        <>
          <button
            onClick={prev}
            style={{
              background: nav.arrows.bg,
              color: nav.arrows.color,
              width: nav.arrows.size,
              height: nav.arrows.size,
              borderRadius: nav.arrows.radius,
              backdropFilter: `blur(${nav.arrows.blur})`,
              boxShadow: nav.arrows.shadow,
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 hover:opacity-90 transition-opacity"
            aria-label="Previous slide"
          >
            ‹
          </button>
          <button
            onClick={next}
            style={{
              background: nav.arrows.bg,
              color: nav.arrows.color,
              width: nav.arrows.size,
              height: nav.arrows.size,
              borderRadius: nav.arrows.radius,
              backdropFilter: `blur(${nav.arrows.blur})`,
              boxShadow: nav.arrows.shadow,
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 hover:opacity-90 transition-opacity"
            aria-label="Next slide"
          >
            ›
          </button>
        </>
      )}

      {nav.dots.show && realSlides.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-3">
          {realSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              style={{
                background:
                  i === current ? nav.dots.activeColor : nav.dots.inactiveColor,
                width:
                  i === current ? nav.dots.activeWidth : nav.dots.inactiveWidth,
                height: nav.dots.height,
                borderRadius: nav.dots.radius,
              }}
              className="transition-all duration-300 hover:opacity-80"
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
