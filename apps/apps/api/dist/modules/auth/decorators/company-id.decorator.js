"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyId = void 0;
const common_1 = require("@nestjs/common");
exports.CompanyId = (0, common_1.createParamDecorator)((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return (request.headers['x-company-id'] ||
        request.query.companyId ||
        request.params.companyId);
});
//# sourceMappingURL=company-id.decorator.js.map