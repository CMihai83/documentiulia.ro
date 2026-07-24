import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Validates SAF-T D406 XML against ANAF's official XSD schema
 * (Ro_SAFT_Schema_v249_2025.xsd, v2.4.9, published 08.07.2025 — bundled in
 * assets/saft/). This is real schema validation, unlike the structural rules
 * in saft-validator.service.ts; a file that passes here matches what ANAF's
 * own validator enforces at the schema level.
 */
@Injectable()
export class SaftXsdValidatorService implements OnModuleInit {
  private readonly logger = new Logger(SaftXsdValidatorService.name);
  private xsdDoc: any = null;
  private libxml: any = null;

  onModuleInit() {
    try {
      // Lazy require: native module — keep boot resilient if the binary is
      // missing on an exotic platform; validation then reports unavailable.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      this.libxml = require('libxmljs2');
      const xsdPath = path.join(process.cwd(), 'assets', 'saft', 'Ro_SAFT_Schema_v249_2025.xsd');
      this.xsdDoc = this.libxml.parseXml(fs.readFileSync(xsdPath, 'utf8'));
      this.logger.log(`ANAF SAF-T XSD loaded (v2.4.9) from ${xsdPath}`);
    } catch (e) {
      this.logger.error(`XSD validator unavailable: ${(e as Error).message}`);
    }
  }

  get available(): boolean {
    return this.xsdDoc !== null;
  }

  validate(xml: string, maxErrors = 25): { available: boolean; valid: boolean; errors: string[] } {
    if (!this.available) {
      return { available: false, valid: false, errors: ['XSD validator unavailable on this deployment'] };
    }
    try {
      const doc = this.libxml.parseXml(xml);
      const valid: boolean = doc.validate(this.xsdDoc);
      const errors = valid
        ? []
        : (doc.validationErrors as any[])
            .slice(0, maxErrors)
            .map((e) => `${e.line ? `line ${e.line}: ` : ''}${String(e.message).trim()}`);
      return { available: true, valid, errors };
    } catch (e) {
      return { available: true, valid: false, errors: [`XML parse error: ${(e as Error).message}`] };
    }
  }
}
