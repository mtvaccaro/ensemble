import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

interface RouteParams {
  params: {
    id: string
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: podcast, error: findError } = await supabase
      .from('podcasts')
      .select('*')
      .eq('id', params.id)
      .single()

    if (findError || !podcast) {
      return NextResponse.json({ error: 'Podcast not found' }, { status: 404 })
    }

    const { data: userClips, error: clipsError } = await supabase
      .from('clips')
      .select('id')
      .eq('user_id', user.id)
      .in('episode_id', 
        supabase
          .from('episodes')
          .select('id')
          .eq('podcast_id', params.id)
      )

    if (clipsError) {
      throw clipsError
    }

    if (userClips && userClips.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot unsubscribe from podcast with existing clips. Delete your clips first.' 
      }, { status: 400 })
    }

    const { error: deleteError } = await supabase
      .from('podcasts')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed from podcast'
    })

  } catch (error) {
    console.error('Unsubscribe error:', error)
    return NextResponse.json(
      { error: 'Failed to unsubscribe from podcast' },
      { status: 500 }
    )
  }
}