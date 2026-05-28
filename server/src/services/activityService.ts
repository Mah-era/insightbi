import { prisma } from '../utils/prisma';

export async function logActivity(
  userId: string,
  workspaceId: string | null,
  action: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: { userId, workspaceId: workspaceId || undefined, action, metadataJson: JSON.stringify(metadata) },
    });
  } catch {
    // non-blocking
  }
}
