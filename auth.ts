import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { User } from './app/lib/definitions';
import { sql } from '@vercel/postgres';
import bcrypt from 'bcrypt';

async function getUser(email: string): Promise<User | undefined> {
  try {
    const user = await sql<User>`SELECT * FROM users WHERE email=${email}`;
    return user.rows[0];
  } catch (error) {
    console.error('Failed fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}

export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({
            email: z.string().email(),
            password: z.string().min(6),
          })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          console.log('[auth.ts] - parsed success');
          const { email, password } = parsedCredentials.data;
          console.log(`[auth.ts] - parsed success ${email} ${password}`);
          const user = await getUser(email);
          if (!user) {
            console.log('HERE??');
            return null;
          }

          console.log(`[auth.ts] - users ${user.email} ${user.password}`);
          const passwordsMatch = await bcrypt.compare(password, user.password);

          if (passwordsMatch) {
            console.log(`[auth.ts] - users matched`);
            return user;
          }
        }

        console.log('Invalid credentials');
        return null;
      },
    }),
  ],
});