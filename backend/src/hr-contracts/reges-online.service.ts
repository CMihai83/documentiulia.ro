import { Injectable, Logger, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

/**
 * REGES-Online integration (REQ-047).
 *
 * Since 1 April 2025 Inspecția Muncii's REGES-Online replaced the REVISAL
 * desktop/.rvs workflow (sole legal channel since 1 Jan 2026 — REQ-044
 * hr-payroll research, verified 3-0). This service targets the official REST
 * API (github.com/reges-ro/integrare):
 *   - SSO: Keycloak password grant, realm API, client 'reges-api'
 *     (per-employer username/password issued in the REGES portal under
 *     Settings -> Access -> API Keys)
 *   - POST /api/Salariat   — employee registration
 *   - POST /api/Contract   — contract lifecycle (AdaugareContract,
 *     ModificareContract, IncetareContract, SuspendareContract, ...)
 *   - POST /api/Notificare/PollMessage|ReadMessage|CommitRead — async replies
 *   - GET  /api/Nomenclator — reference nomenclatures (COR codes, sporuri)
 *
 * Statutory deadline automated here: each contract must be transmitted at the
 * latest the CALENDAR day before the employee starts work ("ziua anterioară",
 * no working-day qualifier — a Monday start means Sunday transmission), fined
 * 20,000 lei/person (HG 295/2025).
 */

export type RegesContractOperation =
  | 'AdaugareContract'
  | 'ModificareContract'
  | 'CorectieContract'
  | 'IncetareContract'
  | 'SuspendareContract'
  | 'IncetareSuspendareContract'
  | 'RadiereContract';

export interface RegesSubmissionResult {
  submitted: boolean;
  messageId: string;
  operation: string;
  httpStatus?: number;
  response?: any;
  error?: string;
}

@Injectable()
export class RegesOnlineService {
  private readonly logger = new Logger(RegesOnlineService.name);
  private token: string | null = null;
  private tokenExpiresAt = 0;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  // --- configuration -------------------------------------------------------

  get apiUrl(): string {
    return this.config.get<string>('REGES_API_URL') || 'https://api.inspectiamuncii.ro';
  }

  get ssoTokenUrl(): string {
    return (
      this.config.get<string>('REGES_SSO_TOKEN_URL') ||
      'https://sso.inspectiamuncii.org/realms/API/protocol/openid-connect/token'
    );
  }

  get isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('REGES_USERNAME') && this.config.get<string>('REGES_PASSWORD'),
    );
  }

  status() {
    return {
      configured: this.isConfigured,
      apiUrl: this.apiUrl,
      ssoTokenUrl: this.ssoTokenUrl,
      hint: this.isConfigured
        ? undefined
        : 'Set REGES_USERNAME / REGES_PASSWORD (issued per employer in the REGES portal: Setări -> Acces -> Chei API). For the public test environment set REGES_API_URL=https://api.dev.inspectiamuncii.org and REGES_SSO_TOKEN_URL=https://sso.dev.inspectiamuncii.org/realms/API/protocol/openid-connect/token',
    };
  }

  // --- auth ----------------------------------------------------------------

  private async getToken(): Promise<string> {
    if (!this.isConfigured) {
      throw new ServiceUnavailableException(
        'REGES-Online nu este configurat: setați REGES_USERNAME / REGES_PASSWORD (chei API emise în portalul REGES).',
      );
    }
    if (this.token && Date.now() < this.tokenExpiresAt - 30_000) {
      return this.token;
    }
    const body = new URLSearchParams({
      grant_type: 'password',
      client_id: this.config.get<string>('REGES_CLIENT_ID') || 'reges-api',
      client_secret: this.config.get<string>('REGES_CLIENT_SECRET') || 'FjtrYvDTGZKiyHGdSWymOvxhqifTJ7Em',
      username: this.config.get<string>('REGES_USERNAME')!,
      password: this.config.get<string>('REGES_PASSWORD')!,
    });
    const res = await fetch(this.ssoTokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`REGES SSO auth failed (${res.status}): ${text.slice(0, 300)}`);
      throw new ServiceUnavailableException(`Autentificare REGES eșuată (${res.status})`);
    }
    const data: any = await res.json();
    this.token = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in || 300) * 1000;
    return this.token!;
  }

  // --- envelope ------------------------------------------------------------

  buildHeader(operation: string) {
    return {
      messageId: randomUUID(),
      clientApplication: 'DocumentIulia',
      version: '5',
      operation,
      sessionId: randomUUID(),
      user: this.config.get<string>('REGES_USERNAME') || 'documentiulia',
      timestamp: new Date().toISOString(),
    };
  }

  private async post(path: string, payload: any): Promise<{ status: number; body: any }> {
    const token = await this.getToken();
    const res = await fetch(`${this.apiUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    let body: any = null;
    const text = await res.text();
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    return { status: res.status, body };
  }

  // --- operations ----------------------------------------------------------

  /** Register an employee (Salariat) — prerequisite for contract operations. */
  async registerEmployee(salariat: Record<string, any>): Promise<RegesSubmissionResult> {
    const header = this.buildHeader('AdaugareSalariat');
    const payload = { $type: 'salariat', header, continut: { $type: 'continutSalariat', ...salariat } };
    const { status, body } = await this.post('/api/Salariat', payload);
    return { submitted: status < 300, messageId: header.messageId, operation: 'AdaugareSalariat', httpStatus: status, response: body };
  }

  /** Submit a contract lifecycle operation with a prebuilt continut payload. */
  async submitContractOperation(
    operation: RegesContractOperation,
    continut: Record<string, any>,
    referintaContract?: string,
  ): Promise<RegesSubmissionResult> {
    const header = this.buildHeader(operation);
    const payload: any = { $type: 'contract', header, continut: { $type: 'continutContract', ...continut } };
    if (referintaContract) {
      payload.referintaContract = { $type: 'referinta', id: referintaContract };
    }
    const { status, body } = await this.post('/api/Contract', payload);
    return { submitted: status < 300, messageId: header.messageId, operation, httpStatus: status, response: body };
  }

  /**
   * Register an HRContract from our database (AdaugareContract). Maps the
   * HRContract + Employee records onto the REGES continutContract shape and
   * records the outcome on the contract row (revisal* fields repurposed).
   */
  async registerContractById(contractId: string, opts?: { corCod?: number; corVersiune?: number }): Promise<RegesSubmissionResult> {
    const contract = await this.prisma.hRContract.findUnique({
      where: { id: contractId },
      include: { employee: true },
    });
    if (!contract) throw new BadRequestException('Contract inexistent');
    if (!contract.employee?.cnp) throw new BadRequestException('Salariatul nu are CNP înregistrat');

    const corCod = opts?.corCod ?? Number(this.config.get('REGES_DEFAULT_COR') || 0);
    if (!corCod) {
      throw new BadRequestException(
        'Cod COR lipsă: transmiteți corCod (nomenclatorul COR: GET /hr-contracts/reges/nomenclator).',
      );
    }

    const continut = {
      referintaSalariat: { $type: 'referinta', id: contract.employeeId },
      cor: { cod: corCod, versiune: opts?.corVersiune ?? 10 },
      dataConsemnare: new Date().toISOString(),
      dataContract: (contract.signedAt || contract.createdAt).toISOString(),
      dataInceputContract: contract.startDate.toISOString(),
      ...(contract.endDate ? { dataSfarsitContract: contract.endDate.toISOString() } : {}),
      numarContract: contract.id.slice(-8),
      radiat: false,
      salariu: Number(contract.salary),
      nivelStudii: 'MG',
      stareCurenta: {},
      timpMunca: {
        norma: contract.workHours >= 40 ? 'NormaIntreaga840' : 'FractiuneNorma',
        durata: contract.workHours,
        intervalTimp: 'OrePeZi',
        repartizare: 'OreDeZi',
        repartizareMunca: 'Zilnic',
      },
      tipContract: 'ContractIndividualMunca',
      tipDurata: contract.endDate ? 'Determinata' : 'Nedeterminata',
    };

    const result = await this.submitContractOperation('AdaugareContract', continut);

    await this.prisma.hRContract.update({
      where: { id: contractId },
      data: {
        revisalSubmitted: result.submitted,
        revisalId: result.messageId,
        revisalStatus: result.submitted ? 'REGES_SUBMITTED' : `REGES_ERROR_${result.httpStatus}`,
      },
    });
    return result;
  }

  // --- async replies -------------------------------------------------------

  async pollMessage(consumerId = 'documentiulia'): Promise<any> {
    const { status, body } = await this.post(`/api/Notificare/PollMessage?consumerId=${encodeURIComponent(consumerId)}`, {});
    return { httpStatus: status, message: body };
  }

  async commitRead(consumerId = 'documentiulia'): Promise<any> {
    const { status, body } = await this.post(`/api/Notificare/CommitRead?consumerId=${encodeURIComponent(consumerId)}`, {});
    return { httpStatus: status, message: body };
  }

  async getNomenclator(tip = 'toate'): Promise<any> {
    const token = await this.getToken();
    const res = await fetch(`${this.apiUrl}/api/Nomenclator?tip=${encodeURIComponent(tip)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return { httpStatus: res.status, body: await res.json().catch(() => null) };
  }

  // --- statutory deadline (HG 295/2025) ------------------------------------

  /** Registration deadline: the CALENDAR day before the start date, 23:59:59 local. */
  registrationDeadline(startDate: Date): Date {
    const d = new Date(startDate);
    d.setDate(d.getDate() - 1);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  isRegistrationOverdue(startDate: Date, now: Date = new Date()): boolean {
    return now > this.registrationDeadline(startDate);
  }

  /**
   * Contracts approaching or past the transmission deadline without a REGES
   * submission — the alert feed (fine exposure: 20,000 lei/person, capped
   * 200,000 lei cumulative).
   */
  async deadlineAlerts(userId: string, now: Date = new Date()) {
    const horizon = new Date(now);
    horizon.setDate(horizon.getDate() + 3);
    const contracts = await this.prisma.hRContract.findMany({
      where: {
        userId,
        revisalSubmitted: false,
        status: { notIn: ['TERMINATED', 'EXPIRED'] as any },
        startDate: { lte: horizon },
      },
      include: { employee: { select: { firstName: true, lastName: true } } },
      orderBy: { startDate: 'asc' },
    });
    return contracts.map((c) => {
      const deadline = this.registrationDeadline(c.startDate);
      return {
        contractId: c.id,
        employee: `${c.employee?.firstName ?? ''} ${c.employee?.lastName ?? ''}`.trim(),
        startDate: c.startDate,
        transmissionDeadline: deadline,
        overdue: now > deadline,
        severity: now > deadline ? 'OVERDUE' : 'DUE',
        fineRisk: now > deadline ? '20.000 lei/persoană (HG 295/2025)' : undefined,
      };
    });
  }
}
