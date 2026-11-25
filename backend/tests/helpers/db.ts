import { prisma } from '../../src/lib/prisma';

// Wipes every table of the TEST database (setup-env.ts guarantees it is the _test one),
// deleting children before parents.
export async function resetDatabase(): Promise<void> {
  await prisma.$transaction([
    prisma.refreshToken.deleteMany(),
    prisma.task.deleteMany(),
    prisma.project.deleteMany(),
    prisma.client.deleteMany(),
    prisma.organizationMember.deleteMany(),
    prisma.organization.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}
