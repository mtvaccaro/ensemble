import { NextResponse } from 'next/server'

// localStorage mode - this endpoint is not used
// All podcast subscriptions are stored in browser localStorage
export async function POST() {
  return NextResponse.json({ 
    success: false,
    message: 'Using localStorage mode - no backend required'
  })
}