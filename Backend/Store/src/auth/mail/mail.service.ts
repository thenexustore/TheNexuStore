import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.MAIL_USER, 
      pass: process.env.MAIL_PASS,
    },
  });

  async sendOtp(email: string, otp: string) {
    await this.transporter.sendMail({
      from: `"NEXUS" <${process.env.MAIL_USER}>`,
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
    await this.transporter.sendMail({
      from: `"NEXUS" <${process.env.MAIL_USER}>`,
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
}
