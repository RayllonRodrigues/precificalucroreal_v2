type Account = { id: string; email?: string | undefined };

/** Resolve against Auth, not editable profile data or SQL wildcard patterns. */
export async function findUniqueAccountByEmail(
  email: string,
  listPage: (page: number, perPage: number) => Promise<Account[]>,
): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const matches = new Set<string>();
  const perPage = 200;
  for (let page = 1; ; page++) {
    const users = await listPage(page, perPage);
    for (const user of users) {
      if (user.email?.trim().toLowerCase() === normalized) matches.add(user.id);
    }
    if (matches.size > 1) throw new Error("E-mail ambíguo. Nenhum privilégio foi concedido.");
    if (users.length < perPage) break;
  }
  const id = [...matches][0];
  if (!id) throw new Error("Não encontramos nenhuma conta com esse email.");
  return id;
}
