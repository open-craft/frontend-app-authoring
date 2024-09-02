import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCourseSettings, getGradingSettings, sendGradingSettings } from './api';

export const useGradingSettings = (courseId) => (
  useQuery({
    queryKey: ['gradingSettings', courseId],
    queryFn: () => getGradingSettings(courseId),
  })
);

export const useCourseSettings = (courseId) => (
  useQuery({
    queryKey: ['courseSettings', courseId],
    queryFn: () => getCourseSettings(courseId),
  })
);

export const useGradingSettingUpdater = (courseId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings) => sendGradingSettings(courseId, settings),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['gradingSettings', courseId] });
    },
  });
};
