import { prisma } from '../../../config/database';
import {
  NotificationType,
  NotificationChannel,
  NotificationStatus,
  Prisma,
} from '@prisma/client';
import { ListNotificationsQuery } from '../validators/counseling.validation';

export interface CreateNotificationParams {
  organizationId: string;
  recipientUserId?: string | null;
  recipientStudentId?: string | null;
  notificationType: NotificationType;
  channel?: NotificationChannel;
  title: string;
  message: string;
}

export class NotificationService {
  /**
   * Create an append-only notification record in notification_history
   */
  public async createNotification(params: CreateNotificationParams) {
    try {
      return await prisma.notificationHistory.create({
        data: {
          organization_id: params.organizationId,
          recipient_user_id: params.recipientUserId || null,
          recipient_student_id: params.recipientStudentId || null,
          notification_type: params.notificationType,
          channel: params.channel || NotificationChannel.IN_APP,
          status: NotificationStatus.QUEUED,
          title: params.title,
          message: params.message,
        },
      });
    } catch (err) {
      console.error('[NotificationService] Failed to record notification:', err);
      return null;
    }
  }

  /**
   * Query Notification History
   */
  public async listNotifications(
    organizationId: string,
    query: ListNotificationsQuery
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationHistoryWhereInput = {
      organization_id: organizationId,
      ...(query.recipient_user_id ? { recipient_user_id: query.recipient_user_id } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.notification_type ? { notification_type: query.notification_type } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.notificationHistory.count({ where }),
      prisma.notificationHistory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          recipient_user: {
            select: { id: true, first_name: true, last_name: true, email: true },
          },
          recipient_student: {
            select: { id: true, first_name: true, last_name: true, email: true },
          },
        },
      }),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const notificationService = new NotificationService();
