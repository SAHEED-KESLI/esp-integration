import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios, { AxiosError } from 'axios';
import { CreateIntegrationDto, Provider } from './dto/create-integration.dto';

@Injectable()
export class IntegrationsService {
  constructor(private prisma: PrismaService) {}

  async createAndValidateIntegration(dto: CreateIntegrationDto) {
    // Save a record first (isValid=false)
    const saved = await this.prisma.integration.create({
      data: {
        provider: dto.provider,
        apiKey: dto.apiKey,
      },
    });

    // Validate depending on provider
    try {
      if (dto.provider === Provider.MAILCHIMP) {
        const meta = await this.validateMailchimpKey(dto.apiKey);
        const updated = await this.prisma.integration.update({
          where: { id: saved.id },
          data: { isValid: true, validatedAt: new Date(), meta },
        });
        return { message: 'Mailchimp validated', integration: updated };
      } else if (dto.provider === Provider.GETRESPONSE) {
        const meta = await this.validateGetResponseKey(dto.apiKey);
        const updated = await this.prisma.integration.update({
          where: { id: saved.id },
          data: { isValid: true, validatedAt: new Date(), meta },
        });
        return { message: 'GetResponse validated', integration: updated };
      } else {
        throw new HttpException('Unsupported provider', HttpStatus.BAD_REQUEST);
      }
    } catch (err) {
      // Map axios errors to readable response and leave isValid=false
      const msg = this._formatAxiosError(err);
      await this.prisma.integration.update({
        where: { id: saved.id },
        data: { isValid: false, meta: { error: msg } },
      });
      throw new HttpException(msg, HttpStatus.UNAUTHORIZED);
    }
  }

  async getLists(provider: Provider | string, integrationId?: string) {
    // load integration (if id provided), else fetch latest valid for that provider
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

  // -----------------------
  // Mailchimp helpers
  // -----------------------
  private async validateMailchimpKey(apiKey: string) {
    // Mailchimp: datacenter after last '-'
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

    const res = await axios.get(url, {
      headers: { Authorization: authHeader },
      timeout: 8000,
    });
    // res.data contains account metadata. We'll store datacenter + account id/info
    return { datacenter: dc, account: res.data };
  }

  private async _fetchMailchimpLists(apiKey: string) {
    const dc = apiKey.split('-').pop();
    if (!dc)
      throw new HttpException(
        'Invalid Mailchimp key format (no datacenter)',
        HttpStatus.BAD_REQUEST,
      );
    const base = `https://${dc}.api.mailchimp.com/3.0`;
    const authHeader =
      'Basic ' + Buffer.from(`anystring:${apiKey}`).toString('base64');

    // Simple fetch first page; for production, implement pagination.
    try {
      const res = await axios.get(`${base}/lists?count=1000`, {
        headers: { Authorization: authHeader },
        timeout: 10000,
      });
      return { total: res.data.total_items, lists: res.data.lists };
    } catch (err) {
      throw err;
    }
  }

  // -----------------------
  // GetResponse helpers
  // -----------------------
  private async validateGetResponseKey(apiKey: string) {
    const base = `https://api.getresponse.com/v3`;
    const headers = { 'X-Auth-Token': `api-key ${apiKey}` };

    const res = await axios.get(`${base}/accounts`, { headers, timeout: 8000 });
    // /accounts endpoint returns info about account(s) (docs mention /v3/accounts)
    return { account: res.data };
  }

  private async _fetchGetResponseLists(apiKey: string) {
    const base = `https://api.getresponse.com/v3`;
    const headers = { 'X-Auth-Token': `api-key ${apiKey}` };

    // campaigns are GetResponse "lists"
    const res = await axios.get(`${base}/campaigns`, {
      headers,
      timeout: 10000,
    });
    return {
      total: Array.isArray(res.data) ? res.data.length : null,
      campaigns: res.data,
    };
  }

  // -----------------------
  // error formatting
  // -----------------------
  private _formatAxiosError(err: any) {
    if (!err) return 'Unknown error';
    if (err.isAxiosError) {
      const e = err as AxiosError;
      if (e.response) {
        // provider returned an error
        const status = e.response.status;
        const data = e.response.data;
        return `Provider error ${status}: ${JSON.stringify(data)}`;
      }
      if (e.code === 'ECONNABORTED')
        return 'Timeout while connecting to provider';
      return `Network error: ${e.message}`;
    }
    return err.message || String(err);
  }
}
