-- Catalog profiles can be unclaimed without creating fabricated Auth accounts.
alter table public.trainers alter column user_id drop not null;
alter table public.trainers add column is_preview boolean not null default false;
alter table public.trainers add column avatar_url text;
alter table public.trainers add column photo_credit text;
insert into public.trainers(id,user_id,name,sex,specialty,bio,experience_years,rating,active,is_preview,avatar_url,photo_credit) values
('b50f17c0-ef6e-4dea-8ef2-500000000001',null,'CBum · Chris Bumstead','male','Culturismo · Hipertrofia','Perfil no oficial de admiradores. No existe afiliación, asesoría ni contacto con Chris Bumstead.',0,null,true,true,'https://commons.wikimedia.org/wiki/Special:FilePath/Chris_Bumstead_on_Gymshark.jpg','Gymshark · CC BY 3.0 · Wikimedia Commons. Fotograma recortado y aclarado.'),
('b50f17c0-ef6e-4dea-8ef2-500000000002',null,'Valeria Cruz','female','Fuerza · Entrenamiento funcional','Personaje ficticio del catálogo: fuerza, movilidad y hábitos de entrenamiento.',0,null,true,true,null,null),
('b50f17c0-ef6e-4dea-8ef2-500000000003',null,'Alex Rivera','male','Running · Resistencia','Personaje ficticio del catálogo: caminatas, carreras y resistencia.',0,null,true,true,null,null),
('b50f17c0-ef6e-4dea-8ef2-500000000004',null,'Sofía Torres','female','Movilidad · Bienestar','Personaje ficticio del catálogo: movilidad y constancia.',0,null,true,true,null,null)
on conflict(id) do nothing;
