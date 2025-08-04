import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: podcast, error: findError } = await supabase
      .from('podcasts')
      .select('*')
      .eq('id', id)
      .single()

    if (findError || !podcast) {
      return NextResponse.json({ error: 'Podcast not found' }, { status: 404 })
    }

    // First get episode IDs for this podcast
    const { data: podcastEpisodes, error: episodesError } = await supabase
      .from('episodes')
      .select('id')
      .eq('podcast_id', id)

    if (episodesError) {
      throw episodesError
    }

    const episodeIds = podcastEpisodes?.map(ep => ep.id) || []

    // Then check if user has clips for these episodes
    const { data: userClips, error: clipsError } = await supabase
      .from('clips')
      .select('id')
      .eq('user_id', user.id)
      .in('episode_id', episodeIds)

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
      .eq('id', id)

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