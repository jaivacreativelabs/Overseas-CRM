import { Types } from 'mongoose';
import { NotificationModel, INotification } from './notification.model';

export class NotificationService {
  static async getUserNotifications(userId: string): Promise<any[]> {
    return NotificationModel.find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
  }

  static async createNotification(data: {
    userId: string;
    title: string;
    message: string;
    type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ACTION_REQUIRED';
    actionUrl?: string;
  }): Promise<INotification> {
    return NotificationModel.create({
      userId: new Types.ObjectId(data.userId),
      title: data.title,
      message: data.message,
      type: data.type || 'INFO',
      actionUrl: data.actionUrl,
    });
  }

  static async markAsRead(notificationId: string): Promise<void> {
    await NotificationModel.findByIdAndUpdate(notificationId, { isRead: true });
  }

  static async markAllAsRead(userId: string): Promise<void> {
    await NotificationModel.updateMany({ userId: new Types.ObjectId(userId) }, { isRead: true });
  }
}
