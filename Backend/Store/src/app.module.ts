import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { StaffAuthModule } from './auth/staff-auth/staff-auth.module';
import { UserModule } from './user/user.module';
import { ChatModule } from './chat/chat.module';
import { ScheduleModule } from '@nestjs/schedule';
import { InfortisaModule } from './infortisa/infortisa.module';
import { PrismaService } from './common/prisma.service';
import { HomepageSectionsModule } from './homepage/homepage-sections.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    AuthModule,
    AdminModule,
    StaffAuthModule,
    InfortisaModule,
    UserModule,
    ChatModule,
    HomepageSectionsModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
