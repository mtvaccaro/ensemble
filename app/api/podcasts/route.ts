import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: podcasts, error } = await supabase
      .from('podcasts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ podcasts })

  } catch (error) {
    console.error('Get podcasts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch podcasts' },
      { status: 500 }
    )
  }
}