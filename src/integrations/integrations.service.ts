import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios, { AxiosError } from 'axios';
import { CreateIntegrationDto, Provider } from './dto/create-integration.dto';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);
  private readonly AXIOS_TIMEOUT = 10000; // 10s

  constructor(private prisma: PrismaService) {}

  async createAndValidateIntegration(dto: CreateIntegrationDto) {
    const saved = await this.prisma.integration.create({
      data: { provider: dto.provider, apiKey: dto.apiKey },
    });

    try {
      let meta: any;
      if (dto.provider === Provider.MAILCHIMP) {
        meta = await this.validateMailchimpKey(dto.apiKey);
      } else if (dto.provider === Provider.GETRESPONSE) {
        meta = await this.validateGetResponseKey(dto.apiKey);
      } else {
        throw new HttpException('Unsupported provider', HttpStatus.BAD_REQUEST);
      }

      const updated = await this.prisma.integration.update({
        where: { id: saved.id },
        data: { isValid: true, validatedAt: new Date(), meta },
      });
      return { message: `${dto.provider} validated`, integration: updated };
    } catch (err) {
      const msg = this._mapErrorToMessage(err);
      await this.prisma.integration.update({
        where: { id: saved.id },
        data: { isValid: false, meta: { error: msg } },
      });
      // If mapped to HttpException, throw; else throw generic unauthorized
      if (err instanceof HttpException) throw err;
      throw new HttpException(msg, HttpStatus.UNAUTHORIZED);
    }
  }

  async getLists(provider: Provider | string, integrationId?: string) {
    let integration;
    if (integrationId) {
      integration = await this.prisma.integration.findUnique({
        where: { id: integrationId },
      });
    } else {
      integration = await this.prisma.integration.findFirst({
        where: { provider: provider as any, isValid: true },
        orderBy: { validatedAt: 'desc' },
      });
    }
    if (!integration)
      throw new HttpException('Integration not found', HttpStatus.NOT_FOUND);

    if (
      provider === Provider.MAILCHIMP ||
      integration.provider === Provider.MAILCHIMP
    ) {
      return this._fetchMailchimpLists(integration.apiKey);
    } else if (
      provider === Provider.GETRESPONSE ||
      integration.provider === Provider.GETRESPONSE
    ) {
      return this._fetchGetResponseLists(integration.apiKey);
    } else {
      throw new HttpException('Unsupported provider', HttpStatus.BAD_REQUEST);
    }
  }

  // ---------- Mailchimp ----------
  private async validateMailchimpKey(apiKey: string) {
    const parts = apiKey.split('-');
    const dc = parts.length > 1 ? parts.pop() : null;
    if (!dc)
      throw new HttpException(
        'Invalid Mailchimp key format (no datacenter)',
        HttpStatus.BAD_REQUEST,
      );

    const base = `https://${dc}.api.mailchimp.com/3.0`;
    const url = `${base}/`;

    const authHeader =
      'Basic ' + Buffer.from(`anystring:${apiKey}`).toString('base64');
    const headers = { Authorization: authHeader, Accept: 'application/json' };

    const res = await this.tryAxiosGet(url, { headers });
    // return trimmed meta
    return {
      datacenter: dc,
      account_id: res.data?.account_id ?? null,
      raw: res.data,
    };
  }

  private async _fetchMailchimpLists(apiKey: string) {
    const dc = apiKey.split('-').pop();
    if (!dc)
      throw new HttpException(
        'Invalid Mailchimp key format (no datacenter)',
        HttpStatus.BAD_REQUEST,
      );

    const base = `https://${dc}.api.mailchimp.com/3.0`;
    const headers = {
      Authorization:
        'Basic ' + Buffer.from(`anystring:${apiKey}`).toString('base64'),
    };

    const res = await this.tryAxiosGet(`${base}/lists?count=1000`, { headers });
    return { total: res.data.total_items, lists: res.data.lists };
  }

  // ---------- GetResponse ----------
  private async validateGetResponseKey(apiKey: string) {
    const base = `https://api.getresponse.com/v3`;
    const headers = {
      'X-Auth-Token': `api-key ${apiKey}`,
      Accept: 'application/json',
    };
    const res = await this.tryAxiosGet(`${base}/accounts`, { headers });
    return { account: res.data, raw: res.data };
  }

  private async _fetchGetResponseLists(apiKey: string) {
    const base = `https://api.getresponse.com/v3`;
    const headers = {
      'X-Auth-Token': `api-key ${apiKey}`,
      Accept: 'application/json',
    };

    const res = await this.tryAxiosGet(`${base}/campaigns`, { headers });
    return {
      total: Array.isArray(res.data) ? res.data.length : null,
      campaigns: res.data,
    };
  }

  // ---------- Axios helpers ----------
  private async tryAxiosGet(url: string, opts: any, attempts = 2) {
    let lastErr: any = null;
    for (let i = 0; i < attempts; i++) {
      try {
        return await axios.get(url, { timeout: this.AXIOS_TIMEOUT, ...opts });
      } catch (err) {
        lastErr = err;
        // Retry only on network errors or 5xx
        if (
          err &&
          err.isAxiosError &&
          (!err.response || (err.response && err.response.status >= 500))
        ) {
          // small delay on retry
          await this.sleep(300 * (i + 1));
          continue;
        }
        // For other errors (4xx) break immediately
        break;
      }
    }
    // after attempts, map to proper HttpException so global filter handles it
    throw this._mapAxiosErrorToHttpException(lastErr);
  }

  private _mapAxiosErrorToHttpException(err: any): HttpException {
    if (!err || !err.isAxiosError) {
      return new HttpException('Unknown network error', HttpStatus.BAD_GATEWAY);
    }
    const axiosErr = err as AxiosError;
    if (axiosErr.response) {
      const status = axiosErr.response.status;
      const data = axiosErr.response.data;
      // Rate limit
      if (status === 429)
        return new HttpException(
          { message: 'Rate limit from provider', details: data },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      if (status === 401 || status === 403)
        return new HttpException(
          { message: 'Invalid credentials', details: data },
          HttpStatus.UNAUTHORIZED,
        );
      if (status >= 500)
        return new HttpException(
          { message: 'Provider error', details: data },
          HttpStatus.BAD_GATEWAY,
        );
      return new HttpException(
        { message: data || axiosErr.response.statusText },
        status,
      );
    }
    if (axiosErr.code === 'ECONNABORTED') {
      return new HttpException(
        'Timeout connecting to provider',
        HttpStatus.GATEWAY_TIMEOUT,
      );
    }
    return new HttpException(
      'Network error contacting provider',
      HttpStatus.BAD_GATEWAY,
    );
  }

  private _mapErrorToMessage(err: any) {
    if (err instanceof HttpException) {
      return err.getResponse && typeof err.getResponse === 'object'
        ? err.getResponse()
        : err.message;
    }
    if (err && err.isAxiosError) {
      return err.message || 'Provider network error';
    }
    return err?.message || String(err);
  }

  private sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
  }
}
