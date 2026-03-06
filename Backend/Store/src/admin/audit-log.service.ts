import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

interface AuditActor {
  id?: string;
  email?: string;
  role?: string;
}

interface CreateAuditLogInput {
  actor?: AuditActor;
  action: string;
  resource: string;
  resourceId?: string;
  method?: string;
  path?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  status?: 'SUCCESS' | 'FAILED';
  metadata?: unknown;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

interface ListAuditLogsInput {
  page: number;
  limit: number;
  actorEmail?: string;
  action?: string;
  resource?: string;
  requestId?: string;
  from?: Date;
  to?: Date;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  static createShallowDiff(
    before: Record<string, unknown>,
    after: Record<string, unknown>,
  ) {
    const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
    const diff: Record<string, { before: unknown; after: unknown }> = {};

    for (const key of keys) {
      if ((before as any)?.[key] !== (after as any)?.[key]) {
        diff[key] = {
          before: (before as any)?.[key],
          after: (after as any)?.[key],
        };
      }
    }

    return diff;
  }

  private buildMetadata(input: CreateAuditLogInput) {
    const baseMetadata: Record<string, unknown> =
      input.metadata && typeof input.metadata === 'object'
        ? { ...(input.metadata as Record<string, unknown>) }
        : {};

    if (input.requestId) {
      baseMetadata.requestId = input.requestId;
    }

    if (input.before && input.after) {
      const diff = AuditLogService.createShallowDiff(input.before, input.after);
      if (Object.keys(diff).length > 0) {
        baseMetadata.diff = diff;
      }
    }

    return Object.keys(baseMetadata).length > 0 ? baseMetadata : null;
  }

  async logAction(input: CreateAuditLogInput) {
    try {
      await this.prisma.adminAuditLog.create({
        data: {
          actor_id: input.actor?.id,
          actor_email: input.actor?.email,
          actor_role: input.actor?.role,
          action: input.action,
          resource: input.resource,
          resource_id: input.resourceId,
          method: input.method,
          path: input.path,
          ip_address: input.ipAddress,
          user_agent: input.userAgent,
          request_id: input.requestId,
          status: input.status ?? 'SUCCESS',
          metadata_json: this.buildMetadata(input) as any,
        },
      });
    } catch (error) {
      this.logger.error('Failed to write admin audit log', (error as Error)?.stack);
    }
  }

  async list(input: ListAuditLogsInput) {
    const skip = (input.page - 1) * input.limit;

    const where: any = {};

    if (input.actorEmail) {
      where.actor_email = {
        contains: input.actorEmail,
        mode: 'insensitive',
      };
    }

    if (input.action) {
      where.action = input.action;
    }

    if (input.resource) {
      where.resource = input.resource;
    }

    if (input.requestId) {
      where.request_id = input.requestId;
    }

    if (input.from || input.to) {
      where.created_at = {
        ...(input.from ? { gte: input.from } : {}),
        ...(input.to ? { lte: input.to } : {}),
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.adminAuditLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: input.limit,
      }),
      this.prisma.adminAuditLog.count({ where }),
    ]);

    return {
      items,
      total,
      page: input.page,
      totalPages: Math.ceil(total / input.limit),
    };
  }
}
