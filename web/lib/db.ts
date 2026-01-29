import { PrismaClient } from '@prisma/client';

// Prisma Client Setup - Forced reload
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// Ensure we don't use a stale client in development
export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: ['query', 'error', 'warn'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  password?: string; // Hashed, optional when returning to client
  email?: string | null;
  phone?: string | null;
  role: UserRole;
  created_at: string;
}

export async function findUserByIdentifier(identifier: string): Promise<User | null> {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: identifier },
        { email: identifier },
        { phone: identifier }
      ]
    }
  });
  
  if (!user) return null;
  
  return {
      id: user.id,
      username: user.username,
      password: user.password,
      email: user.email,
      phone: user.phone,
      role: user.role as UserRole,
      created_at: user.createdAt.toISOString()
  };
}

export async function findUserById(id: string): Promise<User | null> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return null;
  
  return {
      id: user.id,
      username: user.username,
      password: user.password,
      email: user.email,
      phone: user.phone,
      role: user.role as UserRole,
      created_at: user.createdAt.toISOString()
  };
}

export async function checkUserConflict(username: string, email?: string, phone?: string): Promise<boolean> {
  const orConditions: any[] = [{ username }];
  if (email) orConditions.push({ email });
  if (phone) orConditions.push({ phone });
  
  const count = await prisma.user.count({
    where: {
      OR: orConditions
    }
  });
  return count > 0;
}

export async function createUser(user: User): Promise<User> {
  const created = await prisma.user.create({
    data: {
      id: user.id,
      username: user.username,
      password: user.password!,
      email: user.email,
      phone: user.phone,
      role: user.role,
      createdAt: user.created_at ? new Date(user.created_at) : undefined
    }
  });
  
  return {
      id: created.id,
      username: created.username,
      password: created.password,
      email: created.email,
      phone: created.phone,
      role: created.role as UserRole,
      created_at: created.createdAt.toISOString()
  };
}
