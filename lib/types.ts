export type Profile = {
  id: string
  username: string | null
  full_name: string | null
  becoming_statement: string | null
  avatar_url: string | null
  bio: string | null
  location: string | null
  onboarding_complete: boolean
  profile_public: boolean
  council_requests_open: boolean
  email_notifications: boolean
  created_at: string
  updated_at: string
}

export type StatCategory = {
  id: string
  name: string
  icon: string
  description: string
}

export type UserStat = {
  id: string
  user_id: string
  stat_category_id: string
  current_value: number
  stat_categories?: StatCategory
}

export type PendingStatChange = {
  id: string
  user_id: string
  stat_category_id: string
  delta: number
  source: 'task'
  source_id: string
  created_at: string
  applied: boolean
}

export type Streak = {
  id: string
  user_id: string
  stat_category_id: string
  current_streak: number
  longest_streak: number
  last_completed_cycle: string | null
  stat_categories?: StatCategory
}

export type WeeklyCycle = {
  id: string
  user_id: string
  start_date: string
  end_date: string
  status: 'active' | 'completed'
}

export type Council = {
  id: string
  owner_id: string
  name: string
  created_at: string
}

export type CouncilMember = {
  id: string
  council_id: string
  member_id: string | null
  invite_email?: string | null
  invite_token?: string | null
  status: 'pending' | 'active' | 'removed'
  invited_at: string
  joined_at: string | null
  profiles?: Profile
}

export type CouncilRequest = {
  id: string
  requester_id: string
  target_user_id: string
  message: string | null
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
  profiles?: Profile
}

export type Task = {
  id: string
  council_id: string
  assigned_to: string
  assigned_by: string
  stat_category_id: string
  title: string
  description: string | null
  due_date: string | null
  cycle_week: string | null
  status: 'active' | 'completed' | 'expired'
  created_at: string
  stat_categories?: StatCategory
  assigner?: Pick<Profile, 'id' | 'full_name' | 'username'>
}

export type Submission = {
  id: string
  task_id: string
  user_id: string
  note: string | null
  media_url: string | null
  status: 'pending' | 'approved' | 'rejected' | 'needs_more'
  submitted_at: string
  reviewed_at: string | null
  tasks?: Task
  feedback?: Feedback[]
  profiles?: Pick<Profile, 'id' | 'full_name' | 'username'>
}

export type Feedback = {
  id: string
  submission_id: string
  reviewer_id: string
  type: 'review' | 'comment'
  decision?: 'approved' | 'rejected' | 'needs_more'
  comment: string | null
  created_at: string
}

export type TaskTemplate = {
  id: string
  title: string
  description: string | null
  stat_category_id: string
  suggested_value: number
}

export type ActivityLog = {
  id: string
  user_id: string
  type: string
  title: string
  meta: {
    stat?: string
    points?: number
    council_id?: string
    assigned_to?: string
  }
  created_at: string
}