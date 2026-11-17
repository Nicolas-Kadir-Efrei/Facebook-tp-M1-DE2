const userPublic = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  bio: true,
  avatar: true,
  createdAt: true,
  updatedAt: true,
};

const eventInclude = {
  organizers: { include: { user: { select: userPublic } } },
  participants: { include: { user: { select: userPublic } } },
  group: true,
};

const groupInclude = {
  admins: { include: { user: { select: userPublic } } },
  members: { include: { user: { select: userPublic } } },
};

const threadInclude = {
  messages: {
    include: {
      author: { select: userPublic },
      comments: { include: { author: { select: userPublic } } },
    },
    orderBy: { createdAt: 'asc' },
  },
  group: true,
  event: true,
};

const albumInclude = {
  photos: {
    include: {
      author: { select: userPublic },
      comments: { include: { author: { select: userPublic } } },
    },
  },
  event: true,
};

const pollInclude = {
  questions: {
    include: {
      options: true,
      responses: {
        include: {
          user: { select: userPublic },
          option: true,
        },
      },
    },
  },
  creator: { select: userPublic },
  event: true,
};

module.exports = {
  userPublic,
  eventInclude,
  groupInclude,
  threadInclude,
  albumInclude,
  pollInclude,
};
