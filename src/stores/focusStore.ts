import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { FocusSession, FocusType, FocusStatus, TimerState, PomodoroSettings, FocusSettings } from '@/types/focus'

interface FocusState {
  // Current session
  currentSession: FocusSession | null
  
  // Timer state
  timerState: TimerState
  
  // Settings
  focusSettings: FocusSettings
  pomodoroSettings: PomodoroSettings
  
  // Sessions history
  sessions: FocusSession[]
  
  // UI State
  isTimerVisible: boolean
  showSettings: boolean
  
  // Web Worker
  timerWorker: Worker | null
  
  // Actions
  setCurrentSession: (session: FocusSession | null) => void
  updateTimerState: (state: Partial<TimerState>) => void
  setFocusSettings: (settings: Partial<FocusSettings>) => void
  setPomodoroSettings: (settings: Partial<PomodoroSettings>) => void
  setSessions: (sessions: FocusSession[]) => void
  addSession: (session: FocusSession) => void
  updateSession: (id: string, updates: Partial<FocusSession>) => void
  
  // Timer actions
  startTimer: (type: FocusType, duration: number, taskId?: string) => void
  pauseTimer: () => void
  resumeTimer: () => void
  stopTimer: () => void
  completeTimer: () => void
  
  // UI actions
  setTimerVisible: (visible: boolean) => void
  setShowSettings: (show: boolean) => void
  
  // Worker management
  initWorker: () => void
  destroyWorker: () => void
}

const defaultFocusSettings: FocusSettings = {
  userId: '',
  defaultFocusDuration: 25, // 25 minutes
  shortBreakDuration: 5,   // 5 minutes
  longBreakDuration: 15,   // 15 minutes
  sessionsUntilLongBreak: 4,
  enableNotifications: true,
  playBreakSounds: true,
  blockDistractions: false,
  autoStartBreaks: false,
  preferredFocusType: 'POMODORO'
}

const defaultPomodoroSettings: PomodoroSettings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsUntilLongBreak: 4,
  autoStartBreaks: false,
  autoStartFocus: false
}

const defaultTimerState: TimerState = {
  isRunning: false,
  isPaused: false,
  timeRemaining: 0,
  currentPhase: 'FOCUS',
  sessionCount: 0,
  totalElapsed: 0
}

export const useFocusStore = create<FocusState>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentSession: null,
      timerState: defaultTimerState,
      focusSettings: defaultFocusSettings,
      pomodoroSettings: defaultPomodoroSettings,
      sessions: [],
      isTimerVisible: false,
      showSettings: false,
      timerWorker: null,
      
      // Actions
      setCurrentSession: (session) => set({ currentSession: session }),
      
      updateTimerState: (updates) => set(state => ({
        timerState: { ...state.timerState, ...updates }
      })),
      
      setFocusSettings: (settings) => set(state => ({
        focusSettings: { ...state.focusSettings, ...settings }
      })),
      
      setPomodoroSettings: (settings) => set(state => ({
        pomodoroSettings: { ...state.pomodoroSettings, ...settings }
      })),
      
      setSessions: (sessions) => set({ sessions }),
      
      addSession: (session) => set(state => ({
        sessions: [session, ...state.sessions]
      })),
      
      updateSession: (id, updates) => set(state => ({
        sessions: state.sessions.map(session => 
          session.id === id ? { ...session, ...updates } : session
        ),
        currentSession: state.currentSession?.id === id 
          ? { ...state.currentSession, ...updates }
          : state.currentSession
      })),
      
      // Timer actions
      startTimer: (type, duration, taskId) => {
        const state = get()
        
        // Create new session
        const newSession: FocusSession = {
          id: `session-${Date.now()}`,
          userId: state.focusSettings.userId,
          type,
          duration,
          startTime: new Date(),
          status: 'ACTIVE',
          taskId,
          actualFocusTime: 0,
          breakTime: 0,
          interruptions: [],
          productivity: 0,
          mood: '',
          createdAt: new Date(),
          updatedAt: new Date()
        }
        
        set({
          currentSession: newSession,
          timerState: {
            ...state.timerState,
            isRunning: true,
            isPaused: false,
            timeRemaining: duration * 60, // Convert to seconds
            currentPhase: 'FOCUS',
          },
          isTimerVisible: true
        })
        
        // Start worker timer
        if (state.timerWorker) {
          state.timerWorker.postMessage({
            type: 'START',
            payload: { duration: duration * 60 }
          })
        }
      },
      
      pauseTimer: () => {
        const state = get()
        
        set(prevState => ({
          timerState: { ...prevState.timerState, isPaused: true, isRunning: false }
        }))
        
        if (state.timerWorker) {
          state.timerWorker.postMessage({ type: 'PAUSE' })
        }
        
        if (state.currentSession) {
          get().updateSession(state.currentSession.id, { status: 'PAUSED' })
        }
      },
      
      resumeTimer: () => {
        const state = get()
        
        set(prevState => ({
          timerState: { ...prevState.timerState, isPaused: false, isRunning: true }
        }))
        
        if (state.timerWorker) {
          state.timerWorker.postMessage({ type: 'RESUME' })
        }
        
        if (state.currentSession) {
          get().updateSession(state.currentSession.id, { status: 'ACTIVE' })
        }
      },
      
      stopTimer: () => {
        const state = get()
        
        set({
          timerState: defaultTimerState,
          currentSession: null
        })
        
        if (state.timerWorker) {
          state.timerWorker.postMessage({ type: 'STOP' })
        }
        
        if (state.currentSession) {
          get().updateSession(state.currentSession.id, { 
            status: 'CANCELLED',
            endTime: new Date()
          })
        }
      },
      
      completeTimer: () => {
        const state = get()
        
        set(prevState => ({
          timerState: { ...prevState.timerState, isRunning: false, timeRemaining: 0 }
        }))
        
        if (state.currentSession) {
          const completedSession = {
            ...state.currentSession,
            status: 'COMPLETED' as FocusStatus,
            endTime: new Date(),
            actualFocusTime: state.currentSession.duration
          }
          
          get().updateSession(state.currentSession.id, completedSession)
          get().addSession(completedSession)
          
          // Show notification if enabled
          if (state.focusSettings.enableNotifications && 'Notification' in window) {
            new Notification('Focus Session Complete!', {
              body: `You completed a ${state.currentSession.duration}-minute focus session.`,
              icon: '/icons/timer.png'
            })
          }
        }
        
        set({ currentSession: null })
      },
      
      // UI actions
      setTimerVisible: (visible) => set({ isTimerVisible: visible }),
      setShowSettings: (show) => set({ showSettings: show }),
      
      // Worker management
      initWorker: () => {
        const state = get()
        if (state.timerWorker) return
        
        const worker = new Worker('/workers/timer.worker.js')
        
        worker.onmessage = (e) => {
          const { type, payload } = e.data
          
          switch (type) {
            case 'TICK':
              get().updateTimerState({
                timeRemaining: payload.remaining,
                totalElapsed: payload.elapsed
              })
              break
              
            case 'COMPLETE':
              get().completeTimer()
              break
              
            case 'PAUSED':
              get().updateTimerState({
                timeRemaining: payload.remaining,
                isPaused: true,
                isRunning: false
              })
              break
              
            case 'STOPPED':
              get().updateTimerState(defaultTimerState)
              break
          }
        }
        
        set({ timerWorker: worker })
      },
      
      destroyWorker: () => {
        const state = get()
        if (state.timerWorker) {
          state.timerWorker.terminate()
          set({ timerWorker: null })
        }
      }
    }),
    {
      name: 'focus-store'
    }
  )
)