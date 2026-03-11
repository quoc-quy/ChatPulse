export const getInitials = (name: string) => {
  if (!name) return ''
  return name.charAt(0).toUpperCase()
}
