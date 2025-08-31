import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/db/client'

describe('Database Models', () => {
  beforeEach(async () => {
    // Clean up database before each test
    await prisma.task.deleteMany()
    await prisma.project.deleteMany()
    await prisma.user.deleteMany()
  })

  afterEach(async () => {
    // Clean up database after each test
    await prisma.task.deleteMany()
    await prisma.project.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('User Model', () => {
    it('should create a user with email uniqueness constraint', async () => {
      // This will fail initially - we need to set up the database
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User',
        },
      })

      expect(user.id).toBeDefined()
      expect(user.email).toBe('test@example.com')
      expect(user.name).toBe('Test User')
      expect(user.createdAt).toBeInstanceOf(Date)

      // Should fail on duplicate email
      await expect(
        prisma.user.create({
          data: {
            email: 'test@example.com',
            name: 'Another User',
          },
        })
      ).rejects.toThrow()
    })
  })

  describe('Project Model', () => {
    it('should create a project with user relationship', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User',
        },
      })

      const project = await prisma.project.create({
        data: {
          name: 'Test Project',
          description: 'A test project',
          userId: user.id,
        },
      })

      expect(project.id).toBeDefined()
      expect(project.name).toBe('Test Project')
      expect(project.userId).toBe(user.id)
      expect(project.color).toBe('#6366f1') // Default color
    })
  })

  describe('Task Model', () => {
    it('should create a task with project and user relationships', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User',
        },
      })

      const project = await prisma.project.create({
        data: {
          name: 'Test Project',
          userId: user.id,
        },
      })

      const task = await prisma.task.create({
        data: {
          title: 'Test Task',
          description: 'A test task',
          userId: user.id,
          projectId: project.id,
        },
      })

      expect(task.id).toBeDefined()
      expect(task.title).toBe('Test Task')
      expect(task.userId).toBe(user.id)
      expect(task.projectId).toBe(project.id)
      expect(task.status).toBe('TODO') // Default status
      expect(task.priority).toBe('MEDIUM') // Default priority
    })

    it('should handle task without project (project optional)', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User',
        },
      })

      const task = await prisma.task.create({
        data: {
          title: 'Standalone Task',
          userId: user.id,
        },
      })

      expect(task.projectId).toBeNull()
      expect(task.userId).toBe(user.id)
    })
  })

  describe('Relationship Integrity', () => {
    it('should cascade delete tasks when user is deleted', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User',
        },
      })

      await prisma.task.create({
        data: {
          title: 'Test Task',
          userId: user.id,
        },
      })

      // Delete user should cascade to tasks
      await prisma.user.delete({
        where: { id: user.id },
      })

      const tasks = await prisma.task.findMany({
        where: { userId: user.id },
      })

      expect(tasks).toHaveLength(0)
    })

    it('should set task projectId to null when project is deleted', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          name: 'Test User',
        },
      })

      const project = await prisma.project.create({
        data: {
          name: 'Test Project',
          userId: user.id,
        },
      })

      const task = await prisma.task.create({
        data: {
          title: 'Test Task',
          userId: user.id,
          projectId: project.id,
        },
      })

      // Delete project should set task's projectId to null
      await prisma.project.delete({
        where: { id: project.id },
      })

      const updatedTask = await prisma.task.findUnique({
        where: { id: task.id },
      })

      expect(updatedTask?.projectId).toBeNull()
    })
  })
})