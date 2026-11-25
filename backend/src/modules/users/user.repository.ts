import { prisma } from '../../lib/prisma';

// Fields that are safe to send to the client (never passwordHash).
const profileSelect = {
  id: true,
  name: true,
  email: true,
  memberships: {
    select: {
      role: true,
      organization: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { createdAt: 'asc' },
  },
} as const;

export const userRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findProfileById(id: string) {
    return prisma.user.findUnique({ where: { id }, select: profileSelect });
  },

  // One nested write = one transaction: user, organization and OWNER membership
  // are created together, or nothing is created.
  createWithOrganization(data: {
    name: string;
    email: string;
    passwordHash: string;
    organizationName: string;
    organizationSlug: string;
  }) {
    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        memberships: {
          create: {
            role: 'OWNER',
            organization: { create: { name: data.organizationName, slug: data.organizationSlug } },
          },
        },
      },
      select: profileSelect,
    });
  },
};

export type UserProfileRecord = NonNullable<
  Awaited<ReturnType<typeof userRepository.findProfileById>>
>;
