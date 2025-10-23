import { NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// localStorage mode - this endpoint is not used
// All podcast unsubscriptions are handled in browser localStorage
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params
  return NextResponse.json({ 
    success: false,
    message: `Using localStorage mode for podcast ${id} - no backend required`
  })
}