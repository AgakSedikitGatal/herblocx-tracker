// Turns a database error into a sentence a person can act on.
export function describeDbError(error: { code?: string; message: string }, action: string) {
  // Refused by the permission rules (RLS), or the row is not visible to this person.
  if (error.code === "42501" || /row-level security/i.test(error.message)) {
    return "You don't have permission to do this.";
  }
  if (error.code === "PGRST116") {
    return "You don't have permission to do this, or it no longer exists.";
  }
  // Messages our own database rules raise are already written for people.
  if (error.code === "P0001") return error.message;
  if (error.code === "23514") return "Some of the values are not allowed. Please check the form.";
  if (/fetch failed|network/i.test(error.message)) {
    return "Cannot reach the server. Check your internet connection and try again.";
  }
  return `Could not ${action}: ${error.message}`;
}
