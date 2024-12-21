import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';

const fetchTranscriptionList = async ({ page = 1, limit = 20 }) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('No active session');
  }

  const response = await fetch(
    `https://deepgram-integration-l5v0.onrender.com/transcriptionList?page=${page}&limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch transcription list');
  }
  return response.json();
};

export const useTranscriptionList = (page = 1, limit = 20) => {
  return useQuery({
    queryKey: ['transcriptionList', page, limit],
    queryFn: () => fetchTranscriptionList({ page, limit }),
    keepPreviousData: true, // Keep previous page data while fetching next page
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};
