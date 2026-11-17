const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  await prisma.ticketPurchase.deleteMany();
  await prisma.ticketType.deleteMany();
  await prisma.pollResponse.deleteMany();
  await prisma.pollAnswerOption.deleteMany();
  await prisma.pollQuestion.deleteMany();
  await prisma.poll.deleteMany();
  await prisma.photoComment.deleteMany();
  await prisma.photo.deleteMany();
  await prisma.photoAlbum.deleteMany();
  await prisma.messageComment.deleteMany();
  await prisma.message.deleteMany();
  await prisma.discussionThread.deleteMany();
  await prisma.shoppingListItem.deleteMany();
  await prisma.carpool.deleteMany();
  await prisma.eventParticipant.deleteMany();
  await prisma.eventOrganizer.deleteMany();
  await prisma.event.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.groupAdmin.deleteMany();
  await prisma.group.deleteMany();
  await prisma.user.deleteMany();

  const alice = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      firstName: 'Alice',
      lastName: 'Martin',
      bio: 'Organisatrice d\'événements',
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      firstName: 'Bob',
      lastName: 'Dupont',
    },
  });

  const claire = await prisma.user.create({
    data: {
      email: 'claire@example.com',
      firstName: 'Claire',
      lastName: 'Bernard',
    },
  });

  const group = await prisma.group.create({
    data: {
      name: 'Amis de Paris',
      description: 'Groupe pour organiser des sorties',
      type: 'PRIVATE',
      allowMembersToPublish: true,
      allowMembersToCreateEvents: true,
      admins: { create: [{ userId: alice.id }] },
      members: {
        create: [{ userId: alice.id }, { userId: bob.id }, { userId: claire.id }],
      },
    },
  });

  const event = await prisma.event.create({
    data: {
      name: 'Soirée BBQ',
      description: 'Barbecue entre amis',
      startDate: new Date('2026-07-15T18:00:00.000Z'),
      endDate: new Date('2026-07-15T23:00:00.000Z'),
      location: 'Parc de la Villette, Paris',
      visibility: 'PUBLIC',
      shoppingListEnabled: true,
      carpoolingEnabled: true,
      ticketingEnabled: true,
      groupId: group.id,
      organizers: { create: [{ userId: alice.id }] },
      participants: {
        create: [{ userId: alice.id }, { userId: bob.id }, { userId: claire.id }],
      },
    },
  });

  console.log('Seed OK');
  console.log({ alice: alice.id, bob: bob.id, claire: claire.id, group: group.id, event: event.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
