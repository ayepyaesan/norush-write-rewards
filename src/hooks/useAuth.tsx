import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  role: string;
  kpay_name: string | null;
  kpay_phone: string | null;
  status: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Check user profile and suspension status immediately
          supabase
            .from('profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .single()
            .then(({ data: profile, error }) => {
              // Check if user is suspended
              if (profile && profile.status === 'suspended') {
                // Sign out suspended users immediately
                supabase.auth.signOut();
                setProfile(null);
                setLoading(false);
                return;
              }
              
              if (error) {
                setProfile(null);
                setLoading(false);
                return;
              }
              
              setProfile(profile);
              setLoading(false);
            });
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Fetch user profile for existing session
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single()
          .then(({ data: profile, error }) => {
            // Check if user is suspended
            if (profile && profile.status === 'suspended') {
              // Sign out suspended users
              supabase.auth.signOut();
              setProfile(null);
              setLoading(false);
              return;
            }
            
            if (error) {
              setProfile(null);
              setLoading(false);
              return;
            }
            
            setProfile(profile);
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error };
    }

    // Check if user is suspended after successful authentication
    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('status')
        .eq('user_id', data.user.id)
        .single();
      
      if (profile && profile.status === 'suspended') {
        // Sign out suspended user immediately
        await supabase.auth.signOut();
        return { error: { message: "Your account has been suspended. Please contact administration." } };
      }
    }

    return { data };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const redirectBasedOnRole = (userProfile: UserProfile) => {
    if (userProfile.role === 'admin') {
      window.location.href = '/admin/dashboard';
    } else {
      window.location.href = '/user/dashboard';
    }
  };

  return {
    user,
    session,
    profile,
    loading,
    signIn,
    signOut,
    redirectBasedOnRole
  };
};