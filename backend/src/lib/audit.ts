import { Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma';

export async function audit(
  userId: string | undefined,
  action: string,
  entity: string,
  entityId?: string,
  metadata?: Prisma.InputJsonValue,
): Promise<void> {
  await prisma.auditLog.create({
    data: { userId, action, entity, entityId, metadata },
  });
}
