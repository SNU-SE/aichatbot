import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Activity, ChecklistItem } from '../types';

// Get all activities
export function useActivities() {
  return useQuery({
    queryKey: ['activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select(`
          *,
          checklist_items(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Activity[];
    },
  });
}

// Get active activities only
export function useActiveActivities() {
  return useQuery({
    queryKey: ['activities', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select(`
          *,
          checklist_items(*)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Activity[];
    },
  });
}

// Get single activity with details
export function useActivity(id: string) {
  return useQuery({
    queryKey: ['activities', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select(`
          *,
          checklist_items(*),
          activity_modules(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Activity;
    },
    enabled: !!id,
  });
}

// Create activity
export function useCreateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activityData: Omit<Activity, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('activities')
        .insert(activityData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}

// Update activity
export function useUpdateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Activity> & { id: string }) => {
      const { data, error } = await supabase
        .from('activities')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['activities', data.id] });
    },
  });
}

// Delete activity
export function useDeleteActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}

// Get checklist items for activity
export function useChecklistItems(activityId: string) {
  return useQuery({
    queryKey: ['checklist-items', activityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('activity_id', activityId)
        .order('order_index');

      if (error) throw error;
      return data as ChecklistItem[];
    },
    enabled: !!activityId,
  });
}

// Create checklist item
export function useCreateChecklistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemData: Omit<ChecklistItem, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('checklist_items')
        .insert(itemData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['checklist-items', data.activity_id] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}

// Update checklist item
export function useUpdateChecklistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ChecklistItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('checklist_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['checklist-items', data.activity_id] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
}

// Delete checklist item
export function useDeleteChecklistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Get activity_id before deletion for cache invalidation
      const { data: item } = await supabase
        .from('checklist_items')
        .select('activity_id')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('checklist_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return item?.activity_id;
    },
    onSuccess: (activityId) => {
      if (activityId) {
        queryClient.invalidateQueries({ queryKey: ['checklist-items', activityId] });
        queryClient.invalidateQueries({ queryKey: ['activities'] });
      }
    },
  });
}