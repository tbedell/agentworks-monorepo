-- Create admin user: Thomas Bedell
-- Email: admin@agentworksstudio.com
-- Password: 11Method11

INSERT INTO "AdminUser" (id, email, name, password, role, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin@agentworksstudio.com',
  'Thomas Bedell',
  '$argon2id$v=19$m=65536,t=3,p=4$j97Xb1KH6thVm3oC7MnXMA$RzZevZchF72FuKi/rkw/jObhn0OLlvCRCK6j9Y2tAZM',
  'super_admin',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  "updatedAt" = NOW();
