"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SagaModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const saga_controller_1 = require("./saga.controller");
const saga_service_1 = require("./saga.service");
const prisma_module_1 = require("../../../common/prisma/prisma.module");
const clerk_guard_1 = require("../../auth/guards/clerk.guard");
let SagaModule = class SagaModule {
};
exports.SagaModule = SagaModule;
exports.SagaModule = SagaModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, config_1.ConfigModule],
        controllers: [saga_controller_1.SagaController],
        providers: [saga_service_1.SagaIntegrationService, clerk_guard_1.ClerkAuthGuard],
        exports: [saga_service_1.SagaIntegrationService],
    })
], SagaModule);
//# sourceMappingURL=saga.module.js.map