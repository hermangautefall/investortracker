import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')

  if (!REVALIDATE_SECRET || authHeader !== `Bearer ${REVALIDATE_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Live data pages
    revalidatePath('/', 'page')
    revalidatePath('/insiders', 'page')
    revalidatePath('/superinvestors', 'page')
    revalidatePath('/superinvestor-consensus', 'page')
    revalidatePath('/grand-portfolio', 'page')
    revalidatePath('/politicians', 'page')

    // Dynamic profile pages — revalidate entire layouts
    revalidatePath('/superinvestors/[id]', 'page')
    revalidatePath('/insiders/[id]', 'page')
    revalidatePath('/politicians/[id]', 'page')
    revalidatePath('/tickers/[ticker]', 'page')
    revalidatePath('/stocks/[ticker]', 'page')

    return NextResponse.json({
      revalidated: true,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Revalidation failed', detail: String(err) },
      { status: 500 },
    )
  }
}
