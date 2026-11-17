const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/prisma');

async function createUser(overrides = {}) {
  const res = await request(app)
    .post('/api/users')
    .send({
      email: overrides.email || `user_${Date.now()}_${Math.random()}@test.com`,
      firstName: overrides.firstName || 'Jean',
      lastName: overrides.lastName || 'Test',
      bio: overrides.bio,
    });
  expect(res.status).toBe(201);
  return res.body;
}

describe('My Social Networks API', () => {
  let alice, bob, claire;

  beforeEach(async () => {
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

    alice = await createUser({ email: 'alice@test.com', firstName: 'Alice', lastName: 'A' });
    bob = await createUser({ email: 'bob@test.com', firstName: 'Bob', lastName: 'B' });
    claire = await createUser({ email: 'claire@test.com', firstName: 'Claire', lastName: 'C' });
  });

  describe('Utilisateurs', () => {
    test('liste les utilisateurs', async () => {
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(3);
    });

    test('refuse un email en double', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ email: 'alice@test.com', firstName: 'X', lastName: 'Y' });
      expect(res.status).toBe(409);
    });

    test('met à jour et supprime un utilisateur', async () => {
      const upd = await request(app)
        .put(`/api/users/${bob.id}`)
        .send({ bio: 'Hello' });
      expect(upd.status).toBe(200);
      expect(upd.body.bio).toBe('Hello');

      const del = await request(app).delete(`/api/users/${bob.id}`);
      expect(del.status).toBe(204);

      const get = await request(app).get(`/api/users/${bob.id}`);
      expect(get.status).toBe(404);
    });
  });

  describe('Groupes', () => {
    test('CRUD groupe + membres', async () => {
      const create = await request(app)
        .post('/api/groups')
        .send({
          name: 'Groupe Secret',
          description: 'Test',
          type: 'SECRET',
          allowMembersToPublish: true,
          allowMembersToCreateEvents: true,
          adminIds: [alice.id],
          memberIds: [bob.id],
        });
      expect(create.status).toBe(201);
      expect(create.body.admins).toHaveLength(1);
      expect(create.body.members.length).toBeGreaterThanOrEqual(2);

      const add = await request(app).post(`/api/groups/${create.body.id}/members/${claire.id}`);
      expect(add.status).toBe(201);

      const upd = await request(app)
        .put(`/api/groups/${create.body.id}`)
        .send({ name: 'Groupe Renommé' });
      expect(upd.body.name).toBe('Groupe Renommé');

      const delMember = await request(app).delete(
        `/api/groups/${create.body.id}/members/${claire.id}`
      );
      expect(delMember.status).toBe(204);

      const del = await request(app).delete(`/api/groups/${create.body.id}`);
      expect(del.status).toBe(204);
    });
  });

  describe('Événements', () => {
    test('CRUD événement avec organisateurs et participants', async () => {
      const create = await request(app)
        .post('/api/events')
        .send({
          name: 'Concert',
          description: 'Live',
          startDate: '2026-08-01T20:00:00.000Z',
          endDate: '2026-08-01T23:00:00.000Z',
          location: 'Paris',
          visibility: 'PUBLIC',
          shoppingListEnabled: true,
          carpoolingEnabled: true,
          ticketingEnabled: true,
          organizerIds: [alice.id],
          participantIds: [bob.id],
        });
      expect(create.status).toBe(201);
      expect(create.body.organizers[0].id).toBe(alice.id);
      expect(create.body.participants).toHaveLength(1);

      const addP = await request(app).post(
        `/api/events/${create.body.id}/participants/${claire.id}`
      );
      expect(addP.status).toBe(201);

      const list = await request(app).get('/api/events');
      expect(list.body.length).toBe(1);

      const del = await request(app).delete(`/api/events/${create.body.id}`);
      expect(del.status).toBe(204);
    });

    test('invite tous les membres du groupe', async () => {
      const group = await request(app)
        .post('/api/groups')
        .send({
          name: 'G1',
          type: 'PUBLIC',
          adminIds: [alice.id],
          memberIds: [bob.id, claire.id],
        });

      const event = await request(app)
        .post('/api/events')
        .send({
          name: 'Event groupe',
          startDate: '2026-09-01T10:00:00.000Z',
          endDate: '2026-09-01T12:00:00.000Z',
          organizerIds: [alice.id],
          groupId: group.body.id,
          inviteAllGroupMembers: true,
        });
      expect(event.status).toBe(201);
      expect(event.body.participants.length).toBe(3);
    });
  });

  describe('Fils de discussion', () => {
    test('lié à un groupe, messages et commentaires', async () => {
      const group = (
        await request(app)
          .post('/api/groups')
          .send({ name: 'G', adminIds: [alice.id], memberIds: [bob.id] })
      ).body;

      const bad = await request(app)
        .post('/api/discussions')
        .send({ title: 'Bad', groupId: group.id, eventId: 'fake' });
      expect(bad.status).toBe(400);

      const thread = (
        await request(app)
          .post('/api/discussions')
          .send({ title: 'Fil groupe', groupId: group.id })
      ).body;
      expect(thread.groupId).toBe(group.id);
      expect(thread.eventId).toBeNull();

      const msg = await request(app)
        .post(`/api/discussions/${thread.id}/messages`)
        .send({ content: 'Salut', authorId: bob.id });
      expect(msg.status).toBe(201);

      const comment = await request(app)
        .post(`/api/discussions/messages/${msg.body.id}/comments`)
        .send({ content: 'Réponse', authorId: alice.id });
      expect(comment.status).toBe(201);

      const outsider = await createUser({ email: 'out@test.com' });
      const forbidden = await request(app)
        .post(`/api/discussions/${thread.id}/messages`)
        .send({ content: 'Intrus', authorId: outsider.id });
      expect(forbidden.status).toBe(403);
    });

    test('lié à un événement uniquement', async () => {
      const event = (
        await request(app)
          .post('/api/events')
          .send({
            name: 'E',
            startDate: '2026-10-01T10:00:00.000Z',
            endDate: '2026-10-01T12:00:00.000Z',
            organizerIds: [alice.id],
            participantIds: [bob.id],
          })
      ).body;

      const thread = await request(app)
        .post('/api/discussions')
        .send({ title: 'Fil event', eventId: event.id });
      expect(thread.status).toBe(201);
      expect(thread.body.eventId).toBe(event.id);
      expect(thread.body.groupId).toBeNull();
    });
  });

  describe('Albums photo', () => {
    test('album, photos et commentaires', async () => {
      const event = (
        await request(app)
          .post('/api/events')
          .send({
            name: 'Photo event',
            startDate: '2026-11-01T10:00:00.000Z',
            endDate: '2026-11-01T12:00:00.000Z',
            organizerIds: [alice.id],
            participantIds: [bob.id],
          })
      ).body;

      const album = (
        await request(app)
          .post('/api/albums')
          .send({ name: 'Souvenirs', eventId: event.id })
      ).body;
      expect(album.eventId).toBe(event.id);

      const photo = await request(app)
        .post(`/api/albums/${album.id}/photos`)
        .send({ url: 'https://example.com/p.jpg', caption: 'Cool', authorId: bob.id });
      expect(photo.status).toBe(201);

      const comment = await request(app)
        .post(`/api/albums/photos/${photo.body.id}/comments`)
        .send({ content: 'Belle photo', authorId: alice.id });
      expect(comment.status).toBe(201);

      const outsider = await createUser({ email: 'photo-out@test.com' });
      const forbidden = await request(app)
        .post(`/api/albums/${album.id}/photos`)
        .send({ url: 'https://example.com/x.jpg', authorId: outsider.id });
      expect(forbidden.status).toBe(403);
    });
  });

  describe('Sondages', () => {
    test('création par organisateur et réponse unique par question', async () => {
      const event = (
        await request(app)
          .post('/api/events')
          .send({
            name: 'Poll event',
            startDate: '2026-12-01T10:00:00.000Z',
            endDate: '2026-12-01T12:00:00.000Z',
            organizerIds: [alice.id],
            participantIds: [bob.id],
          })
      ).body;

      const forbidden = await request(app)
        .post('/api/polls')
        .send({
          title: 'Menu',
          eventId: event.id,
          creatorId: bob.id,
          questions: [{ text: 'Plat ?', options: ['Pizza', 'Burger'] }],
        });
      expect(forbidden.status).toBe(403);

      const poll = await request(app)
        .post('/api/polls')
        .send({
          title: 'Menu',
          eventId: event.id,
          creatorId: alice.id,
          questions: [
            { text: 'Plat ?', options: ['Pizza', 'Burger'] },
            { text: 'Boisson ?', options: ['Eau', 'Soda'] },
          ],
        });
      expect(poll.status).toBe(201);
      expect(poll.body.questions).toHaveLength(2);

      const q1 = poll.body.questions[0];
      const q2 = poll.body.questions[1];

      const respond = await request(app)
        .post(`/api/polls/${poll.body.id}/respond`)
        .send({
          userId: bob.id,
          answers: [
            { questionId: q1.id, optionId: q1.options[0].id },
            { questionId: q2.id, optionId: q2.options[1].id },
          ],
        });
      expect(respond.status).toBe(200);
      expect(respond.body.questions[0].responses).toHaveLength(1);

      const change = await request(app)
        .post(`/api/polls/${poll.body.id}/respond`)
        .send({
          userId: bob.id,
          answers: [{ questionId: q1.id, optionId: q1.options[1].id }],
        });
      expect(change.status).toBe(200);
      expect(change.body.questions[0].responses).toHaveLength(1);
      expect(change.body.questions[0].responses[0].optionId).toBe(q1.options[1].id);
    });
  });

  describe('Billetterie', () => {
    test('types de billets et achat unique par personne', async () => {
      const event = (
        await request(app)
          .post('/api/events')
          .send({
            name: 'Public fest',
            startDate: '2027-01-01T10:00:00.000Z',
            endDate: '2027-01-01T22:00:00.000Z',
            visibility: 'PUBLIC',
            ticketingEnabled: true,
            organizerIds: [alice.id],
          })
      ).body;

      const type = await request(app)
        .post('/api/tickets/types')
        .send({
          name: 'VIP',
          amount: 49.9,
          quantityLimit: 2,
          eventId: event.id,
          organizerId: alice.id,
        });
      expect(type.status).toBe(201);

      const buy1 = await request(app)
        .post('/api/tickets/purchases')
        .send({
          ticketTypeId: type.body.id,
          firstName: 'Ext',
          lastName: 'User',
          address: '1 rue Test',
          email: 'ext@test.com',
        });
      expect(buy1.status).toBe(201);

      const buy2 = await request(app)
        .post('/api/tickets/purchases')
        .send({
          ticketTypeId: type.body.id,
          firstName: 'Ext',
          lastName: 'User',
          address: '1 rue Test',
          email: 'ext@test.com',
        });
      expect(buy2.status).toBe(409);

      const buyOther = await request(app)
        .post('/api/tickets/purchases')
        .send({
          ticketTypeId: type.body.id,
          firstName: 'Autre',
          lastName: 'Personne',
          address: '2 rue Test',
          email: 'autre@test.com',
        });
      expect(buyOther.status).toBe(201);

      const soldOut = await request(app)
        .post('/api/tickets/purchases')
        .send({
          ticketTypeId: type.body.id,
          firstName: 'Trop',
          lastName: 'Tard',
          address: '3 rue Test',
          email: 'trop@test.com',
        });
      expect(soldOut.status).toBe(409);
    });
  });

  describe('Shopping list', () => {
    test('items uniques par événement', async () => {
      const event = (
        await request(app)
          .post('/api/events')
          .send({
            name: 'BBQ',
            startDate: '2027-02-01T10:00:00.000Z',
            endDate: '2027-02-01T18:00:00.000Z',
            shoppingListEnabled: true,
            organizerIds: [alice.id],
            participantIds: [bob.id],
          })
      ).body;

      const item = await request(app)
        .post('/api/shopping')
        .send({
          name: 'Chips',
          quantity: 2,
          arrivalTime: '2027-02-01T17:00:00.000Z',
          eventId: event.id,
          userId: bob.id,
        });
      expect(item.status).toBe(201);

      const dup = await request(app)
        .post('/api/shopping')
        .send({
          name: 'Chips',
          quantity: 1,
          arrivalTime: '2027-02-01T17:30:00.000Z',
          eventId: event.id,
          userId: alice.id,
        });
      expect(dup.status).toBe(409);

      const disabledEvent = (
        await request(app)
          .post('/api/events')
          .send({
            name: 'No shop',
            startDate: '2027-03-01T10:00:00.000Z',
            endDate: '2027-03-01T12:00:00.000Z',
            shoppingListEnabled: false,
            organizerIds: [alice.id],
          })
      ).body;

      const fail = await request(app)
        .post('/api/shopping')
        .send({
          name: 'Soda',
          quantity: 1,
          arrivalTime: '2027-03-01T11:00:00.000Z',
          eventId: disabledEvent.id,
          userId: alice.id,
        });
      expect(fail.status).toBe(400);
    });
  });

  describe('Covoiturage (bonus)', () => {
    test('CRUD covoiturage si activé', async () => {
      const event = (
        await request(app)
          .post('/api/events')
          .send({
            name: 'Road trip',
            startDate: '2027-04-01T10:00:00.000Z',
            endDate: '2027-04-01T20:00:00.000Z',
            carpoolingEnabled: true,
            organizerIds: [alice.id],
            participantIds: [bob.id],
          })
      ).body;

      const create = await request(app)
        .post('/api/carpools')
        .send({
          departureLocation: 'Lyon',
          departureTime: '2027-04-01T07:00:00.000Z',
          price: 15,
          availableSeats: 3,
          maxTimeDeviationMinutes: 30,
          eventId: event.id,
          userId: bob.id,
        });
      expect(create.status).toBe(201);

      const upd = await request(app)
        .put(`/api/carpools/${create.body.id}`)
        .send({ availableSeats: 2 });
      expect(upd.body.availableSeats).toBe(2);

      const del = await request(app).delete(`/api/carpools/${create.body.id}`);
      expect(del.status).toBe(204);
    });
  });

  test('route racine API', async () => {
    const res = await request(app).get('/api');
    expect(res.status).toBe(200);
    expect(res.body.version).toBe('2.0.0');
  });
});
