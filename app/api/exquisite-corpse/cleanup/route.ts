import { NextResponse } from 'next/server';
import { getGameService } from '@/app/lib/gameService';

export async function POST() {
  try {
    const gameService = getGameService();
    const cleanedCount = gameService.cleanupAbandonedGames();

    return NextResponse.json({
      success: true,
      cleanedCount,
      message: `Cleaned up ${cleanedCount} abandoned games`
    });
  } catch (error) {
    console.error('Cleanup failed:', error);
    return NextResponse.json(
      { error: 'Failed to run cleanup' },
      { status: 500 }
    );
  }
}
