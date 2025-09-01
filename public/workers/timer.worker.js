// Timer Web Worker for precise timing
let timerId = null
let startTime = null
let duration = 0 // in seconds
let pausedTime = 0
let isPaused = false

self.addEventListener('message', function(e) {
  const { type, payload = {} } = e.data

  switch (type) {
    case 'START':
      duration = payload.duration || 0
      startTime = Date.now()
      pausedTime = 0
      isPaused = false
      startTimer()
      break

    case 'PAUSE':
      if (timerId) {
        clearInterval(timerId)
        timerId = null
        pausedTime += Date.now() - startTime
        isPaused = true
        self.postMessage({ type: 'PAUSED', payload: { remaining: getRemainingTime() } })
      }
      break

    case 'RESUME':
      if (isPaused) {
        startTime = Date.now()
        isPaused = false
        startTimer()
      }
      break

    case 'STOP':
      if (timerId) {
        clearInterval(timerId)
        timerId = null
      }
      startTime = null
      duration = 0
      pausedTime = 0
      isPaused = false
      self.postMessage({ type: 'STOPPED' })
      break

    case 'GET_STATUS':
      self.postMessage({ 
        type: 'STATUS', 
        payload: { 
          remaining: getRemainingTime(),
          isRunning: !!timerId && !isPaused,
          isPaused: isPaused
        } 
      })
      break
  }
})

function startTimer() {
  if (timerId) {
    clearInterval(timerId)
  }

  timerId = setInterval(() => {
    const remaining = getRemainingTime()
    
    self.postMessage({ 
      type: 'TICK', 
      payload: { 
        remaining: remaining,
        elapsed: duration - remaining
      } 
    })

    if (remaining <= 0) {
      clearInterval(timerId)
      timerId = null
      self.postMessage({ type: 'COMPLETE' })
    }
  }, 1000) // Update every second
}

function getRemainingTime() {
  if (!startTime) return duration

  const elapsed = isPaused ? pausedTime : (pausedTime + (Date.now() - startTime))
  const elapsedSeconds = Math.floor(elapsed / 1000)
  const remaining = Math.max(0, duration - elapsedSeconds)
  
  return remaining
}