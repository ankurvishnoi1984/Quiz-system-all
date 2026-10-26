import { createContext, useContext } from 'react'
import { getParticipantDensityLevel } from '../utils/participantQuestionDensity'

const ParticipantFitContext = createContext(getParticipantDensityLevel(0))

export function ParticipantFitProvider({ densityId = 0, children }) {
  const value = getParticipantDensityLevel(densityId)
  return (
    <ParticipantFitContext.Provider value={value}>{children}</ParticipantFitContext.Provider>
  )
}

export function useParticipantFit() {
  return useContext(ParticipantFitContext)
}
