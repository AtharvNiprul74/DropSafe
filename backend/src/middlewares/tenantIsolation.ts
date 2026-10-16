import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, TenantScopeViolationError } from '../core/errors/AppError';

export function enforceTenantIsolation(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || !req.user.organizationId) {
    return next(new UnauthorizedError('Tenant isolation requires an authenticated context'));
  }

  const authenticatedOrgId = req.user.organizationId;

  // Check any route params
  const paramOrgId = req.params.organizationId || req.params.orgId || req.params.organization_id;
  if (paramOrgId && paramOrgId !== authenticatedOrgId) {
    return next(
      new TenantScopeViolationError(
        `Cross-organization request blocked. Route organization (${paramOrgId}) does not match authenticated organization (${authenticatedOrgId}).`
      )
    );
  }

  // Check query params
  const queryOrgId = req.query.organizationId || req.query.orgId || req.query.organization_id;
  if (queryOrgId && typeof queryOrgId === 'string' && queryOrgId !== authenticatedOrgId) {
    return next(
      new TenantScopeViolationError(
        `Cross-organization query parameter blocked. Query organization does not match authenticated organization.`
      )
    );
  }

  // Check request body if present
  if (req.body && typeof req.body === 'object') {
    const bodyOrgId = req.body.organizationId || req.body.organization_id;
    if (bodyOrgId && bodyOrgId !== authenticatedOrgId) {
      return next(
        new TenantScopeViolationError(
          `Cross-organization body payload blocked. Payload organization (${bodyOrgId}) does not match authenticated organization (${authenticatedOrgId}).`
        )
      );
    }
    // Automatically inject/ensure organization_id on body
    req.body.organization_id = authenticatedOrgId;
  }

  // Lock tenant context
  req.tenant = {
    organizationId: authenticatedOrgId,
  };

  // Provide response header for audit & debugging
  res.setHeader('X-Organization-Id', authenticatedOrgId);

  next();
}

/**
 * Utility helper to safely retrieve the active tenant organization ID
 */
export function getTenantId(req: Request): string {
  if (!req.tenant?.organizationId) {
    throw new UnauthorizedError('Tenant context missing from request');
  }
  return req.tenant.organizationId;
}
