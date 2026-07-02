export type PersonaId =
  | "coffee"
  | "cooking"
  | "baby"
  | "workout"
  | "study"
  | "meditation"
  | "scientist"
  | "minimalist"
  | "standard";

export interface TimePersona {
  id: PersonaId;
  name: string;
  subtitle: string;
  tagline: string;
  theme: string; // Tailwind theme classes
  icon: string;  // Lucide icon name
  visualMetaphor: string; // "coffee" | "ocean" | "fire" | "hourglass" | "leaves" | "moon" | "galaxy" | "ripple"
  language: {
    start: string;
    pause: string;
    resume: string;
    lap: string;
    stop: string;
    elapsedLabel: string;
    lapLabel: string;
  };
  feedbackStyle: "precision" | "milestone" | "sensory" | "performance" | "calm" | "gentle";
}

export interface Milestone {
  time: number; // in seconds
  label: string;
  instruction: string;
}

export interface TimeRecipe {
  id: string;
  name: string;
  description: string;
  icon: string;
  visualMetaphor: string;
  theme: string;
  milestones: Milestone[];
  isCommunity?: boolean;
  creator?: string;
  creatorRole?: string;
  forks?: number;
  likes?: number;
  downloads?: number;
  rating?: number;
}

export interface TimeSession {
  id: string;
  recipeId?: string;
  recipeName?: string;
  personaId: PersonaId;
  timestamp: string;
  duration: number; // in seconds
  milestonesReached: number;
  notes: string;
  distractions: number;
  insights?: {
    title: string;
    reflection: string;
    ritualSuggestion: string;
    philosophicalInsight: string;
  };
}

export interface CreatorProfile {
  id: string;
  name: string;
  role: string;
  avatar: string;
  bio: string;
  followers: number;
  recipesCount: number;
  featuredRecipeId: string;
}
