"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

interface Slide {
  id: number;
  image: string;
  title: string;
  subtitle: string;
}

const slides: Slide[] = [
  {
    id: 1,
    image: "https://picsum.photos/1200/500?1",
    title: "Big Sale",
    subtitle: "Up to 50% off",
  },
  {
    id: 2,
    image: "https://picsum.photos/1200/500?2",
    title: "New Arrivals",
    subtitle: "Latest trends",
  },
  {
    id: 3,
    image: "https://picsum.photos/1200/500?3",
    title: "Exclusive Deals",
    subtitle: "Only for you",
  },
];

export default function StoreCarousel() {
  const [current, setCurrent] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const nextSlide = useCallback((): void => {
    setCurrent((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  }, []);

  const prevSlide = (): void => {
    setCurrent((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [nextSlide, isPaused]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        className="flex transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className="min-w-full relative aspect-video md:h-[450px]"
          >
            <Image
              src={slide.image}
              alt={slide.title}
              fill
              className="object-cover"
              priority={index === 0}
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-8 md:p-16 text-white">
              <h2 className="text-3xl md:text-5xl font-extrabold mb-2">
                {slide.title}
              </h2>
              <p className="text-lg md:text-xl opacity-90">{slide.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={prevSlide}
        aria-label="Previous slide"
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-md text-white w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/40"
      >
        <span className="text-2xl">‹</span>
      </button>

      <button
        onClick={nextSlide}
        aria-label="Next slide"
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-md text-white w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/40"
      >
        <span className="text-2xl">›</span>
      </button>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrent(index)}
            aria-label={`Go to slide ${index + 1}`}
            className={`transition-all duration-300 rounded-full ${
              index === current ? "bg-white w-8 h-2" : "bg-white/40 w-2 h-2"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
