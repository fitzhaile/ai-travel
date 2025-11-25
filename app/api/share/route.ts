import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { initDb, saveSharedChat } from "../../../lib/db";

export async function POST(req: NextRequest) {
  try {
    // Initialize database if needed
    await initDb();

    const body = await req.json();
    const { mode, trip, messages } = body;

    if (!mode || !trip || !messages) {
      return NextResponse.json(
        { error: "Missing required fields: mode, trip, messages" },
        { status: 400 }
      );
    }

    // Generate a short unique ID
    const chatId = nanoid(10);

    // Save to database
    await saveSharedChat(chatId, mode, trip, messages);

    // Return the shareable URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    req.headers.get("origin") || 
                    "http://localhost:3000";
    
    const shareUrl = `${baseUrl}/chat/${chatId}`;

    return NextResponse.json({ 
      id: chatId,
      url: shareUrl 
    });
  } catch (error) {
    console.error("Error sharing chat:", error);
    return NextResponse.json(
      { error: "Failed to create shareable link" },
      { status: 500 }
    );
  }
}

