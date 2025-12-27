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
}
