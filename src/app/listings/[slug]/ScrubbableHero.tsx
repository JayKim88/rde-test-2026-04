"use client"

import { useEffect, useRef, useState } from "react"

type Media = { src: string; kind: "photo" | "floorplan" }

export function ScrubbableHero({ media }: { media: Media[] }) {
  const [index, setIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Preload adjacent images so scrubbing never stalls.
  useEffect(() => {
    const neighbors = [index - 1, index + 1].filter((i) => i >= 0 && i < media.length)
    neighbors.forEach((i) => {
      const img = new Image()
      img.src = media[i].src
    })
  }, [index, media])

  // Keyboard navigation.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, media.length - 1))
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0))
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [media.length])

  // Drag scrubbing.
  const dragState = useRef<{ startX: number; startIndex: number } | null>(null)
  const onPointerDown = (e: React.PointerEvent) => {
    dragState.current = { startX: e.clientX, startIndex: index }
    containerRef.current?.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragState.current) return
    const width = containerRef.current?.offsetWidth ?? 600
    const delta = e.clientX - dragState.current.startX
    // Each width/media.length step = 1 image
    const stepsPerPx = media.length / width
    const step = Math.round(-delta * stepsPerPx)
    const next = Math.max(0, Math.min(media.length - 1, dragState.current.startIndex + step))
    setIndex(next)
  }
  const onPointerUp = () => {
    dragState.current = null
  }

  const current = media[index]

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative overflow-hidden rounded-2xl bg-gray-100 select-none cursor-grab active:cursor-grabbing aspect-[16/10]"
        role="region"
        aria-label="Listing media. Drag horizontally or use arrow keys to browse."
        tabIndex={0}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.src}
          alt={current.kind === "floorplan" ? "Floor plan" : `Photo ${index + 1}`}
          draggable={false}
          className="w-full h-full object-cover pointer-events-none"
        />
        <div className="absolute top-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
          {index + 1} / {media.length} · {current.kind === "floorplan" ? "Floor plan" : "Photo"}
        </div>

        {/* Left / right arrow buttons */}
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          aria-label="Previous"
          className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 shadow-md grid place-items-center transition hover:bg-white disabled:opacity-0 disabled:pointer-events-none"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setIndex((i) => Math.min(media.length - 1, i + 1))}
          disabled={index === media.length - 1}
          aria-label="Next"
          className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 shadow-md grid place-items-center transition hover:bg-white disabled:opacity-0 disabled:pointer-events-none"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {/* Thumb strip progress */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
          {media.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Go to media ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-8 bg-white" : "w-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-500 text-center">
        Drag horizontally or use ← / → arrow keys. Floor plan is the last item.
      </p>
    </div>
  )
}
