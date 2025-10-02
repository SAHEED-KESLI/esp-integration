import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { IntegrationsService } from './integrations.service';
import { Console } from 'node:console';

@Controller('api/integrations/esp')
export class IntegrationsController {
  constructor(private readonly svc: IntegrationsService) {}

  @Post()
  async createAndValidate(@Body() body: CreateIntegrationDto) {
    try {
      // console.log(body);

      const result = await this.svc.createAndValidateIntegration(body);
      return result;
    } catch (err) {
      // err may be HttpException already; rethrow or wrap
      if (err instanceof HttpException) throw err;
      throw new HttpException(
        err.message || 'Integration error',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // GET /api/integrations/esp/lists?provider=MAILCHIMP&integrationId=<id>
  @Get('lists')
  async lists(
    @Query('provider') provider: string,
    @Query('integrationId') integrationId?: string,
  ) {
    try {
      // console.log(provider, integrationId);
      return await this.svc.getLists(provider as any, integrationId);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(
        err.message || 'Fetch lists error',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
