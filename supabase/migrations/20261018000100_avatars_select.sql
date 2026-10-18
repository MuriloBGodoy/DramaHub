-- trocar/apagar arquivo no Storage exige SELECT no objeto (a leitura publica e pela URL do bucket)
create policy "vejo minha foto" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
