import { Injectable } from '@nestjs/common';
import fs from 'node:fs/promises';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import Handlebars from 'handlebars';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { AllConfigType } from '../config/config.type';
import MailerCustomLogger from './logger/mailer-custom-logger';

@Injectable()
export class MailerService {
  private readonly transporter: nodemailer.Transporter;
  private readonly templates = new Map<
    string,
    Handlebars.TemplateDelegate<Record<string, unknown>>
  >();

  constructor(
    private readonly configService: ConfigService<AllConfigType>,
    @InjectPinoLogger(MailerService.name)
    private readonly logger: PinoLogger,
  ) {
    this.transporter = nodemailer.createTransport({
      host: configService.get('mail.host', { infer: true }),
      port: configService.get('mail.port', { infer: true }),
      ignoreTLS: configService.get('mail.ignoreTLS', { infer: true }),
      secure: configService.get('mail.secure', { infer: true }),
      requireTLS: configService.get('mail.requireTLS', { infer: true }),
      auth: {
        user: configService.get('mail.user', { infer: true }),
        pass: configService.get('mail.password', { infer: true }),
      },
      logger: MailerCustomLogger.getInstance(),
    });
  }

  async sendMail({
    templatePath,
    context,
    ...mailOptions
  }: nodemailer.SendMailOptions & {
    templatePath: string;
    context: Record<string, unknown>;
  }): Promise<void> {
    let html: string | undefined;
    if (templatePath) {
      html = (await this.getTemplate(templatePath))(context);
    }

    const from = mailOptions.from
      ? mailOptions.from
      : `"${this.configService.get('mail.defaultName', { infer: true })}" <${this.configService.get('mail.defaultEmail', { infer: true })}>`;

    this.logger.debug(
      { subject: mailOptions.subject, template: templatePath },
      'Sending email',
    );

    try {
      await this.transporter.sendMail({
        ...mailOptions,
        from,
        html: mailOptions.html ? mailOptions.html : html,
      });
      this.logger.info({ subject: mailOptions.subject }, 'Email sent');
    } catch (err: unknown) {
      this.logger.error(
        { err, subject: mailOptions.subject },
        'Failed to send email',
      );
      throw err;
    }
  }

  private async getTemplate(
    templatePath: string,
  ): Promise<Handlebars.TemplateDelegate<Record<string, unknown>>> {
    let template = this.templates.get(templatePath);
    if (!template) {
      template = Handlebars.compile<Record<string, unknown>>(
        await fs.readFile(templatePath, 'utf-8'),
        { strict: true },
      );
      this.templates.set(templatePath, template);
    }
    return template;
  }
}
