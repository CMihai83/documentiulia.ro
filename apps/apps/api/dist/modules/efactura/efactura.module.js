"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EfacturaModule = void 0;
const common_1 = require("@nestjs/common");
const efactura_service_1 = require("./efactura.service");
const efactura_controller_1 = require("./efactura.controller");
const prisma_module_1 = require("../../common/prisma/prisma.module");
let EfacturaModule = class EfacturaModule {
};
exports.EfacturaModule = EfacturaModule;
exports.EfacturaModule = EfacturaModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [efactura_controller_1.EfacturaController],
        providers: [efactura_service_1.EfacturaService],
        exports: [efactura_service_1.EfacturaService],
    })
], EfacturaModule);
//# sourceMappingURL=efactura.module.js.map