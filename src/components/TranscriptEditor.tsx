import { PrismaClient } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

const prisma = new PrismaClient()

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid transcript ID' },
        { status: 400 }
      )
    }

    const body = await request.json()

    if (!body || typeof body.text !== 'string') {
      return NextResponse.json(
        { error: 'Request body must include a text field of type string' },
        { status: 400 }
      )
    }

    const trimmedText = body.text.trim()

    const existing = await prisma.transcript.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Transcript not found' },
        { status: 404 }
      )
    }

    const updated = await prisma.transcript.update({
      where: { id },
      data: { text: trimmedText },
    })

    return NextResponse.json(updated, { status: 200 })
  } catch (error) {
    console.error('Error updating transcript:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}