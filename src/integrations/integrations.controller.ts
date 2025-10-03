import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CreateIntegrationDto, Provider } from './dto/create-integration.dto';
import { IntegrationsService } from './integrations.service';

@Controller('integrations/esp')
export class IntegrationsController {
  constructor(private readonly svc: IntegrationsService) {}

  @Post()
  async createAndValidate(@Body() body: CreateIntegrationDto) {
    return this.svc.createAndValidateIntegration(body);
  }

  @Get('lists')
  async lists(
    @Query('provider') provider: Provider,
    @Query('integrationId') integrationId?: string,
  ) {
    return this.svc.getLists(provider as Provider, integrationId);
  }
}
