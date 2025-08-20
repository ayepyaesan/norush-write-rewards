import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const AdminSeeder = () => {
  useEffect(() => {
    seedAdminAccount();
  }, []);

  const seedAdminAccount = async () => {
    try {
      // Check if admin already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'admin')
        .single();

      if (existingProfile) {
        console.log('Admin account already exists');
        return;
      }

      // Create admin account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: 'lauralawon@gmail.com',
        password: '$pw=no!no!Rush',
        options: {
          data: {
            full_name: 'No Rush Main Admin',
            role: 'admin'
          }
        }
      });

      if (authError) {
        console.error('Error creating admin account:', authError);
        return;
      }

      console.log('Admin account created successfully');
    } catch (error) {
      console.error('Error seeding admin account:', error);
    }
  };

  return null; // This component doesn't render anything
};

export default AdminSeeder;