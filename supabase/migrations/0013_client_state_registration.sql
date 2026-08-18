-- =========================================================================
-- Adiciona um campo próprio de Inscrição Estadual para clientes, e recupera
-- os valores que tinham sido colados em "Observações" (prefixo
-- "Inscrição Estadual: ...") durante a importação da planilha da Carina.
-- =========================================================================

alter table public.clients
  add column state_registration text;

update public.clients
set state_registration = nullif(trim(substring(notes from 'Inscrição Estadual:\s*(.*)$')), ''),
    notes = null
where notes ~ '^Inscrição Estadual:\s*.*$';
