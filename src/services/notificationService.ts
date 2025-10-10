/**
 * Notification Service
 * Business logic for notification operations with Prisma database
 */

import { prisma } from '../config/database';
import { Notification } from '@prisma/client';

// =============================================================================
// INTERFACES
// =============================================================================

export interface CreateNotificationData {
  alertId?: bigint;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

// =============================================================================
// NOTIFICATION OPERATIONS
// =============================================================================

/**
 * Get all notifications for a user
 */
export async function getNotifications(userId: bigint): Promise<Notification[]> {
  return await prisma.notification.findMany({
    where: {
      userId,
      deletedAt: null,
    },
    orderBy: [
      { read: 'asc' },       // Unread first
      { createdAt: 'desc' }, // Newest first
    ],
  });
}

/**
 * Get a single notification by ID
 */
export async function getNotificationById(
  userId: bigint,
  notificationId: bigint
): Promise<Notification | null> {
  return await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
      deletedAt: null,
    },
  });
}

/**
 * Create a new notification
 */
export async function createNotification(
  userId: bigint,
  data: CreateNotificationData
): Promise<Notification> {
  return await prisma.notification.create({
    data: {
      userId,
      alertId: data.alertId || null,
      title: data.title,
      message: data.message,
      metadata: data.metadata || {},
      read: false,
    },
  });
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(
  userId: bigint,
  notificationId: bigint
): Promise<Notification | null> {
  const existing = await getNotificationById(userId, notificationId);
  if (!existing) return null;

  return await prisma.notification.update({
    where: { id: notificationId },
    data: {
      read: true,
      readAt: new Date(),
    },
  });
}

/**
 * Delete a notification (soft delete)
 */
export async function deleteNotification(
  userId: bigint,
  notificationId: bigint
): Promise<boolean> {
  const result = await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId,
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
    },
  });

  return result.count > 0;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsRead(userId: bigint): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      deletedAt: null,
      read: false,
    },
    data: {
      read: true,
      readAt: new Date(),
    },
  });

  return result.count;
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(userId: bigint): Promise<number> {
  return await prisma.notification.count({
    where: {
      userId,
      deletedAt: null,
      read: false,
    },
  });
}
