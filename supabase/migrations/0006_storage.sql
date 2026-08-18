-- =========================================================================
-- Jotapedi — bucket de storage para fotos de perfil
-- =========================================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_authenticated_upload"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid() is not null);

create policy "avatars_owner_update"
  on storage.objects for update
  using (bucket_id = 'avatars' and owner = auth.uid());

create policy "avatars_owner_delete"
  on storage.objects for delete
  using (bucket_id = 'avatars' and owner = auth.uid());
