import { Injectable } from '@nestjs/common';
import { argon2id, hash, verify } from 'argon2';

const OPTIONS = { type: argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,p=1,t=2$EU41zgzap+w6sNbO7pI+2A$OnDHBbLbgotRGIvC13VTn6mMNL7k5hzB3VOln45T3b0';

@Injectable()
export class PasswordService {
  hash(password: string): Promise<string> {
    return hash(password, OPTIONS);
  }

  verify(storedHash: string | null | undefined, password: string): Promise<boolean> {
    return verify(storedHash ?? DUMMY_HASH, password).catch(() => false);
  }
}
