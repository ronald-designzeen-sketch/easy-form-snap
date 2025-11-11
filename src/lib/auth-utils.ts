import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error('Error getting user:', error);
    return null;
  }

  return user;
};

export const requireAuth = async (): Promise<User> => {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Not authenticated');
  }
  return user;
};