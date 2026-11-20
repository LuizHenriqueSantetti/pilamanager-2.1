-- Padroniza telefones antigos para somente dígitos (a interface aplica a máscara ao exibir).
UPDATE patients
   SET phone = NULLIF(regexp_replace(phone, '\D', '', 'g'), ''), updated_at = NOW()
 WHERE phone ~ '\D';
