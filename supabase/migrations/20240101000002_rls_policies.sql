-- Enable RLS on all tables
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_checklist_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE argumentation_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_frequency ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_prompt_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_work_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_completion_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_evaluation_phases ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_roles.user_id = $1 AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get student_id from user_id
CREATE OR REPLACE FUNCTION get_student_id(user_id UUID)
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT id FROM students 
        WHERE students.user_id = $1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- User roles policies
CREATE POLICY "Admins can view all user roles" ON user_roles
    FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Users can view their own role" ON user_roles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage user roles" ON user_roles
    FOR ALL USING (is_admin(auth.uid()));

-- Students policies
CREATE POLICY "Admins can view all students" ON students
    FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Students can view their own profile" ON students
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage students" ON students
    FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Students can update their own profile" ON students
    FOR UPDATE USING (user_id = auth.uid());

-- Student sessions policies
CREATE POLICY "Admins can view all sessions" ON student_sessions
    FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Students can view their own sessions" ON student_sessions
    FOR SELECT USING (student_id = get_student_id(auth.uid()));

CREATE POLICY "Students can manage their own sessions" ON student_sessions
    FOR ALL USING (student_id = get_student_id(auth.uid()));

CREATE POLICY "Admins can manage all sessions" ON student_sessions
    FOR ALL USING (is_admin(auth.uid()));

-- Activities policies (public read for all authenticated users)
CREATE POLICY "All authenticated users can view activities" ON activities
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage activities" ON activities
    FOR ALL USING (is_admin(auth.uid()));

-- Activity modules policies
CREATE POLICY "All authenticated users can view activity modules" ON activity_modules
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage activity modules" ON activity_modules
    FOR ALL USING (is_admin(auth.uid()));

-- Checklist items policies
CREATE POLICY "All authenticated users can view checklist items" ON checklist_items
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage checklist items" ON checklist_items
    FOR ALL USING (is_admin(auth.uid()));

-- Student checklist progress policies
CREATE POLICY "Admins can view all checklist progress" ON student_checklist_progress
    FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Students can view their own checklist progress" ON student_checklist_progress
    FOR SELECT USING (student_id = get_student_id(auth.uid()));

CREATE POLICY "Students can manage their own checklist progress" ON student_checklist_progress
    FOR ALL USING (student_id = get_student_id(auth.uid()));

CREATE POLICY "Admins can manage all checklist progress" ON student_checklist_progress
    FOR ALL USING (is_admin(auth.uid()));

-- Argumentation responses policies
CREATE POLICY "Admins can view all argumentation responses" ON argumentation_responses
    FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Students can view their own argumentation responses" ON argumentation_responses
    FOR SELECT USING (student_id = get_student_id(auth.uid()));

CREATE POLICY "Students can manage their own argumentation responses" ON argumentation_responses
    FOR ALL USING (student_id = get_student_id(auth.uid()));

CREATE POLICY "Admins can manage all argumentation responses" ON argumentation_responses
    FOR ALL USING (is_admin(auth.uid()));

-- Peer evaluations policies
CREATE POLICY "Admins can view all peer evaluations" ON peer_evaluations
    FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Students can view evaluations they created or received" ON peer_evaluations
    FOR SELECT USING (
        evaluator_id = get_student_id(auth.uid()) OR 
        target_id = get_student_id(auth.uid())
    );

CREATE POLICY "Students can manage their own evaluations" ON peer_evaluations
    FOR ALL USING (evaluator_id = get_student_id(auth.uid()));

CREATE POLICY "Admins can manage all peer evaluations" ON peer_evaluations
    FOR ALL USING (is_admin(auth.uid()));

-- Evaluation reflections policies
CREATE POLICY "Admins can view all evaluation reflections" ON evaluation_reflections
    FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Students can view their own evaluation reflections" ON evaluation_reflections
    FOR SELECT USING (student_id = get_student_id(auth.uid()));

CREATE POLICY "Students can manage their own evaluation reflections" ON evaluation_reflections
    FOR ALL USING (student_id = get_student_id(auth.uid()));

CREATE POLICY "Admins can manage all evaluation reflections" ON evaluation_reflections
    FOR ALL USING (is_admin(auth.uid()));

-- Chat logs policies
CREATE POLICY "Admins can view all chat logs" ON chat_logs
    FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Students can view their own chat logs" ON chat_logs
    FOR SELECT USING (student_id = get_student_id(auth.uid()));

CREATE POLICY "Students can create their own chat logs" ON chat_logs
    FOR INSERT WITH CHECK (student_id = get_student_id(auth.uid()));

CREATE POLICY "Admins can manage all chat logs" ON chat_logs
    FOR ALL USING (is_admin(auth.uid()));

-- Question frequency policies
CREATE POLICY "Admins can view all question frequency" ON question_frequency
    FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Students can view their own question frequency" ON question_frequency
    FOR SELECT USING (student_id = get_student_id(auth.uid()));

CREATE POLICY "Students can manage their own question frequency" ON question_frequency
    FOR ALL USING (student_id = get_student_id(auth.uid()));

CREATE POLICY "Admins can manage all question frequency" ON question_frequency
    FOR ALL USING (is_admin(auth.uid()));

-- Document chunks policies (read-only for all authenticated users)
CREATE POLICY "All authenticated users can view document chunks" ON document_chunks
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage document chunks" ON document_chunks
    FOR ALL USING (is_admin(auth.uid()));

-- Admin settings policies
CREATE POLICY "Admins can manage admin settings" ON admin_settings
    FOR ALL USING (is_admin(auth.uid()));

-- Class prompt settings policies
CREATE POLICY "All authenticated users can view class prompt settings" ON class_prompt_settings
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage class prompt settings" ON class_prompt_settings
    FOR ALL USING (is_admin(auth.uid()));

-- Prompt templates policies
CREATE POLICY "All authenticated users can view prompt templates" ON prompt_templates
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage prompt templates" ON prompt_templates
    FOR ALL USING (is_admin(auth.uid()));

-- Student work drafts policies
CREATE POLICY "Admins can view all student work drafts" ON student_work_drafts
    FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Students can view their own work drafts" ON student_work_drafts
    FOR SELECT USING (student_id = get_student_id(auth.uid()));

CREATE POLICY "Students can manage their own work drafts" ON student_work_drafts
    FOR ALL USING (student_id = get_student_id(auth.uid()));

CREATE POLICY "Admins can manage all work drafts" ON student_work_drafts
    FOR ALL USING (is_admin(auth.uid()));

-- Checklist completion history policies
CREATE POLICY "Admins can view all checklist completion history" ON checklist_completion_history
    FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Students can view their own completion history" ON checklist_completion_history
    FOR SELECT USING (student_id = get_student_id(auth.uid()));

CREATE POLICY "Admins can manage checklist completion history" ON checklist_completion_history
    FOR ALL USING (is_admin(auth.uid()));

-- Peer evaluation phases policies
CREATE POLICY "All authenticated users can view peer evaluation phases" ON peer_evaluation_phases
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage peer evaluation phases" ON peer_evaluation_phases
    FOR ALL USING (is_admin(auth.uid()));