import { NextResponse } from 'next/server'

// localStorage mode - this endpoint is not used
// All podcast data is stored in browser localStorage
export async function GET() {
  return NextResponse.json({ 
    podcasts: [],
    message: 'Using localStorage mode - no backend required'
  })
}