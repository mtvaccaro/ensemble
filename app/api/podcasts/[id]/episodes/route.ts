import { NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// localStorage mode - this endpoint is not used
// All episode data is fetched via RSS on the client side
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params
  return NextResponse.json({ 
    episodes: [],
    message: `Using localStorage mode for podcast ${id} - no backend required`
  })
}