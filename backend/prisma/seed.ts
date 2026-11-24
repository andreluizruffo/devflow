import bcrypt from 'bcryptjs';
import { env } from '../src/config/env';
import { prisma } from '../src/lib/prisma';

// Demo data for local development and the public demo. Run with: npm run db:seed
// Two organizations on purpose: they make cross-organization isolation visible.
const DEMO_PASSWORD = 'devflow123';

async function main() {
  if (env.NODE_ENV === 'production') {
    throw new Error('Refusing to wipe and seed a production database.');
  }

  // Start from a clean state, deleting children before parents.
  await prisma.$transaction([
    prisma.task.deleteMany(),
    prisma.project.deleteMany(),
    prisma.client.deleteMany(),
    prisma.organizationMember.deleteMany(),
    prisma.organization.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const demo = await prisma.user.create({
    data: { name: 'Demo User', email: 'demo@devflow.dev', passwordHash },
  });
  const teammate = await prisma.user.create({
    data: { name: 'Maria Teammate', email: 'maria@devflow.dev', passwordHash },
  });
  const outsider = await prisma.user.create({
    data: { name: 'Owen Outsider', email: 'owen@northwind.dev', passwordHash },
  });

  const studio = await prisma.organization.create({
    data: {
      name: 'Pixel Studio',
      slug: 'pixel-studio',
      members: {
        create: [
          { userId: demo.id, role: 'OWNER' },
          { userId: teammate.id, role: 'MEMBER' },
        ],
      },
    },
  });

  const northwind = await prisma.organization.create({
    data: {
      name: 'Northwind Agency',
      slug: 'northwind-agency',
      members: { create: [{ userId: outsider.id, role: 'OWNER' }] },
    },
  });

  const bakery = await prisma.client.create({
    data: {
      organizationId: studio.id,
      name: 'Aurora Bakery',
      email: 'hello@aurorabakery.example',
      company: 'Aurora Bakery Ltd.',
    },
  });
  const gym = await prisma.client.create({
    data: { organizationId: studio.id, name: 'Lumen Fitness', company: 'Lumen Fitness' },
  });
  const lawFirm = await prisma.client.create({
    data: { organizationId: northwind.id, name: 'Harbor Legal' },
  });

  const website = await prisma.project.create({
    data: {
      organizationId: studio.id,
      clientId: bakery.id,
      name: 'Aurora website redesign',
      description: 'New institutional website with online ordering.',
      status: 'ACTIVE',
      budget: '4500.00',
      startDate: new Date('2026-11-02'),
      dueDate: new Date('2026-12-18'),
    },
  });
  const bookingApp = await prisma.project.create({
    data: {
      organizationId: studio.id,
      clientId: gym.id,
      name: 'Lumen class booking app',
      status: 'PLANNING',
      budget: '12000.00',
      dueDate: new Date('2027-02-26'),
    },
  });
  const portal = await prisma.project.create({
    data: {
      organizationId: northwind.id,
      clientId: lawFirm.id,
      name: 'Harbor client portal',
      status: 'ACTIVE',
    },
  });

  await prisma.task.createMany({
    data: [
      {
        organizationId: studio.id,
        projectId: website.id,
        title: 'Approve homepage wireframe',
        status: 'DONE',
        priority: 'HIGH',
        assigneeId: demo.id,
        position: 0,
      },
      {
        organizationId: studio.id,
        projectId: website.id,
        title: 'Build product catalog page',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        assigneeId: teammate.id,
        position: 0,
      },
      {
        organizationId: studio.id,
        projectId: website.id,
        title: 'Integrate online payment',
        status: 'TODO',
        priority: 'URGENT',
        dueDate: new Date('2026-12-10'),
        position: 0,
      },
      {
        organizationId: studio.id,
        projectId: website.id,
        title: 'Write SEO meta descriptions',
        status: 'TODO',
        priority: 'LOW',
        position: 1,
      },
      {
        organizationId: studio.id,
        projectId: bookingApp.id,
        title: 'Kickoff meeting with client',
        status: 'TODO',
        priority: 'MEDIUM',
        assigneeId: demo.id,
        position: 0,
      },
      {
        organizationId: northwind.id,
        projectId: portal.id,
        title: 'Set up document upload',
        status: 'IN_REVIEW',
        priority: 'MEDIUM',
        assigneeId: outsider.id,
        position: 0,
      },
    ],
  });

  console.log(
    `Seed complete: 3 users, 2 organizations, 3 clients, 3 projects, 6 tasks. ` +
      `Login: demo@devflow.dev / ${DEMO_PASSWORD}`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
