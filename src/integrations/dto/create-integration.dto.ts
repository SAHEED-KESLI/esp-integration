import { IsEnum, IsString } from 'class-validator';

export enum Provider {
  MAILCHIMP = 'MAILCHIMP',
  GETRESPONSE = 'GETRESPONSE',
}

export class CreateIntegrationDto {
  @IsEnum(Provider)
  provider: Provider;

  @IsString()
  apiKey: string;
}
