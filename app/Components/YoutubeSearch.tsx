"use client"

import { useState } from "react"
import { Search, Plus, Check, Play, Clock, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Socket } from "socket.io-client"
import { useSocket } from "../Context/SocketContext"

interface YouTubeVideo {
  id: string
  title: string
  channelTitle: string
  thumbnailUrl: string
  publishedAt: string
  viewCount?: string
  description: string
}

export default function YouTubeSearch() {
  const [searchQuery, setSearchQuery] = useState("")
  const [videos, setVideos] = useState<YouTubeVideo[]>([])
  const [loading, setLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const socket=useSocket();
  const [copied,setCopied]=useState(false)
  // Mock data for demonstration - used as fallback when API is not available
  const mockVideos: YouTubeVideo[] = [
    {
      id: "dQw4w9WgXcQ",
      title: "Rick Astley - Never Gonna Give You Up (Official Video)",
      channelTitle: "Rick Astley",
      thumbnailUrl: "/rick-astley-never-gonna-give-you-up-music-video-th.jpg",
      publishedAt: "2009-10-25",
      viewCount: "1.4B",
      description: 'The official video for "Never Gonna Give You Up" by Rick Astley',
    },
    {
      id: "kJQP7kiw5Fk",
      title: "Luis Fonsi - Despacito ft. Daddy Yankee",
      channelTitle: "Luis Fonsi",
      thumbnailUrl: "/despacito-music-video-thumbnail-tropical-beach.jpg",
      publishedAt: "2017-01-12",
      viewCount: "8.2B",
      description: "Official music video for Despacito by Luis Fonsi featuring Daddy Yankee",
    },
    {
      id: "fJ9rUzIMcZQ",
      title: "Queen - Bohemian Rhapsody (Official Video)",
      channelTitle: "Queen Official",
      thumbnailUrl: "/queen-bohemian-rhapsody-official-music-video-thumb.jpg",
      publishedAt: "2008-08-01",
      viewCount: "1.9B",
      description: "The official video for Queen - Bohemian Rhapsody",
    },
    {
      id: "YQHsXMglC9A",
      title: "Adele - Hello (Official Music Video)",
      channelTitle: "Adele",
      thumbnailUrl: "/adele-hello-official-music-video-thumbnail.jpg",
      publishedAt: "2015-10-22",
      viewCount: "3.2B",
      description: "The official music video for Adele - Hello",
    },
    {
      id: "JGwWNGJdvx8",
      title: "Ed Sheeran - Shape of You (Official Video)",
      channelTitle: "Ed Sheeran",
      thumbnailUrl: "/ed-sheeran-shape-of-you-music-video-thumbnail.jpg",
      publishedAt: "2017-01-30",
      viewCount: "5.9B",
      description: "The official music video for Ed Sheeran - Shape of You",
    },
    {
      id: "RgKAFK5djSk",
      title: "Wiz Khalifa - See You Again ft. Charlie Puth",
      channelTitle: "Wiz Khalifa",
      thumbnailUrl: "/wiz-khalifa-see-you-again-music-video-thumbnail.jpg",
      publishedAt: "2015-04-06",
      viewCount: "5.9B",
      description: "Official music video for See You Again by Wiz Khalifa featuring Charlie Puth",
    },
  ]

  const searchVideos = async () => {
    if (!searchQuery.trim()) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/youtube?q=${encodeURIComponent(searchQuery)}&maxResults=12`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to search videos")
      }

      setVideos(data.videos || [])
    } catch (err) {
      console.error("Search error:", err)
      setError(err instanceof Error ? err.message : "Failed to search videos")

      const filteredVideos = mockVideos.filter(
        (video) =>
          video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          video.channelTitle.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      setVideos(filteredVideos.length > 0 ? filteredVideos : mockVideos)
    } finally {
      setLoading(false)
    }
  }
  const handleAddVideo = (id:string,title:string) => {
    if(!socket) return false
  socket.emit("add_from_search",{id,title});
  return true;
  }
  
  const copyVideoSlug = async (videoId: string) => {
    try {
      await navigator.clipboard.writeText(videoId)
      setCopiedId(videoId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error("Failed to copy video slug:", err)
    }
  }

  const formatViewCount = (count: string) => {
    return `${count} views`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <header className="border-b border-border/40 bg-card/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Play className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                YouTube Search
              </h1>
            </div>
            <div className="flex-1 max-w-2xl">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5 group-focus-within:text-primary transition-colors" />
                <Input
                  type="text"
                  placeholder="Search for videos, channels, or topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && searchVideos()}
                  className="pl-12 pr-4 py-3 bg-background/50 border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-base"
                />
              </div>
            </div>
            <Button
              onClick={searchVideos}
              disabled={loading}
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-200 px-8"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground mr-2" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>
          {error && (
            <div className="mt-4 p-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
              <div className="h-2 w-2 bg-amber-500 rounded-full" />
              {error}
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-6 py-10">
        {videos.length === 0 && !loading && (
          <div className="text-center py-20">
            <div className="p-6 bg-muted/30 rounded-full w-fit mx-auto mb-6">
              <Search className="h-16 w-16 text-muted-foreground/60" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">Search Results</h2>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              Enter a search term to find videos, music, tutorials, and more from YouTube
            </p>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="bg-card/50 border-border/50 animate-pulse overflow-hidden">
                <div className="aspect-video bg-muted/50 rounded-t-lg"></div>
                <CardContent className="p-5">
                  <div className="h-5 bg-muted/50 rounded mb-3"></div>
                  <div className="h-4 bg-muted/50 rounded w-2/3 mb-2"></div>
                  <div className="h-3 bg-muted/50 rounded w-1/2 mb-4"></div>
                  <div className="h-9 bg-muted/50 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {videos.length > 0 && !loading && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  {searchQuery ? `Results for "${searchQuery}"` : "Search Results"}
                </h2>
                <p className="text-foreground/70">
                  {searchQuery ? "Found the best matches for your search" : "Enter a search term to find videos"}
                </p>
              </div>
              <Badge
                variant="secondary"
                className="bg-secondary text-secondary-foreground border-border px-4 py-2 text-sm font-medium"
              >
                {videos.length} videos
              </Badge>
            </div>

            <Separator className="bg-border/50" />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {videos.map((video) => (
                <Card
                  key={video.id}
                  className="bg-card border-border hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 group overflow-hidden backdrop-blur-sm"
                >
                  <div className="relative aspect-video overflow-hidden">
                    <img
                      src={video.thumbnailUrl || "/placeholder.svg"}
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="p-2 bg-black/50 rounded-full backdrop-blur-sm">
                        <Play className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-5 space-y-4">
                    <div>
                      <h3 className="font-semibold text-foreground line-clamp-2 mb-2 text-balance leading-tight group-hover:text-primary transition-colors duration-200">
                        {video.title}
                      </h3>
                      <p className="text-sm font-medium text-foreground/80 mb-3">{video.channelTitle}</p>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-foreground/60">
                      {video.viewCount && (
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          <span>{formatViewCount(video.viewCount)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(video.publishedAt)}</span>
                      </div>
                    </div>

                    <p className="text-sm text-foreground/70 line-clamp-2 leading-relaxed">{video.description}</p>

                    <Button
                      // onClick={() => copyVideoSlug(video.id)}
                      onClick={()=>handleAddVideo(video.id,video.title)}
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg transition-all duration-200 group/button"
                      size="sm"
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 mr-2 text-green-400" />
                          <span className="text-green-100">Added to Queue</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2 group-hover/button:rotate-90 transition-transform duration-200" />
                          Add Video
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
