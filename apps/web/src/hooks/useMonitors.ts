import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { CreateMonitor, UpdateMonitor } from '@repo/types';

export const useMonitors = () => {
  return useQuery({
    queryKey: ['monitors'],
    queryFn: api.monitors.list,
  });
};

export const useMonitor = (id: string) => {
  return useQuery({
    queryKey: ['monitor', id],
    queryFn: () => api.monitors.get(id),
    enabled: !!id,
  });
};

export const useCreateMonitor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.monitors.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['monitors'] }),
  });
};

export const useUpdateMonitor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMonitor }) => api.monitors.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['monitors'] });
      queryClient.invalidateQueries({ queryKey: ['monitor', id] });
    },
  });
};

export const useToggleMonitor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'pause' | 'resume' }) => 
      action === 'pause' ? api.monitors.pause(id) : api.monitors.resume(id),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['monitors'] });
      queryClient.invalidateQueries({ queryKey: ['monitor', id] });
    },
  });
};