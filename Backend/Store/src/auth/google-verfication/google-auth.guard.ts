import {
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  canActivate(context: ExecutionContext) {
    const googleEnabled =
      Boolean(process.env.GOOGLE_CLIENT_ID) &&
      Boolean(process.env.GOOGLE_CLIENT_SECRET);

    if (!googleEnabled) {
      throw new ServiceUnavailableException(
        'Google OAuth is disabled in this environment.',
      );
    }

    return super.canActivate(context);
  }
}
