import { Types } from 'mongoose';
import { MessageModel, IMessage } from './message.model';
import { UserRole } from '../../config/constants';
import { NotFoundError, ForbiddenError, ValidationError } from '../../utils/errors';
import { ActivityService } from '../activities/activity.service';

export class MessageService {
  static async getMessages(
    leadId: string,
    isStudent: boolean
  ): Promise<any[]> {
    const filter: Record<string, any> = { leadId: new Types.ObjectId(leadId) };
    if (isStudent) {
      filter.isInternalNote = false; // Students never see internal notes
    }

    return MessageModel.find(filter).sort({ createdAt: 1 }).lean();
  }

  static async sendMessage(
    data: {
      leadId?: string;
      studentId?: string;
      recipientId?: string;
      content: string;
      isInternalNote?: boolean;
      attachments?: { fileUrl: string; fileName: string }[];
    },
    senderUserId: string,
    senderName: string,
    senderRole: UserRole
  ): Promise<IMessage> {
    // Students can NEVER create internal notes
    const isInternal = senderRole === UserRole.STUDENT ? false : !!data.isInternalNote;

    const message = await MessageModel.create({
      leadId: data.leadId ? new Types.ObjectId(data.leadId) : undefined,
      studentId: data.studentId ? new Types.ObjectId(data.studentId) : undefined,
      recipientId: data.recipientId ? new Types.ObjectId(data.recipientId) : undefined,
      senderId: new Types.ObjectId(senderUserId),
      senderName,
      senderRole,
      content: data.content,
      isInternalNote: isInternal,
      attachments: data.attachments,
    });

    if (data.leadId && !isInternal) {
      await ActivityService.log({
        leadId: data.leadId,
        actorId: senderUserId,
        actorName: senderName,
        actorRole: senderRole,
        action: 'MESSAGE_SENT',
        title: 'Portal Message Sent',
        description: `${senderName} (${senderRole}): ${data.content.slice(0, 80)}...`,
      });
    }

    return message;
  }

  static async editInternalNote(
    messageId: string,
    newContent: string,
    editorRole: UserRole
  ): Promise<IMessage> {
    const msg = await MessageModel.findById(messageId);
    if (!msg) throw new NotFoundError('Message not found');

    if (!msg.isInternalNote) {
      throw new ForbiddenError('Student-visible messages cannot be modified after sending.');
    }

    if (editorRole === UserRole.STUDENT) {
      throw new ForbiddenError('Students cannot edit notes.');
    }

    msg.content = newContent;
    await msg.save();

    return msg;
  }
}
