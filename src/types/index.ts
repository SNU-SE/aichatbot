// 사용자 관련 타입
export interface User {
  id: string;
  email: string;
  role: 'admin' | 'student';
  created_at: string;
}

export interface Student {
  id: string;
  user_id: string;
  name: string;
  student_id: string;
  class_name?: string;
  created_at: string;
  updated_at: string;
}

// 활동 관련 타입
export interface Activity {
  id: string;
  title: string;
  description: string;
  type: 'argumentation' | 'discussion' | 'experiment';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  id: string;
  activity_id: string;
  title: string;
  description?: string;
  order_index: number;
  is_required: boolean;
  created_at: string;
}

// 채팅 관련 타입
export interface ChatMessage {
  id: string;
  student_id: string;
  message: string;
  response: string;
  activity_id?: string;
  created_at: string;
}

// 논증 관련 타입
export interface ArgumentationResponse {
  id: string;
  student_id: string;
  activity_id: string;
  content: string;
  is_submitted: boolean;
  submitted_at?: string;
  created_at: string;
  updated_at: string;
}

// 동료평가 관련 타입
export interface PeerEvaluation {
  id: string;
  evaluator_id: string;
  target_id: string;
  activity_id: string;
  evaluation_data: Record<string, any>;
  is_completed: boolean;
  completed_at?: string;
  created_at: string;
}