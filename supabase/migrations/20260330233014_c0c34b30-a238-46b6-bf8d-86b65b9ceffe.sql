
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.notifications (user_id, title, message, type, recipient_type)
  VALUES (NULL, 'New User Registered', 'User ' || COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email) || ' has joined the platform.', 'new_user', 'admin');
  RETURN NEW;
END;
$function$;
