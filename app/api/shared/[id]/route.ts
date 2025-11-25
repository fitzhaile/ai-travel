import { NextRequest, NextResponse } from "next/server";
import { getSharedChat, initDb } from "../../../../lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Initialize database if needed
    await initDb();

    const chatId = params.id;

    if (!chatId) {
      return NextResponse.json(
        { error: "Chat ID is required" },
        { status: 400 }
      );
    }

    const chat = await getSharedChat(chatId);

    if (!chat) {
      return NextResponse.json(
        { error: "Chat not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      mode: chat.mode,
      trip: chat.trip,
      messages: chat.messages,
      createdAt: chat.created_at
    });
  } catch (error) {
    console.error("Error retrieving shared chat:", error);
    return NextResponse.json(
      { error: "Failed to retrieve chat" },
      { status: 500 }
    );
  }
}

