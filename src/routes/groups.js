const express = require('express');
const prisma = require('../prisma');
const { asyncHandler, httpError } = require('../middleware/errorHandler');
const { groupInclude } = require('../utils/includes');

const router = express.Router();

function mapGroup(group) {
  if (!group) return group;
  return {
    ...group,
    admins: group.admins?.map((a) => a.user) || [],
    members: group.members?.map((m) => m.user) || [],
  };
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const groups = await prisma.group.findMany({
      include: groupInclude,
      orderBy: { createdAt: 'desc' },
    });
    res.json(groups.map(mapGroup));
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const group = await prisma.group.findUnique({
      where: { id: req.params.id },
      include: groupInclude,
    });
    if (!group) throw httpError(404, 'Groupe introuvable');
    res.json(mapGroup(group));
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const {
      name,
      description,
      icon,
      coverPhoto,
      type,
      allowMembersToPublish,
      allowMembersToCreateEvents,
      adminIds = [],
      memberIds = [],
    } = req.body;

    if (!name) throw httpError(400, 'name est obligatoire');
    if (!adminIds.length) throw httpError(400, 'Au moins un administrateur (adminIds) est requis');
    if (adminIds.some((id) => !id) || memberIds.some((id) => !id)) {
      throw httpError(400, 'adminIds/memberIds ne doivent pas être vides — lance d\'abord "Setup - Charger les IDs" dans Postman');
    }

    const allUserIds = [...new Set([...memberIds, ...adminIds])];
    const existing = await prisma.user.findMany({
      where: { id: { in: allUserIds } },
      select: { id: true },
    });
    if (existing.length !== allUserIds.length) {
      throw httpError(400, 'Un ou plusieurs userId sont introuvables. Relance Setup ou crée les utilisateurs.');
    }

    const allMembers = allUserIds

    const group = await prisma.group.create({
      data: {
        name,
        description,
        icon,
        coverPhoto,
        type: type || 'PUBLIC',
        allowMembersToPublish: allowMembersToPublish !== undefined ? allowMembersToPublish : true,
        allowMembersToCreateEvents: !!allowMembersToCreateEvents,
        admins: { create: adminIds.map((userId) => ({ userId })) },
        members: { create: allMembers.map((userId) => ({ userId })) },
      },
      include: groupInclude,
    });

    res.status(201).json(mapGroup(group));
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const {
      name,
      description,
      icon,
      coverPhoto,
      type,
      allowMembersToPublish,
      allowMembersToCreateEvents,
      adminIds,
      memberIds,
    } = req.body;

    const data = {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(icon !== undefined && { icon }),
      ...(coverPhoto !== undefined && { coverPhoto }),
      ...(type !== undefined && { type }),
      ...(allowMembersToPublish !== undefined && { allowMembersToPublish }),
      ...(allowMembersToCreateEvents !== undefined && { allowMembersToCreateEvents }),
    };

    if (adminIds) {
      if (!adminIds.length) throw httpError(400, 'Au moins un administrateur est requis');
      await prisma.groupAdmin.deleteMany({ where: { groupId: req.params.id } });
      data.admins = { create: adminIds.map((userId) => ({ userId })) };
    }

    if (memberIds) {
      await prisma.groupMember.deleteMany({ where: { groupId: req.params.id } });
      data.members = { create: memberIds.map((userId) => ({ userId })) };
    }

    const group = await prisma.group.update({
      where: { id: req.params.id },
      data,
      include: groupInclude,
    });
    res.json(mapGroup(group));
  })
);

router.post(
  '/:id/members/:userId',
  asyncHandler(async (req, res) => {
    const group = await prisma.group.findUnique({ where: { id: req.params.id } });
    if (!group) throw httpError(404, 'Groupe introuvable');
    await prisma.groupMember.create({
      data: { groupId: req.params.id, userId: req.params.userId },
    });
    const updated = await prisma.group.findUnique({
      where: { id: req.params.id },
      include: groupInclude,
    });
    res.status(201).json(mapGroup(updated));
  })
);

router.delete(
  '/:id/members/:userId',
  asyncHandler(async (req, res) => {
    await prisma.groupMember.delete({
      where: {
        groupId_userId: { groupId: req.params.id, userId: req.params.userId },
      },
    });
    res.status(204).send();
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await prisma.group.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);

module.exports = router;
