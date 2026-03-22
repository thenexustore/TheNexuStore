import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    const user = process.env.MAIL_USER?.trim();
    const pass = process.env.MAIL_PASS?.trim();

    if (!user || !pass) {
      throw new Error(
        'Mail credentials are not configured. Set MAIL_USER and MAIL_PASS.',
      );
    }

    const host = process.env.MAIL_HOST?.trim() || 'smtp.gmail.com';
    const parsedPort = Number(process.env.MAIL_PORT ?? 465);
    const port = Number.isFinite(parsedPort) ? parsedPort : 465;
    const secureFlag = process.env.MAIL_SECURE?.trim().toLowerCase();
    const secure =
      secureFlag === undefined
        ? port === 465
        : ['true', '1', 'yes', 'on'].includes(secureFlag);

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });

    this.logger.log(
      `Mail transport configured (${host}:${port}, secure=${secure})`,
    );
    return this.transporter;
  }

  private getFromAddress(): string {
    const fromAddress = (
      process.env.MAIL_FROM ||
      process.env.MAIL_USER ||
      ''
    ).trim();
    if (!fromAddress) {
      throw new Error(
        'Mail sender is not configured. Set MAIL_FROM or MAIL_USER.',
      );
    }

    const fromName = (process.env.MAIL_FROM_NAME || 'NEXUS').trim();
    return `"${fromName}" <${fromAddress}>`;
  }

  async sendOtp(email: string, otp: string) {
    await this.getTransporter().sendMail({
      from: this.getFromAddress(),
      to: email,
      subject: 'Your OTP Code',
      html: `
        <h2>Your OTP</h2>
        <p><b>${otp}</b></p>
        <p>Valid for 10 minutes</p>
      `,
    });
  }

  async sendOrderConfirmation(
    email: string,
    orderNumber: string,
    trackingUrl: string,
  ) {
    await this.getTransporter().sendMail({
      from: this.getFromAddress(),
      to: email,
      subject: `Order ${orderNumber} confirmed`,
      html: `
        <h2>Thank you for your order!</h2>
        <p>Your order <b>${orderNumber}</b> has been received.</p>
        <p>You can track your order at any time using the link below:</p>
        <p><a href="${trackingUrl}" target="_blank" rel="noopener noreferrer">${trackingUrl}</a></p>
        <p>If you did not place this order, please contact our support team immediately.</p>
      `,
    });
  }

  async sendBillingDocument(
    email: string,
    subject: string,
    companyName: string,
    docTypeLabel: string,
    docRef: string,
    pdfBuffer: Buffer,
  ) {
    await this.getTransporter().sendMail({
      from: this.getFromAddress(),
      to: email,
      subject,
      html: `
        <p>Estimado/a cliente,</p>
        <p>Adjuntamos ${docTypeLabel.toLowerCase()} <b>${docRef}</b> emitida por <b>${companyName}</b>.</p>
        <p>Si tiene alguna pregunta, no dude en ponerse en contacto con nosotros.</p>
        <br/>
        <p>Atentamente,<br/>${companyName}</p>
      `,
      attachments: [
        {
          filename: `${docRef}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });
  }
}
