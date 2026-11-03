-- OPTIONAL DEMO-ONLY organization seed for LOCAL DEV.
-- No passwords/users/roles/customer/financial rows included.
-- To grant access, invite a real Auth user and add membership via
-- a trusted one-off admin/SQL operation, NOT from the browser.

insert into public.organizations (slug, name)
values ('twolittle-bites-demo', 'Twolittle.bites Demo')
on conflict (slug) do nothing;
