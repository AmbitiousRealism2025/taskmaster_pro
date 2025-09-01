import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FocusSession, CreateFocusSessionData, UpdateFocusSessionData, FocusSettings } from '@/types/focus'
import { useFocusStore } from '@/stores/focusStore'
import { toast } from 'sonner'

// API functions
async function fetchFocusSessions(): Promise<FocusSession[]> {
  const response = await fetch('/api/focus/sessions')
  if (!response.ok) {
    throw new Error('Failed to fetch focus sessions')
  }
  return response.json()
}

async function createFocusSession(data: CreateFocusSessionData): Promise<FocusSession> {
  const response = await fetch('/api/focus/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    throw new Error('Failed to create focus session')
  }
  
  return response.json()
}

async function updateFocusSession(id: string, data: UpdateFocusSessionData): Promise<FocusSession> {
  const response = await fetch(`/api/focus/sessions/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    throw new Error('Failed to update focus session')
  }
  
  return response.json()
}

async function fetchFocusSettings(): Promise<FocusSettings> {
  const response = await fetch('/api/focus/settings')
  if (!response.ok) {
    throw new Error('Failed to fetch focus settings')
  }
  return response.json()
}

async function updateFocusSettings(data: Partial<FocusSettings>): Promise<FocusSettings> {
  const response = await fetch('/api/focus/settings', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    throw new Error('Failed to update focus settings')
  }
  
  return response.json()
}

// React Query hooks
export function useFocusSessions() {
  const { setSessions } = useFocusStore()
  
  const result = useQuery({
    queryKey: ['focus-sessions'],
    queryFn: fetchFocusSessions,
  })

  React.useEffect(() => {
    if (result.data) {
      setSessions(result.data)
    }
  }, [result.data, setSessions])

  React.useEffect(() => {
    if (result.error) {
      toast.error('Failed to load focus sessions')
    }
  }, [result.error])
  
  return result
}

export function useCreateFocusSession() {
  const queryClient = useQueryClient()
  const { addSession, setCurrentSession } = useFocusStore()
  
  return useMutation({
    mutationFn: createFocusSession,
    onMutate: async (data) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['focus-sessions'] })
      
      // Create optimistic session
      const optimisticSession: FocusSession = {
        id: `temp-${Date.now()}`,
        userId: '', // Will be set by server
        type: data.type,
        duration: data.duration,
        startTime: new Date(),
        status: 'ACTIVE',
        taskId: data.taskId,
        taskTitle: data.taskId ? 'Loading...' : undefined,
        projectId: data.projectId,
        actualFocusTime: 0,
        breakTime: 0,
        interruptions: [],
        productivity: 0,
        mood: '',
        goals: data.goals,
        achievements: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      // Optimistically update store
      addSession(optimisticSession)
      setCurrentSession(optimisticSession)
      
      return { optimisticSession }
    },
    onSuccess: (newSession, variables, context) => {
      // Replace optimistic session with real session
      if (context?.optimisticSession) {
        const { updateSession } = useFocusStore.getState()
        updateSession(context.optimisticSession.id, newSession)
      }
      
      queryClient.invalidateQueries({ queryKey: ['focus-sessions'] })
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.optimisticSession) {
        const { setSessions, setCurrentSession } = useFocusStore.getState()
        const currentSessions = useFocusStore.getState().sessions
        setSessions(currentSessions.filter(s => s.id !== context.optimisticSession.id))
        setCurrentSession(null)
      }
      
      queryClient.invalidateQueries({ queryKey: ['focus-sessions'] })
      toast.error('Failed to create focus session')
    },
  })
}

export function useUpdateFocusSession() {
  const queryClient = useQueryClient()
  const { updateSession } = useFocusStore()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFocusSessionData }) =>
      updateFocusSession(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['focus-sessions'] })
      
      // Optimistically update
      updateSession(id, data)
      
      return { id, previousData: data }
    },
    onSuccess: (updatedSession) => {
      queryClient.invalidateQueries({ queryKey: ['focus-sessions'] })
    },
    onError: (error, variables, context) => {
      queryClient.invalidateQueries({ queryKey: ['focus-sessions'] })
      toast.error('Failed to update focus session')
    },
  })
}

export function useFocusSettings() {
  const { setFocusSettings } = useFocusStore()
  
  const result = useQuery({
    queryKey: ['focus-settings'],
    queryFn: fetchFocusSettings,
  })

  React.useEffect(() => {
    if (result.data) {
      setFocusSettings(result.data)
    }
  }, [result.data, setFocusSettings])

  React.useEffect(() => {
    if (result.error) {
      toast.error('Failed to load focus settings')
    }
  }, [result.error])
  
  return result
}

export function useUpdateFocusSettings() {
  const queryClient = useQueryClient()
  const { setFocusSettings } = useFocusStore()
  
  return useMutation({
    mutationFn: updateFocusSettings,
    onSuccess: (updatedSettings) => {
      setFocusSettings(updatedSettings)
      queryClient.invalidateQueries({ queryKey: ['focus-settings'] })
      toast.success('Settings updated successfully')
    },
    onError: () => {
      toast.error('Failed to update settings')
    },
  })
}

// Custom hooks for common actions
export function useFocusTimer() {
  const createSessionMutation = useCreateFocusSession()
  const updateSessionMutation = useUpdateFocusSession()
  const { 
    currentSession,
    timerState,
    startTimer: storeStartTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    completeTimer
  } = useFocusStore()

  const startSession = async (type: string, duration: number, options?: { taskId?: string; projectId?: string; goals?: string[] }) => {
    try {
      const sessionData = {
        type: type as any,
        duration,
        taskId: options?.taskId,
        projectId: options?.projectId,
        goals: options?.goals || []
      }
      
      // Create session in database
      const session = await createSessionMutation.mutateAsync(sessionData)
      
      // Start the local timer
      storeStartTimer(type as any, duration, options?.taskId)
      
      return session
    } catch (error) {
      console.error('Failed to start focus session:', error)
      throw error
    }
  }

  const completeSession = async (productivity?: number, mood?: string, achievements?: string[], notes?: string) => {
    if (!currentSession) return
    
    try {
      const updates = {
        endTime: new Date(),
        status: 'COMPLETED' as any,
        actualFocusTime: currentSession.duration - Math.floor(timerState.timeRemaining / 60),
        productivity: productivity || 5,
        mood: mood || '',
        achievements: achievements || [],
        notes: notes || ''
      }
      
      await updateSessionMutation.mutateAsync({ id: currentSession.id, data: updates })
      completeTimer()
    } catch (error) {
      console.error('Failed to complete focus session:', error)
    }
  }

  return {
    currentSession,
    timerState,
    isLoading: createSessionMutation.isPending || updateSessionMutation.isPending,
    startSession,
    pauseTimer,
    resumeTimer,
    stopTimer,
    completeSession
  }
}