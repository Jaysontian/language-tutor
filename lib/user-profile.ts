/**
 * User Profile System
 * 
 * Stores user information collected during onboarding
 * and updated during sessions. Used to personalize lessons.
 */

export interface UserProfile {
  // Basics
  name?: string
  location?: string  // "SF", "Tokyo", etc.
  
  // Learning context
  whyLearning?: string  // "travel", "family", "work", "culture", "just for fun"
  targetCountry?: string  // Where they want to use it
  priorExperience?: 'none' | 'some' | 'intermediate' | 'advanced'
  
  // Personalization hooks
  interests?: string[]  // "coffee", "music", "gaming", "food", "travel"
  favoriteFood?: string
  favoriteCoffeeSpot?: string
  musicTaste?: string
  
  // Meta
  preferredPace?: 'chill' | 'intense'
  onboardingComplete: boolean
  
  // Free-form notes from AI
  notes?: string
  
  // Timestamps
  createdAt?: string
  updatedAt?: string
}

export interface UserProfileUpdate {
  name?: string
  whyLearning?: string
  targetCountry?: string
  priorExperience?: 'none' | 'some' | 'intermediate' | 'advanced'
  interests?: string[]
  favoriteFood?: string
  favoriteCoffeeSpot?: string
  musicTaste?: string
  preferredPace?: 'chill' | 'intense'
  notes?: string
}

const STORAGE_KEY = 'language-tutor-user-profile'

/**
 * Get user profile from localStorage
 */
export function getUserProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    return JSON.parse(stored) as UserProfile
  } catch {
    return null
  }
}

/**
 * Save user profile to localStorage
 */
export function saveUserProfile(profile: UserProfile): void {
  if (typeof window === 'undefined') return
  
  try {
    const updated = {
      ...profile,
      updatedAt: new Date().toISOString()
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error('Failed to save user profile:', error)
  }
}

/**
 * Create a new empty profile
 */
export function createEmptyProfile(): UserProfile {
  return {
    onboardingComplete: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

/**
 * Update profile with partial data (from AI onboarding responses)
 */
export function updateUserProfile(updates: UserProfileUpdate): UserProfile {
  const existing = getUserProfile() || createEmptyProfile()
  
  const updated: UserProfile = {
    ...existing,
    ...updates,
    // Merge interests array if both exist
    interests: updates.interests 
      ? [...new Set([...(existing.interests || []), ...updates.interests])]
      : existing.interests,
    updatedAt: new Date().toISOString()
  }
  
  saveUserProfile(updated)
  return updated
}

/**
 * Mark onboarding as complete
 */
export function completeOnboarding(): UserProfile {
  const existing = getUserProfile() || createEmptyProfile()
  const updated = {
    ...existing,
    onboardingComplete: true,
    updatedAt: new Date().toISOString()
  }
  saveUserProfile(updated)
  return updated
}

/**
 * Reset profile (for "redo onboarding")
 */
export function resetUserProfile(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * Build user context string for inclusion in tutor prompts
 */
export function buildUserContext(profile: UserProfile | null): string {
  if (!profile || !profile.onboardingComplete) return ''
  
  const parts: string[] = []
  
  if (profile.name) {
    parts.push(`- Name: ${profile.name}`)
  }
  
  if (profile.whyLearning) {
    parts.push(`- Learning for: ${profile.whyLearning}`)
  }
  
  if (profile.targetCountry) {
    parts.push(`- Target destination: ${profile.targetCountry}`)
  }
  
  if (profile.priorExperience) {
    const expMap: Record<string, string> = {
      'none': 'Complete beginner',
      'some': 'Some basics (rusty)',
      'intermediate': 'Conversational',
      'advanced': 'Advanced'
    }
    parts.push(`- Experience: ${expMap[profile.priorExperience] || profile.priorExperience}`)
  }
  
  if (profile.interests && profile.interests.length > 0) {
    parts.push(`- Interests: ${profile.interests.join(', ')}`)
  }
  
  if (profile.musicTaste) {
    parts.push(`- Music taste: ${profile.musicTaste}`)
  }
  
  if (profile.favoriteFood) {
    parts.push(`- Favorite food: ${profile.favoriteFood}`)
  }
  
  if (profile.favoriteCoffeeSpot) {
    parts.push(`- Coffee spot: ${profile.favoriteCoffeeSpot}`)
  }
  
  if (profile.preferredPace) {
    parts.push(`- Preferred pace: ${profile.preferredPace}`)
  }
  
  if (profile.notes) {
    parts.push(`- Notes: ${profile.notes}`)
  }
  
  if (parts.length === 0) return ''
  
  return `
══════════════════════════════════════════════════════════════
ABOUT THIS USER (use to personalize)
══════════════════════════════════════════════════════════════

${parts.join('\n')}

USE THIS INFO: Reference their interests in examples. Use their name occasionally.
Example: "Remember you mentioned you love cafes? Here's how to order..."
`
}

