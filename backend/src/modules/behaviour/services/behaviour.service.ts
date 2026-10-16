import { prisma } from '../../../config/database';
import {
  ChatbotSource,
  ConversationStatus,
  MessageSenderType,
  Prisma,
} from '@prisma/client';
import { NotFoundError, ValidationError } from '../../../core/errors/AppError';
import {
  WhatsappWebhookInput,
  CreateConversationInput,
  AppendMessageInput,
  ListConversationsQuery,
} from '../validators/behaviour.validation';

export class BehaviourService {
  /**
   * Resolve a student in the organization by ID, phone number, or PRN
   */
  public async resolveStudent(
    organizationId: string,
    params: { student_id?: string; phone?: string; prn?: string }
  ) {
    if (params.student_id) {
      const student = await prisma.student.findFirst({
        where: { id: params.student_id, organization_id: organizationId },
      });
      if (student) return student;
    }

    if (params.prn) {
      const identifier = await prisma.studentIdentifier.findFirst({
        where: {
          organization_id: organizationId,
          identifier_value: params.prn,
        },
        include: { student: true },
      });
      if (identifier?.student) return identifier.student;
    }

    if (params.phone) {
      const student = await prisma.student.findFirst({
        where: {
          organization_id: organizationId,
          phone: params.phone,
        },
      });
      if (student) return student;
    }

    throw new NotFoundError(
      `Student could not be resolved in this organization using provided credentials (id, prn, or phone)`
    );
  }

  /**
   * Ingest WhatsApp interaction message via webhook
   */
  public async ingestWhatsappMessage(
    organizationId: string,
    input: WhatsappWebhookInput
  ) {
    const student = await this.resolveStudent(organizationId, {
      student_id: input.student_id,
      phone: input.phone,
      prn: input.prn,
    });

    // Find latest active conversation or create one
    let conversation = await prisma.chatbotConversation.findFirst({
      where: {
        organization_id: organizationId,
        student_id: student.id,
        status: ConversationStatus.ACTIVE,
      },
      orderBy: { started_at: 'desc' },
    });

    if (!conversation) {
      // Find active enrollment if available
      const activeEnrollment = await prisma.enrollment.findFirst({
        where: {
          organization_id: organizationId,
          student_id: student.id,
          status: 'ACTIVE',
        },
        orderBy: { created_at: 'desc' },
      });

      conversation = await prisma.chatbotConversation.create({
        data: {
          organization_id: organizationId,
          student_id: student.id,
          enrollment_id: activeEnrollment?.id || null,
          source: input.source || ChatbotSource.WHATSAPP,
          status: ConversationStatus.ACTIVE,
        },
      });
    }

    // Append immutable message
    const message = await prisma.chatbotMessage.create({
      data: {
        conversation_id: conversation.id,
        sender_type: input.sender_type || MessageSenderType.STUDENT,
        message_text: input.message_text,
        message_timestamp: input.timestamp ? new Date(input.timestamp) : new Date(),
      },
    });

    return {
      conversation_id: conversation.id,
      student_id: student.id,
      message_id: message.id,
      sender_type: message.sender_type,
      message_timestamp: message.message_timestamp,
    };
  }

  /**
   * Start a new conversation
   */
  public async createConversation(
    organizationId: string,
    input: CreateConversationInput
  ) {
    // Verify student belongs to tenant
    const student = await prisma.student.findFirst({
      where: { id: input.student_id, organization_id: organizationId },
    });

    if (!student) {
      throw new NotFoundError(`Student '${input.student_id}' not found in organization`);
    }

    if (input.enrollment_id) {
      const enrollment = await prisma.enrollment.findFirst({
        where: { id: input.enrollment_id, organization_id: organizationId },
      });
      if (!enrollment) {
        throw new NotFoundError(`Enrollment '${input.enrollment_id}' not found in organization`);
      }
    }

    return prisma.chatbotConversation.create({
      data: {
        organization_id: organizationId,
        student_id: input.student_id,
        enrollment_id: input.enrollment_id || null,
        source: input.source || ChatbotSource.WHATSAPP,
        status: ConversationStatus.ACTIVE,
      },
      include: {
        student: {
          select: { id: true, first_name: true, last_name: true },
        },
      },
    });
  }

  /**
   * Append a message to an existing conversation
   */
  public async appendMessage(
    organizationId: string,
    conversationId: string,
    input: AppendMessageInput
  ) {
    const conversation = await prisma.chatbotConversation.findFirst({
      where: { id: conversationId, organization_id: organizationId },
    });

    if (!conversation) {
      throw new NotFoundError(`Conversation '${conversationId}' not found in organization`);
    }

    if (conversation.status !== ConversationStatus.ACTIVE) {
      throw new ValidationError(`Cannot append messages to a conversation in status '${conversation.status}'`);
    }

    return prisma.chatbotMessage.create({
      data: {
        conversation_id: conversationId,
        sender_type: input.sender_type,
        message_text: input.message_text,
        message_timestamp: input.timestamp ? new Date(input.timestamp) : new Date(),
      },
    });
  }

  /**
   * List conversations (Privacy-preserving: metadata & counts only, NO raw message text)
   */
  public async listConversations(
    organizationId: string,
    query: ListConversationsQuery
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ChatbotConversationWhereInput = {
      organization_id: organizationId,
      ...(query.student_id ? { student_id: query.student_id } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.source ? { source: query.source } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.chatbotConversation.count({ where }),
      prisma.chatbotConversation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { started_at: 'desc' },
        select: {
          id: true,
          organization_id: true,
          student_id: true,
          enrollment_id: true,
          source: true,
          status: true,
          started_at: true,
          ended_at: true,
          created_at: true,
          student: {
            select: { id: true, first_name: true, last_name: true },
          },
          _count: {
            select: { messages: true },
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

  /**
   * Get conversation details by ID (metadata only)
   */
  public async getConversationById(organizationId: string, conversationId: string) {
    const conversation = await prisma.chatbotConversation.findFirst({
      where: { id: conversationId, organization_id: organizationId },
      include: {
        student: {
          select: { id: true, first_name: true, last_name: true, email: true, phone: true },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundError(`Conversation '${conversationId}' not found in organization`);
    }

    return conversation;
  }

  /**
   * Get raw messages for a conversation (Privacy-restricted endpoint)
   */
  public async getConversationMessages(organizationId: string, conversationId: string) {
    const conversation = await prisma.chatbotConversation.findFirst({
      where: { id: conversationId, organization_id: organizationId },
    });

    if (!conversation) {
      throw new NotFoundError(`Conversation '${conversationId}' not found in organization`);
    }

    return prisma.chatbotMessage.findMany({
      where: { conversation_id: conversationId },
      orderBy: { message_timestamp: 'asc' },
    });
  }

  /**
   * Update conversation status (e.g. COMPLETED or ARCHIVED)
   */
  public async updateConversationStatus(
    organizationId: string,
    conversationId: string,
    status: ConversationStatus
  ) {
    const conversation = await prisma.chatbotConversation.findFirst({
      where: { id: conversationId, organization_id: organizationId },
    });

    if (!conversation) {
      throw new NotFoundError(`Conversation '${conversationId}' not found in organization`);
    }

    const updateData: Prisma.ChatbotConversationUpdateInput = { status };
    if (status === ConversationStatus.COMPLETED && !conversation.ended_at) {
      updateData.ended_at = new Date();
    }

    return prisma.chatbotConversation.update({
      where: { id: conversationId },
      data: updateData,
    });
  }
}

export const behaviourService = new BehaviourService();
