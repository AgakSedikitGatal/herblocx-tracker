import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

// Everyone on the team, including deactivated people (their names stay on old work).
export async function getPeople(supabase: Client) {
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, job_role, is_active")
    .order("full_name");
  const people = data ?? [];
  const byId = new Map(people.map((p) => [p.id, p]));

  function nameOf(id: string | null | undefined) {
    if (!id) return null;
    const person = byId.get(id);
    if (!person) return "Unknown";
    return person.is_active ? person.full_name : `${person.full_name} (inactive)`;
  }

  // Only active people can be picked as owner or assignee.
  const choices = people.filter((p) => p.is_active).map((p) => ({ id: p.id, name: p.full_name }));

  return {
    people,
    choices,
    nameOf,
    // Active people, plus whoever is currently picked even if they were deactivated since.
    choicesWith(currentId: string | null | undefined) {
      if (!currentId || choices.some((c) => c.id === currentId)) return choices;
      return [{ id: currentId, name: nameOf(currentId) ?? "Unknown" }, ...choices];
    },
  };
}
