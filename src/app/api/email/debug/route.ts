import { NextResponse } from 'next/server'

export async function GET() {
  const key = process.env.ANTHROPIC_API_KEY
  return NextResponse.json({
    hasKey: !!key,
    keyLength: key?.length || 0,
    keyPrefix: key?.substring(0, 10) || 'none',
    allEnvKeys: Object.keys(process.env).filter(k => k.toLowerCase().includes('anthropic'))
  })
}
