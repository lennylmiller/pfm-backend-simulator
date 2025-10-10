import request from 'supertest';
import { app } from '../../src/index';
import { prisma } from '../../src/config/database';
import jwt from 'jsonwebtoken';
import { authConfig } from '../../src/config/auth';

describe('Tags API', () => {
  let authToken: string;
  let userId: string;
  let partnerId: string;
  let systemTagId: string;
  let partnerTagId: string;
  let userTagId: string;

  beforeAll(async () => {
    // Create test partner
    const partner = await prisma.partner.create({
      data: {
        name: 'Test Bank Tags',
        domain: 'testtags.com',
      },
    });

    // Create test user
    const user = await prisma.user.create({
      data: {
        partnerId: partner.id,
        email: 'tags@example.com',
        hashedPassword: 'hashed',
        firstName: 'Tag',
        lastName: 'Tester',
      },
    });

    userId = user.id.toString();
    partnerId = user.partnerId.toString();

    // Generate JWT
    authToken = jwt.sign(
      { userId, partnerId, email: user.email },
      authConfig.jwtSecret,
      { expiresIn: '24h' }
    );

    // Create system tag
    const systemTag = await prisma.tag.create({
      data: {
        name: 'Groceries',
        tagType: 'system',
      },
    });
    systemTagId = systemTag.id.toString();

    // Create partner tag
    const partnerTag = await prisma.tag.create({
      data: {
        name: 'Partner Tag',
        tagType: 'partner',
        partnerId: partner.id,
      },
    });
    partnerTagId = partnerTag.id.toString();

    // Create user tag
    const userTag = await prisma.tag.create({
      data: {
        name: 'My Custom Tag',
        tagType: 'user',
        userId: user.id,
      },
    });
    userTagId = userTag.id.toString();
  });

  afterAll(async () => {
    // Cleanup
    await prisma.tag.deleteMany({
      where: {
        OR: [
          { id: BigInt(systemTagId) },
          { id: BigInt(partnerTagId) },
          { userId: BigInt(userId) },
        ],
      },
    });
    await prisma.user.deleteMany({ where: { id: BigInt(userId) } });
    await prisma.partner.deleteMany({ where: { id: BigInt(partnerId) } });
  });

  describe('GET /api/v2/tags', () => {
    it('should return all system tags without authentication', async () => {
      const response = await request(app)
        .get('/api/v2/tags')
        .expect(200);

      expect(response.body).toHaveProperty('tags');
      expect(Array.isArray(response.body.tags)).toBe(true);

      const systemTag = response.body.tags.find((t: any) => t.id.toString() === systemTagId);
      expect(systemTag).toBeDefined();
      expect(systemTag.name).toBe('Groceries');
      expect(systemTag.tag_type).toBe('system');
    });

    it('should not include partner or user tags', async () => {
      const response = await request(app)
        .get('/api/v2/tags')
        .expect(200);

      const partnerTag = response.body.tags.find((t: any) => t.id.toString() === partnerTagId);
      const userTag = response.body.tags.find((t: any) => t.id.toString() === userTagId);

      expect(partnerTag).toBeUndefined();
      expect(userTag).toBeUndefined();
    });
  });

  describe('GET /api/v2/users/:userId/tags', () => {
    it('should return system + partner + user tags with transaction counts', async () => {
      const response = await request(app)
        .get(`/api/v2/users/${userId}/tags`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('tags');
      expect(Array.isArray(response.body.tags)).toBe(true);
      expect(response.body.tags.length).toBeGreaterThanOrEqual(3);

      // Check system tag is included
      const systemTag = response.body.tags.find((t: any) => t.id.toString() === systemTagId);
      expect(systemTag).toBeDefined();
      expect(systemTag.tag_type).toBe('system');
      expect(systemTag).toHaveProperty('transaction_count');

      // Check partner tag is included
      const partnerTag = response.body.tags.find((t: any) => t.id.toString() === partnerTagId);
      expect(partnerTag).toBeDefined();
      expect(partnerTag.tag_type).toBe('partner');
      expect(partnerTag).toHaveProperty('transaction_count');

      // Check user tag is included
      const userTag = response.body.tags.find((t: any) => t.id.toString() === userTagId);
      expect(userTag).toBeDefined();
      expect(userTag.tag_type).toBe('user');
      expect(userTag).toHaveProperty('transaction_count');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get(`/api/v2/users/${userId}/tags`)
        .expect(401);
    });

    it('should return 403 for mismatched userId', async () => {
      const otherUserId = '99999';
      await request(app)
        .get(`/api/v2/users/${otherUserId}/tags`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });
  });

  describe('PUT /api/v2/users/:userId/tags', () => {
    it('should create new tags', async () => {
      const response = await request(app)
        .put(`/api/v2/users/${userId}/tags`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tags: {
            create: [
              { name: 'Shopping', parent_tag_id: systemTagId },
              { name: 'Entertainment' },
            ],
          },
        })
        .expect(200);

      expect(response.body).toHaveProperty('created');
      expect(response.body.created).toHaveLength(2);
      expect(response.body.created[0].name).toBe('Shopping');
      expect(response.body.created[0].tag_type).toBe('user');
      expect(response.body.created[1].name).toBe('Entertainment');

      // Cleanup
      await prisma.tag.deleteMany({
        where: {
          name: { in: ['Shopping', 'Entertainment'] },
          userId: BigInt(userId),
        },
      });
    });

    it('should update existing tags', async () => {
      const newName = 'My Updated Tag';

      const response = await request(app)
        .put(`/api/v2/users/${userId}/tags`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tags: {
            update: [
              { id: userTagId, name: newName },
            ],
          },
        })
        .expect(200);

      expect(response.body).toHaveProperty('updated');
      expect(response.body.updated).toHaveLength(1);
      expect(response.body.updated[0].id.toString()).toBe(userTagId);
      expect(response.body.updated[0].name).toBe(newName);

      // Restore original name
      await prisma.tag.update({
        where: { id: BigInt(userTagId) },
        data: { name: 'My Custom Tag' },
      });
    });

    it('should delete tags', async () => {
      // Create a tag to delete
      const tempTag = await prisma.tag.create({
        data: {
          name: 'Temporary Tag',
          tagType: 'user',
          userId: BigInt(userId),
        },
      });

      const response = await request(app)
        .put(`/api/v2/users/${userId}/tags`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tags: {
            delete: [tempTag.id.toString()],
          },
        })
        .expect(200);

      expect(response.body).toHaveProperty('deleted');
      expect(response.body.deleted).toHaveLength(1);
      expect(response.body.deleted[0]).toBe(Number(tempTag.id));

      // Verify deletion
      const deletedTag = await prisma.tag.findUnique({
        where: { id: tempTag.id },
      });
      expect(deletedTag).toBeNull();
    });

    it('should handle mixed operations', async () => {
      // Create a tag to update and delete
      const tagToUpdate = await prisma.tag.create({
        data: {
          name: 'To Update',
          tagType: 'user',
          userId: BigInt(userId),
        },
      });

      const tagToDelete = await prisma.tag.create({
        data: {
          name: 'To Delete',
          tagType: 'user',
          userId: BigInt(userId),
        },
      });

      const response = await request(app)
        .put(`/api/v2/users/${userId}/tags`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tags: {
            create: [{ name: 'Created Tag' }],
            update: [{ id: tagToUpdate.id.toString(), name: 'Updated Tag' }],
            delete: [tagToDelete.id.toString()],
          },
        })
        .expect(200);

      expect(response.body.created).toHaveLength(1);
      expect(response.body.updated).toHaveLength(1);
      expect(response.body.deleted).toHaveLength(1);

      expect(response.body.created[0].name).toBe('Created Tag');
      expect(response.body.updated[0].name).toBe('Updated Tag');
      expect(response.body.deleted[0]).toBe(Number(tagToDelete.id));

      // Cleanup
      await prisma.tag.deleteMany({
        where: {
          OR: [
            { name: 'Created Tag' },
            { id: tagToUpdate.id },
          ],
        },
      });
    });

    it('should not allow updating tags from other users', async () => {
      // Create another user
      const otherUser = await prisma.user.create({
        data: {
          partnerId: BigInt(partnerId),
          email: 'other@example.com',
          hashedPassword: 'hashed',
          firstName: 'Other',
          lastName: 'User',
        },
      });

      // Create tag for other user
      const otherUserTag = await prisma.tag.create({
        data: {
          name: 'Other User Tag',
          tagType: 'user',
          userId: otherUser.id,
        },
      });

      const response = await request(app)
        .put(`/api/v2/users/${userId}/tags`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tags: {
            update: [{ id: otherUserTag.id.toString(), name: 'Hacked' }],
          },
        })
        .expect(200);

      // Should have skipped the update
      expect(response.body.updated).toHaveLength(0);

      // Verify tag wasn't changed
      const unchangedTag = await prisma.tag.findUnique({
        where: { id: otherUserTag.id },
      });
      expect(unchangedTag?.name).toBe('Other User Tag');

      // Cleanup
      await prisma.tag.delete({ where: { id: otherUserTag.id } });
      await prisma.user.deleteMany({ where: { id: otherUser.id } });
    });

    it('should not allow deleting tags from other users', async () => {
      // Create another user
      const otherUser = await prisma.user.create({
        data: {
          partnerId: BigInt(partnerId),
          email: 'other2@example.com',
          hashedPassword: 'hashed',
          firstName: 'Other',
          lastName: 'User',
        },
      });

      // Create tag for other user
      const otherUserTag = await prisma.tag.create({
        data: {
          name: 'Other User Tag 2',
          tagType: 'user',
          userId: otherUser.id,
        },
      });

      const response = await request(app)
        .put(`/api/v2/users/${userId}/tags`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tags: {
            delete: [otherUserTag.id.toString()],
          },
        })
        .expect(200);

      // Should have skipped the delete
      expect(response.body.deleted).toHaveLength(0);

      // Verify tag still exists
      const stillExistsTag = await prisma.tag.findUnique({
        where: { id: otherUserTag.id },
      });
      expect(stillExistsTag).toBeDefined();

      // Cleanup
      await prisma.tag.delete({ where: { id: otherUserTag.id } });
      await prisma.user.deleteMany({ where: { id: otherUser.id } });
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .put(`/api/v2/users/${userId}/tags`)
        .send({
          tags: {
            create: [{ name: 'Test' }],
          },
        })
        .expect(401);
    });

    it('should return 403 for mismatched userId', async () => {
      const otherUserId = '99999';
      await request(app)
        .put(`/api/v2/users/${otherUserId}/tags`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tags: {
            create: [{ name: 'Test' }],
          },
        })
        .expect(403);
    });

    it('should return 400 for invalid data', async () => {
      const response = await request(app)
        .put(`/api/v2/users/${userId}/tags`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tags: {
            create: [{ name: '' }], // Invalid: empty name
          },
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Validation failed');
    });

    it('should handle empty operations', async () => {
      const response = await request(app)
        .put(`/api/v2/users/${userId}/tags`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tags: {},
        })
        .expect(200);

      expect(response.body.created).toHaveLength(0);
      expect(response.body.updated).toHaveLength(0);
      expect(response.body.deleted).toHaveLength(0);
    });
  });
});
