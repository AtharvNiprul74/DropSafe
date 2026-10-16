import { Request, Response, NextFunction } from 'express';
import { behaviourService } from '../services/behaviour.service';
import {
  whatsappWebhookSchema,
  createConversationSchema,
  appendMessageSchema,
  updateConversationStatusSchema,
  listConversationsQuerySchema,
} from '../validators/behaviour.validation';
import { sendCreated, sendSuccess } from '../../../core/utils/response';
import { getTenantId } from '../../../middlewares/tenantIsolation';
import { ForbiddenError } from '../../../core/errors/AppError';

export class BehaviourController {
  /**
   * 1. Ingest WhatsApp interaction message via webhook
   * POST /api/v1/behaviour/webhook/whatsapp
   */
  async handleWhatsappWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const validated = whatsappWebhookSchema.parse(req.body);
      const result = await behaviourService.ingestWhatsappMessage(orgId, validated);
      sendCreated(res, result, 'WhatsApp interaction message ingested successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 2. Start a new conversation
   * POST /api/v1/behaviour/conversations
   */
  async createConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const validated = createConversationSchema.parse(req.body);
      const conversation = await behaviourService.createConversation(orgId, validated);
      sendCreated(res, conversation, 'Chatbot conversation started successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 3. Append an immutable message to an existing conversation
   * POST /api/v1/behaviour/conversations/:id/messages
   */
  async appendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const conversationId = String(req.params.id);
      const validated = appendMessageSchema.parse(req.body);
      const message = await behaviourService.appendMessage(orgId, conversationId, validated);
      sendCreated(res, message, 'Message appended immutably');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 4. List conversations (Privacy-preserving: metadata & counts only)
   * GET /api/v1/behaviour/conversations
   */
  async listConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const query = listConversationsQuerySchema.parse(req.query);
      const result = await behaviourService.listConversations(orgId, query);
      sendSuccess(res, result.items, 'Conversations retrieved', 200, result.pagination);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 5. Get conversation metadata by ID
   * GET /api/v1/behaviour/conversations/:id
   */
  async getConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const conversationId = String(req.params.id);
      const conversation = await behaviourService.getConversationById(orgId, conversationId);
      sendSuccess(res, conversation, 'Conversation metadata retrieved');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 6. Get raw messages for a conversation
   * GET /api/v1/behaviour/conversations/:id/messages
   * STRICT PRIVACY RESTRICTION: Mentors and Organization Admins are strictly forbidden!
   */
  async getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const conversationId = String(req.params.id);

      // Privacy Rule: Raw student chatbot messages must NOT be readable by Mentors or Organization Admins
      const userRoles = req.user?.roles || [];
      const isMentor = userRoles.some((r) => r.toLowerCase().includes('mentor'));
      const isOrgAdmin = userRoles.some((r) => r.toLowerCase().includes('admin'));

      if (isMentor || isOrgAdmin) {
        throw new ForbiddenError(
          'Privacy policy violation: Raw student chatbot interaction messages cannot be viewed by Mentors or Organization Admins'
        );
      }

      const messages = await behaviourService.getConversationMessages(orgId, conversationId);
      sendSuccess(res, messages, 'Conversation messages retrieved');
    } catch (error) {
      next(error);
    }
  }

  /**
   * 7. Transition conversation status
   * PATCH /api/v1/behaviour/conversations/:id/status
   */
  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = getTenantId(req);
      const conversationId = String(req.params.id);
      const { status } = updateConversationStatusSchema.parse(req.body);
      const updated = await behaviourService.updateConversationStatus(orgId, conversationId, status);
      sendSuccess(res, updated, `Conversation status updated to ${status}`);
    } catch (error) {
      next(error);
    }
  }
}

export const behaviourController = new BehaviourController();
