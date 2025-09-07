import { type NextRequest, NextResponse } from "next/server"

// This is a placeholder for the YouTube API integration
// You'll need to add your YouTube Data API v3 key to environment variables
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")
  const maxResults = searchParams.get("maxResults") || "12"

  if (!query) {
    return NextResponse.json({ error: "Query parameter is required" }, { status: 400 })
  }

  // Check if YouTube API key is available
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "YouTube API key not configured. Please add YOUTUBE_API_KEY to your environment variables.",
      },
      { status: 500 },
    )
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query)}&maxResults=${maxResults}&key=${apiKey}`,
    )

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`)
    }

    const data = await response.json()

    // Transform the YouTube API response to match our interface
    const videos =
      data.items?.map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        thumbnailUrl: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
        publishedAt: item.snippet.publishedAt,
        description: item.snippet.description,
      })) || []

    return NextResponse.json({ videos })
  } catch (error) {
    console.error("YouTube API error:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch videos from YouTube API",
      },
      { status: 500 },
    )
  }
}
