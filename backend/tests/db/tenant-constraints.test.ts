import { prisma } from '../../src/lib/prisma';

// Database-level guarantees that back up the multi-tenancy rules in the services.

async function resetDatabase() {
  await prisma.$transaction([
    prisma.task.deleteMany(),
    prisma.project.deleteMany(),
    prisma.client.deleteMany(),
    prisma.organizationMember.deleteMany(),
    prisma.organization.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

beforeEach(resetDatabase);

afterAll(async () => {
  await resetDatabase();
  await prisma.$disconnect();
});

describe('task and project organization', () => {
  it('rejects a task whose project belongs to another organization', async () => {
    const orgA = await prisma.organization.create({ data: { name: 'Org A', slug: 'org-a' } });
    const orgB = await prisma.organization.create({ data: { name: 'Org B', slug: 'org-b' } });
    const projectOfB = await prisma.project.create({
      data: { organizationId: orgB.id, name: 'B project' },
    });

    await expect(
      prisma.task.create({
        data: { organizationId: orgA.id, projectId: projectOfB.id, title: 'Sneaky task' },
      }),
    ).rejects.toMatchObject({ code: 'P2003' }); // foreign key violation

    expect(await prisma.task.count()).toBe(0);
  });

  it('accepts a task whose project belongs to the same organization', async () => {
    const org = await prisma.organization.create({ data: { name: 'Org', slug: 'org' } });
    const project = await prisma.project.create({
      data: { organizationId: org.id, name: 'Project' },
    });

    const task = await prisma.task.create({
      data: { organizationId: org.id, projectId: project.id, title: 'Valid task' },
    });

    expect(task).toMatchObject({ status: 'TODO', priority: 'MEDIUM', position: 0 });
  });
});

describe('organization membership', () => {
  it('does not allow the same user to join the same organization twice', async () => {
    const org = await prisma.organization.create({ data: { name: 'Org', slug: 'org' } });
    const user = await prisma.user.create({
      data: { name: 'Ana', email: 'ana@example.com', passwordHash: 'not-a-real-hash' },
    });

    await prisma.organizationMember.create({ data: { organizationId: org.id, userId: user.id } });

    await expect(
      prisma.organizationMember.create({ data: { organizationId: org.id, userId: user.id } }),
    ).rejects.toMatchObject({ code: 'P2002' }); // unique constraint violation
  });
});
