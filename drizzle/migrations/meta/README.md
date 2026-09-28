**TODO DE RECUPERAÇÃO/VALIDAÇÃO — metadados históricos ausentes**

As migrations 0010–0013 foram reconstruídas dos contratos disponíveis, não recuperadas
byte a byte. Os snapshots, `_journal.json`, timestamps e hashes originais não foram
encontrados. Não é seguro inventá-los nem registrar estes arquivos como já aplicados.

O Drizzle instalado exige `_journal.json` para `migrate`. Por isso esse comando
permanece bloqueado até recuperar e reconciliar o histórico em homologação.

Também faltam as migrations de criação do schema (0000–0009). Os scripts reconstruídos
exigem essas tabelas e têm uma trava `precifica.recovery_validated` desligada por padrão.
Essa trava não substitui revisão, backup, auditoria de privilégios e testes SQL.

Não execute esses arquivos sobre um banco existente como substitutos dos históricos.
Após comparar com o schema real de homologação, crie migrations corretivas com novos
identificadores se os números 0010–0013 já tiverem sido aplicados no ambiente original.

Pendências específicas: matriz de permissões de papéis não proprietários; definição
original da cota persistente de IA; status de pagamentos; histórico de licenças;
reversões com concessões sobrepostas; cascatas de exclusão; defaults, enums e relações.
