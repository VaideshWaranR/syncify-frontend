"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Play, Pause, Trash2, GripVertical } from "lucide-react"
import { gsap } from "gsap"
import { useSocket } from "../Context/SocketContext"

export default function YouTubePlayerQueue() {
  const [queue, setQueue] = useState<{ id: string; title: string }[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [showVideo, setShowVideo] = useState(false)
  const [link, setLink] = useState("")
  const [isPlaying, setIsPlaying] = useState(false)
  const playerRef = useRef<any>(null)
  const socket = useSocket()

  // track last loaded video id to avoid unnecessary reloads
  const lastLoadedId = useRef<string | null>(null)

  // drag state
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)

  // progress + volume state
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(100)

  // load YouTube API once
  useEffect(() => {
    if (window.YT && window.YT.Player) return
    const tag = document.createElement("script")
    tag.src = "https://www.youtube.com/iframe_api"
    document.body.appendChild(tag)
  }, [])

  // update progress every second
  useEffect(() => {
    let interval: any
    if (playerRef.current) {
      interval = setInterval(() => {
        if (playerRef.current?.getDuration) {
          const dur = playerRef.current.getDuration()
          const cur = playerRef.current.getCurrentTime()
          setDuration(dur)
          setCurrentTime(cur)
          setProgress(dur ? (cur / dur) * 100 : 0)
        }
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [playerRef.current])

  const formatTime = (s: number) => {
    if (!s) return "0:00"
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
      .toString()
      .padStart(2, "0")
    return `${m}:${sec}`
  }

  // socket listeners
  useEffect(() => {
    socket.on("update_queue", (data) => {
      if (!data) return
      setQueue(data)
      setIsPlaying(true)
      setCurrentIndex((ci) => (data.length === 0 ? -1 : Math.max(0, ci)))
    })
    socket.on("add_queue", (data) => {
      const { id, title } = data
      addToQueueSocket(id, title)
    })
    socket.on("pause_song", () => {
      playerRef.current?.pauseVideo()
      setIsPlaying(false)
    })
    socket.on("play_song", () => {
      playerRef.current?.playVideo()
      setIsPlaying(true)
    })
    socket.on("next_song", () => {
      setQueue((prev) => {
        if (prev.length === 0) return prev // nothing to do

        const next = prev.filter((_, i) => i !== currentIndex)

        if (next.length === 0) {
          // ✅ nothing left: clear state + stop video
          setCurrentIndex(-1)
          setIsPlaying(false)
          lastLoadedId.current = null

          playerRef.current?.stopVideo()

          return []
        }

        // ✅ still songs left
        const newIndex = Math.min(currentIndex, next.length - 1)
        setCurrentIndex(newIndex)
        setIsPlaying(true)

        const nextVideo = next[newIndex]
        if (nextVideo) {
          playerRef.current?.loadVideoById(nextVideo.id)
          lastLoadedId.current = nextVideo.id
        }

        return next
      })
      console.log("Next song event received")
    })
    socket.on("provide_sync", ({ requester }) => {
      socket.emit("sync_from_host", {
        requester,
        currentTime: playerRef.current?.getCurrentTime() || 0,
      })
    })
    socket.on("sync_player", ({ currentTime }) => {
      if (playerRef.current && typeof playerRef.current.seekTo === "function") {
        const diff = Math.abs((playerRef.current.getCurrentTime?.() || 0) - currentTime)
        if (diff > 1) {
          playerRef.current.seekTo(currentTime, true)
          setCurrentTime(currentTime)
          console.log("Synced to", currentTime)
        }
      } else {
        console.warn("YT player not ready yet, delaying sync...")
        setTimeout(() => {
          if (playerRef.current?.seekTo) {
            playerRef.current.seekTo(currentTime, true)
            setCurrentTime(currentTime)
            console.log("Delayed sync done")
          }
        }, 1000)
      }
    })

    return () => {
      socket.off("update_queue")
      socket.off("add_queue")
      socket.off("pause_song")
      socket.off("play_song")
      socket.off("next_song")
      socket.off("provide_sync")
      socket.off("sync_player")
    }
  }, [socket, currentIndex])

  const addToQueueSocket = async (id: string, title: string) => {
    setQueue((prev) => {
      const next = [...prev, { id, title }]
      if (currentIndex === -1) setCurrentIndex(0)
      return next
    })
  }

  // extract YouTube ID
  const extractId = useCallback((url: string) => {
    try {
      const u = new URL(url)
      if (u.hostname.includes("youtu.be")) return u.pathname.slice(1)
      return u.searchParams.get("v")
    } catch {
      return url
    }
  }, [])

  // fetch title
  const fetchTitle = useCallback(async (id: string) => {
    try {
      const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${id}`)
      const data = await res.json()
      return data.title || id
    } catch {
      return id
    }
  }, [])

  // add video
  const addToQueue = useCallback(async () => {
    const id = extractId(link)
    if (!id) return
    const title = await fetchTitle(id)
    socket.emit("add", { id, title })
    setLink("")
  }, [link, extractId, fetchTitle, socket])

  // initialize player when currentIndex changes
  useEffect(() => {
    if (currentIndex < 0 || currentIndex >= queue.length) return
    const videoId = queue[currentIndex].id

    function createOrLoad() {
      if (!playerRef.current) {
        const playerElement = document.getElementById("yt-player")
        if (!playerElement) return

        playerRef.current = new window.YT.Player("yt-player", {
          height: "315",
          width: "100%",
          videoId,
          playerVars: {
            autoplay: 1,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (e: any) => {
              lastLoadedId.current = videoId
              e.target.playVideo()
              e.target.setVolume(volume)
            },
            onStateChange: (e: any) => {
              if (e.data === window.YT.PlayerState.ENDED) {
                handleNext()
              } else if (e.data === window.YT.PlayerState.PLAYING) {
                setIsPlaying(true)
              } else if (e.data === window.YT.PlayerState.PAUSED) {
                setIsPlaying(false)
              }
            },
          },
        })
      } else if (playerRef.current && lastLoadedId.current !== videoId) {
        playerRef.current.loadVideoById(videoId)
        lastLoadedId.current = videoId
      }
    }

    if (window.YT && window.YT.Player) {
      createOrLoad()
    } else {
      ;(window as any).onYouTubeIframeAPIReady = createOrLoad
    }
  }, [currentIndex, queue, volume])

  // playback controls
  const handlePlay = useCallback(() => {
    if (currentIndex === -1 && queue.length > 0) {
      setCurrentIndex(0)
      return
    }
    socket.emit("play")
  }, [currentIndex, queue.length])

  const handlePause = useCallback(() => {
    socket.emit("pause")
  }, [])

  const handleNext = useCallback(() => {
    console.log("Inside the handleNext function")
    socket.emit("next")
  }, [currentIndex])

  // remove from queue
  const removeAt = useCallback(
    (idx: number) => {
      setQueue((prev) => {
        const next = prev.filter((_, i) => i !== idx)
        if (idx === currentIndex) {
          const newIndex = next.length === 0 ? -1 : Math.min(idx, next.length - 1)
          setCurrentIndex(newIndex)
          setIsPlaying(newIndex !== -1)
          if (newIndex !== -1) {
            playerRef.current?.loadVideoById(next[newIndex].id)
            lastLoadedId.current = next[newIndex].id
          } else {
            lastLoadedId.current = null
          }
        } else if (idx < currentIndex) {
          setCurrentIndex((ci) => Math.max(0, ci - 1))
        }
        return next
      })
    },
    [currentIndex],
  )

  // drag handlers
  const onDragStart = (idx: number) => {
    dragItem.current = idx
  }
  const onDragEnter = (idx: number) => {
    dragOverItem.current = idx
  }
  const onDragEnd = () => {
    const from = dragItem.current
    const to = dragOverItem.current
    if (from === null || to === null || from === to) {
      dragItem.current = null
      dragOverItem.current = null
      return
    }
    const updated = [...queue]
    const [moved] = updated.splice(from, 1)
    updated.splice(to, 0, moved)

    setQueue(updated)
    setTimeout(() => {
      gsap.fromTo(".queue-item", { y: 10, opacity: 0.8 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.05 })
    }, 0)

    setCurrentIndex((ci) => {
      if (ci === null || ci === -1) return ci
      if (from < ci && to >= ci) {
        return ci - 1
      } else if (from > ci && to <= ci) {
        return ci + 1
      } else if (from === ci) {
        return to
      } else {
        return ci
      }
    })

    dragItem.current = null
    dragOverItem.current = null
  }

  return (
    <Card className="w-full max-w-2xl mx-auto mt-6 shadow-lg rounded-2xl border border-gray-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-2xl font-bold tracking-tight text-primary">YouTube Player Queue</CardTitle>
      </CardHeader>

      <CardContent>
        {/* input */}
        <div className="flex gap-2 mb-6">
          <Input
            placeholder="Enter YouTube link or ID"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addToQueue()}
            className="flex-1"
          />
          <Button onClick={addToQueue} className="shrink-0">
            Add
          </Button>
        </div>

        {/* controls */}
        <div className="mb-4">
          <span className="font-medium text-lg block mb-2">
            Now Playing: {currentIndex >= 0 && queue[currentIndex] ? queue[currentIndex].title : "—"}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowVideo((s) => !s)}>
              {showVideo ? "Hide Video" : "Show Video"}
            </Button>
            <Button onClick={handlePlay} aria-label="Play" size="icon" variant="secondary">
              <Play className="h-4 w-4" />
            </Button>
            <Button onClick={handlePause} aria-label="Pause" size="icon" variant="secondary">
              <Pause className="h-4 w-4" />
            </Button>
            <Button onClick={handleNext} variant="default">
              Next ▶
            </Button>
          </div>

          {/* progress + volume */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={duration || 0}
              value={currentTime}
              onChange={(e) => {
                const newTime = Number(e.target.value)
                playerRef.current?.seekTo(newTime, true)
                socket.emit("sync_all", { currentTime: newTime })
                setCurrentTime(newTime)
              }}
              className="w-full accent-primary"
            />
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs">🔊</span>
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => {
                const vol = Number(e.target.value)
                setVolume(vol)
                playerRef.current?.setVolume(vol)
              }}
              className="w-32 accent-primary"
            />
          </div>
        </div>

        {/* player */}
        <div className="relative w-full rounded-xl overflow-hidden bg-black/5">
          <div
            className={`transition-all duration-300 ${
              showVideo
                ? "w-full aspect-video opacity-100 relative"
                : "absolute -top-[1000px] -left-[1000px] w-full aspect-video opacity-0 pointer-events-none"
            }`}
          >
            <div id="yt-player" className="w-full h-full" />
          </div>

          {!showVideo && (
            <div className="w-full h-16 flex items-center justify-center bg-black/10 rounded-xl">
              <div className="text-sm text-muted-foreground">
                {currentIndex >= 0 ? "Playing in background..." : "No video selected"}
              </div>
            </div>
          )}
        </div>

        {/* queue */}
        <div className="mt-6">
          <h3 className="font-semibold mb-3 text-lg">Queue</h3>
          <div className="space-y-3">
            {queue.map((video, idx) => (
              <div
                key={video.id}
                draggable={idx !== currentIndex}
                onDragStart={() => idx !== currentIndex && onDragStart(idx)}
                onDragEnter={() => idx !== currentIndex && onDragEnter(idx)}
                onDragEnd={onDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className={`queue-item p-4 rounded-xl border shadow-sm bg-card flex items-center justify-between hover:shadow-md transition ${
                  idx === currentIndex ? "cursor-not-allowed ring-2 ring-primary/40 bg-primary/5" : "cursor-move"
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{video.title}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => idx !== currentIndex && setCurrentIndex(idx)}>
                    Play
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => removeAt(idx)}>
                    <Trash2 className="h-4 w-4 mr-1" /> Remove
                  </Button>
                </div>
              </div>
            ))}
            {queue.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm border rounded-xl mt-2">
                No videos in queue. Add one above to get started!
              </div>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="text-xs text-muted-foreground flex items-center gap-2">
        <GripVertical className="h-3 w-3" /> Drag items to reorder the queue. Current song stays highlighted.
      </CardFooter>
    </Card>
  )
}
