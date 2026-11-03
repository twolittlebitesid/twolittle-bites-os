-- STARTER ONLY. Apply after initial schema in an isolated DEV project.
-- No public read/write path for sensitive customer payment proof objects.
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs', 'payment-proofs', false, 8388608,
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Staff can read a READY proof only if it belongs to their org/role.
-- The object_path is generated on the server and is unique in payment_proofs.
create policy twb_payment_proofs_read
on storage.objects for select to authenticated
using (
  bucket_id = 'payment-proofs'
  and exists (
    select 1 from public.payment_proofs p
    where p.bucket = bucket_id
      and p.object_path = name
      and p.status = 'READY'
      and private.has_org_role(p.org_id, array['OWNER','FINANCE']::text[])
  )
);

-- Intentionally NO INSERT / UPDATE / DELETE policy for authenticated browser.
-- Trusted Edge upload-intent / finalize service uses secret credentials after
-- verifying the requester's JWT, role, org scope, magic bytes, and file size.
-- Storage and Postgres are not a single atomic transaction: implement a saga.
commit;
