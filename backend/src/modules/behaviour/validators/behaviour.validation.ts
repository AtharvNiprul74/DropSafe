import { z } from 'zod';
import { ChatbotSource, ConversationStatus, MessageSenderType } from '@prisma/client';

export const whatsappWebhookSchema = z.object({
  student_id: z.string().uuid().optional(),
  phone: z.string().trim().optional(),
  prn: z.string().trim().optional(),
  message_text: z.string().trim().min(1, 'Message text is required'),
  sender_type: z.nativeEnum(MessageSenderType).optional().default(MessageSenderType.STUDENT),
  source: z.nativeEnum(ChatbotSource).optional().default(ChatbotSource.WHATSAPP),
  timestamp: z.string().datetime().optional(),
});

export const createConversationSchema = z.object({
  student_id: z.string().uuid('student_id must be a valid UUID'),
  enrollment_id: z.string().uuid().optional(),
  source: z.nativeEnum(ChatbotSource).optional().default(ChatbotSource.WHATSAPP),
});

export const appendMessageSchema = z.object({
  sender_type: z.nativeEnum(MessageSenderType),
  message_text: z.string().trim().min(1, 'message_text cannot be empty'),
  timestamp: z.string().datetime().optional(),
});

export const updateConversationStatusSchema = z.object({
  status: z.nativeEnum(ConversationStatus),
});

export const listConversationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  student_id: z.string().uuid().optional(),
  status: z.nativeEnum(ConversationStatus).optional(),
  source: z.nativeEnum(ChatbotSource).optional(),
});

export type WhatsappWebhookInput = z.infer<typeof whatsappWebhookSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type AppendMessageInput = z.infer<typeof appendMessageSchema>;
export type UpdateConversationStatusInput = z.infer<typeof updateConversationStatusSchema>;
export type ListConversationsQuery = z.infer<typeof listConversationsQuerySchema>;
