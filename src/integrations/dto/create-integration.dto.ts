import { IsEnum, IsString, Length } from 'class-validator';

export enum Provider {
  MAILCHIMP = 'MAILCHIMP',
  GETRESPONSE = 'GETRESPONSE',
}

export class CreateIntegrationDto {
  @IsEnum(Provider, { message: 'provider must be MAILCHIMP or GETRESPONSE' })
  provider: Provider;

  // Mailchimp keys are long but vary; 20+ char minimum is safe
  @IsString()
  @Length(10, 2000, { message: 'apiKey looks too short or invalid' })
  apiKey: string;
}
