import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { DealFilters, UpdateDeal } from '@repo/types';

export const useDeals = (filters: DealFilters) => {
  return useQuery({
    queryKey: ['deals', filters],
    queryFn: () => api.deals.list(filters),
    placeholderData: (previousData) => previousData,
  });
};

export const useDeal = (id: string) => {
  return useQuery({
    queryKey: ['deal', id],
    queryFn: () => api.deals.get(id),
    enabled: !!id,
  });
};

export const useUpdateDeal = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDeal }) => api.deals.update(id, data),
    onSuccess: (updatedDeal) => {
      queryClient.setQueryData(['deal', updatedDeal.id], updatedDeal);
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });
};

export const useDeleteDeal = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => api.deals.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });
};