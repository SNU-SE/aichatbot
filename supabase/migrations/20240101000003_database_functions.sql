-- Function to update student session activity
CREATE OR REPLACE FUNCTION update_student_session()
RETURNS TRIGGER AS $$
BEGIN
    -- Update existing active session or create new one
    INSERT INTO student_sessions (student_id, session_start, last_activity, is_active)
    VALUES (NEW.id, NOW(), NOW(), TRUE)
    ON CONFLICT (student_id) 
    WHERE is_active = TRUE
    DO UPDATE SET 
        last_activity = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup inactive sessions
CREATE OR REPLACE FUNCTION cleanup_inactive_sessions()
RETURNS void AS $$
BEGIN
    UPDATE student_sessions 
    SET is_active = FALSE 
    WHERE is_active = TRUE 
    AND last_activity < NOW() - INTERVAL '30 minutes';
END;
$$ LANGUAGE plpgsql;

-- Function to assign peer evaluations randomly
CREATE OR REPLACE FUNCTION assign_peer_evaluations(
    p_activity_id UUID,
    p_evaluations_per_student INTEGER DEFAULT 2
)
RETURNS void AS $$
DECLARE
    student_record RECORD;
    target_record RECORD;
    assigned_count INTEGER;
BEGIN
    -- For each student who submitted an argumentation response
    FOR student_record IN 
        SELECT DISTINCT s.id as student_id
        FROM students s
        JOIN argumentation_responses ar ON s.id = ar.student_id
        WHERE ar.activity_id = p_activity_id AND ar.is_submitted = TRUE
    LOOP
        assigned_count := 0;
        
        -- Assign evaluations to random other students
        FOR target_record IN
            SELECT DISTINCT s.id as target_id
            FROM students s
            JOIN argumentation_responses ar ON s.id = ar.student_id
            WHERE ar.activity_id = p_activity_id 
            AND ar.is_submitted = TRUE
            AND s.id != student_record.student_id
            AND NOT EXISTS (
                SELECT 1 FROM peer_evaluations pe
                WHERE pe.evaluator_id = student_record.student_id
                AND pe.target_id = s.id
                AND pe.activity_id = p_activity_id
            )
            ORDER BY RANDOM()
            LIMIT p_evaluations_per_student
        LOOP
            INSERT INTO peer_evaluations (evaluator_id, target_id, activity_id)
            VALUES (student_record.student_id, target_record.target_id, p_activity_id);
            
            assigned_count := assigned_count + 1;
        END LOOP;
        
        -- Log assignment result
        RAISE NOTICE 'Assigned % evaluations to student %', assigned_count, student_record.student_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to assign peer evaluations by class
CREATE OR REPLACE FUNCTION assign_peer_evaluations_by_class(
    p_activity_id UUID,
    p_class_name TEXT,
    p_evaluations_per_student INTEGER DEFAULT 2
)
RETURNS void AS $$
DECLARE
    student_record RECORD;
    target_record RECORD;
    assigned_count INTEGER;
BEGIN
    -- For each student in the specified class who submitted an argumentation response
    FOR student_record IN 
        SELECT DISTINCT s.id as student_id
        FROM students s
        JOIN argumentation_responses ar ON s.id = ar.student_id
        WHERE ar.activity_id = p_activity_id 
        AND ar.is_submitted = TRUE
        AND s.class_name = p_class_name
    LOOP
        assigned_count := 0;
        
        -- Assign evaluations to random other students in the same class
        FOR target_record IN
            SELECT DISTINCT s.id as target_id
            FROM students s
            JOIN argumentation_responses ar ON s.id = ar.student_id
            WHERE ar.activity_id = p_activity_id 
            AND ar.is_submitted = TRUE
            AND s.class_name = p_class_name
            AND s.id != student_record.student_id
            AND NOT EXISTS (
                SELECT 1 FROM peer_evaluations pe
                WHERE pe.evaluator_id = student_record.student_id
                AND pe.target_id = s.id
                AND pe.activity_id = p_activity_id
            )
            ORDER BY RANDOM()
            LIMIT p_evaluations_per_student
        LOOP
            INSERT INTO peer_evaluations (evaluator_id, target_id, activity_id)
            VALUES (student_record.student_id, target_record.target_id, p_activity_id);
            
            assigned_count := assigned_count + 1;
        END LOOP;
        
        RAISE NOTICE 'Assigned % evaluations to student % in class %', assigned_count, student_record.student_id, p_class_name;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to assign specific peer evaluation pairs
CREATE OR REPLACE FUNCTION assign_peer_evaluations_specific(
    p_activity_id UUID,
    p_assignments JSONB -- Array of {evaluator_id, target_id} objects
)
RETURNS void AS $$
DECLARE
    assignment JSONB;
BEGIN
    -- Loop through each assignment in the JSON array
    FOR assignment IN SELECT * FROM jsonb_array_elements(p_assignments)
    LOOP
        INSERT INTO peer_evaluations (evaluator_id, target_id, activity_id)
        VALUES (
            (assignment->>'evaluator_id')::UUID,
            (assignment->>'target_id')::UUID,
            p_activity_id
        )
        ON CONFLICT (evaluator_id, target_id, activity_id) DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate checklist progress
CREATE OR REPLACE FUNCTION calculate_checklist_progress(
    p_student_id UUID,
    p_activity_id UUID
)
RETURNS JSONB AS $$
DECLARE
    total_items INTEGER;
    completed_items INTEGER;
    completion_percentage DECIMAL(5,2);
    result JSONB;
BEGIN
    -- Count total checklist items for the activity
    SELECT COUNT(*) INTO total_items
    FROM checklist_items
    WHERE activity_id = p_activity_id;
    
    -- Count completed items for the student
    SELECT COUNT(*) INTO completed_items
    FROM student_checklist_progress scp
    JOIN checklist_items ci ON scp.checklist_item_id = ci.id
    WHERE scp.student_id = p_student_id
    AND ci.activity_id = p_activity_id
    AND scp.is_completed = TRUE;
    
    -- Calculate percentage
    IF total_items > 0 THEN
        completion_percentage := (completed_items::DECIMAL / total_items::DECIMAL) * 100;
    ELSE
        completion_percentage := 0;
    END IF;
    
    -- Build result JSON
    result := jsonb_build_object(
        'student_id', p_student_id,
        'activity_id', p_activity_id,
        'total_items', total_items,
        'completed_items', completed_items,
        'completion_percentage', completion_percentage
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to update checklist completion history
CREATE OR REPLACE FUNCTION update_checklist_completion_history()
RETURNS TRIGGER AS $$
DECLARE
    progress_data JSONB;
BEGIN
    -- Calculate current progress
    SELECT calculate_checklist_progress(NEW.student_id, 
        (SELECT activity_id FROM checklist_items WHERE id = NEW.checklist_item_id)
    ) INTO progress_data;
    
    -- Insert or update completion history
    INSERT INTO checklist_completion_history (
        student_id, 
        activity_id, 
        completed_items, 
        total_items, 
        completion_percentage
    )
    VALUES (
        NEW.student_id,
        (progress_data->>'activity_id')::UUID,
        (progress_data->>'completed_items')::INTEGER,
        (progress_data->>'total_items')::INTEGER,
        (progress_data->>'completion_percentage')::DECIMAL
    )
    ON CONFLICT (student_id, activity_id, DATE(snapshot_date))
    DO UPDATE SET
        completed_items = EXCLUDED.completed_items,
        total_items = EXCLUDED.total_items,
        completion_percentage = EXCLUDED.completion_percentage,
        snapshot_date = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to track question frequency
CREATE OR REPLACE FUNCTION track_question_frequency(
    p_student_id UUID,
    p_question_text TEXT
)
RETURNS void AS $$
BEGIN
    INSERT INTO question_frequency (student_id, question_text, frequency_count, last_asked)
    VALUES (p_student_id, p_question_text, 1, NOW())
    ON CONFLICT (student_id, question_text)
    DO UPDATE SET
        frequency_count = question_frequency.frequency_count + 1,
        last_asked = NOW(),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to search document chunks using vector similarity
CREATE OR REPLACE FUNCTION search_document_chunks(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.78,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    document_name TEXT,
    content TEXT,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.document_name,
        dc.content,
        1 - (dc.embedding <=> query_embedding) AS similarity
    FROM document_chunks dc
    WHERE 1 - (dc.embedding <=> query_embedding) > match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get student activity summary
CREATE OR REPLACE FUNCTION get_student_activity_summary(p_student_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    chat_count INTEGER;
    argumentation_count INTEGER;
    evaluation_count INTEGER;
    avg_completion DECIMAL(5,2);
BEGIN
    -- Count chat messages
    SELECT COUNT(*) INTO chat_count
    FROM chat_logs
    WHERE student_id = p_student_id;
    
    -- Count argumentation responses
    SELECT COUNT(*) INTO argumentation_count
    FROM argumentation_responses
    WHERE student_id = p_student_id AND is_submitted = TRUE;
    
    -- Count peer evaluations completed
    SELECT COUNT(*) INTO evaluation_count
    FROM peer_evaluations
    WHERE evaluator_id = p_student_id AND is_completed = TRUE;
    
    -- Calculate average checklist completion
    SELECT AVG(completion_percentage) INTO avg_completion
    FROM checklist_completion_history
    WHERE student_id = p_student_id;
    
    -- Build result
    result := jsonb_build_object(
        'student_id', p_student_id,
        'chat_messages', COALESCE(chat_count, 0),
        'argumentation_responses', COALESCE(argumentation_count, 0),
        'peer_evaluations_completed', COALESCE(evaluation_count, 0),
        'average_checklist_completion', COALESCE(avg_completion, 0)
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_update_checklist_completion_history
    AFTER INSERT OR UPDATE ON student_checklist_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_checklist_completion_history();

-- Create a function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert default role as student
    INSERT INTO user_roles (user_id, role)
    VALUES (NEW.id, 'student');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();