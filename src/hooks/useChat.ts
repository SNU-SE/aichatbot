import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { ChatMessage } from '../types';

// Get chat history for student
export function useChatHistory(studentId: string, activityId?: string) {
  return useQuery({
    queryKey: ['chat-history', studentId, activityId],
    queryFn: async () => {
      let query = supabase
        .from('chat_logs')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: true });

      if (activityId) {
        query = query.eq('activity_id', activityId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ChatMessage[];
    },
    enabled: !!studentId,
  });
}

// Send message to AI
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      message,
      studentId,
      activityId,
      useRag = false,
    }: {
      message: string;
      studentId: string;
      activityId?: string;
      useRag?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message,
          studentId,
          activityId,
          useRag,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate chat history to refresh with new message
      queryClient.invalidateQueries({
        queryKey: ['chat-history', variables.studentId, variables.activityId],
      });
    },
  });
}

// Get chat statistics (admin only)
export function useChatStatistics(timeRange: 'day' | 'week' | 'month' = 'day') {
  return useQuery({
    queryKey: ['chat-statistics', timeRange],
    queryFn: async () => {
      const now = new Date();
      let startDate: Date;

      switch (timeRange) {
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      const { data, error } = await supabase
        .from('chat_logs')
        .select(`
          id,
          student_id,
          tokens_used,
          model_used,
          created_at,
          students(name)
        `)
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      // Process statistics
      const totalMessages = data.length;
      const totalTokens = data.reduce((sum, log) => sum + (log.tokens_used || 0), 0);
      const uniqueStudents = new Set(data.map(log => log.student_id)).size;
      
      const modelUsage = data.reduce((acc, log) => {
        const model = log.model_used || 'unknown';
        acc[model] = (acc[model] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const dailyActivity = data.reduce((acc, log) => {
        const date = new Date(log.created_at).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalMessages,
        totalTokens,
        uniqueStudents,
        modelUsage,
        dailyActivity,
        averageTokensPerMessage: totalMessages > 0 ? Math.round(totalTokens / totalMessages) : 0,
      };
    },
  });
}

// Get question frequency analysis
export function useQuestionFrequency(studentId?: string) {
  return useQuery({
    queryKey: ['question-frequency', studentId],
    queryFn: async () => {
      let query = supabase
        .from('question_frequency')
        .select(`
          *,
          students(name)
        `)
        .order('frequency_count', { ascending: false })
        .limit(20);

      if (studentId) {
        query = query.eq('student_id', studentId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });
}

// Upload file for chat
export function useUploadChatFile() {
  return useMutation({
    mutationFn: async ({
      file,
      studentId,
    }: {
      file: File;
      studentId: string;
    }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${studentId}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('chat-files')
        .upload(fileName, file);

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('chat-files')
        .getPublicUrl(fileName);

      return {
        path: data.path,
        url: urlData.publicUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      };
    },
  });
}

// Process PDF for RAG
export function useProcessPdf() {
  return useMutation({
    mutationFn: async ({
      fileUrl,
      fileName,
    }: {
      fileUrl: string;
      fileName: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('process-pdf', {
        body: {
          fileUrl,
          fileName,
        },
      });

      if (error) throw error;
      return data;
    },
  });
}

// Search documents using RAG
export function useRagSearch() {
  return useMutation({
    mutationFn: async ({
      query,
      matchThreshold = 0.78,
      matchCount = 5,
    }: {
      query: string;
      matchThreshold?: number;
      matchCount?: number;
    }) => {
      const { data, error } = await supabase.functions.invoke('rag-search', {
        body: {
          query,
          matchThreshold,
          matchCount,
        },
      });

      if (error) throw error;
      return data;
    },
  });
}