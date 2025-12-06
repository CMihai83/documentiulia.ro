import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CompanyId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    // Get company ID from header, query param, or route param
    return (
      request.headers['x-company-id'] ||
      request.query.companyId ||
      request.params.companyId
    );
  },
);
