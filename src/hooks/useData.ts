import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../providers";
import { PersonalTable, rows, save } from "../services/data";
export function useRows(table: string, column = "user_id", value?: string) {
  const { session } = useAuth();
  const id = value ?? session?.user.id;
  return useQuery({
    queryKey: [table, column, id],
    queryFn: () => rows(table, column, id),
    enabled: !!session,
  });
}
export function useSave(table: PersonalTable, conflict?: string) {
  const { session, online } = useAuth(),
    cache = useQueryClient();
  return useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      if (!session) throw new Error("Inicia sesión.");
      if (!online)
        throw new Error(
          "Sin conexión. Conserva el formulario y vuelve a intentar.",
        );
      await save(table, session.user.id, values, conflict);
    },
    onSuccess: () => cache.invalidateQueries({ queryKey: [table] }),
  });
}
