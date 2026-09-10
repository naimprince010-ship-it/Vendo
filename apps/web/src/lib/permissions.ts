export function hasAnyPermission(userPermissions: readonly string[], required: readonly string[]) {
  return (
    required.length === 0 || required.some((permission) => userPermissions.includes(permission))
  );
}

export function hasAllPermissions(userPermissions: readonly string[], required: readonly string[]) {
  return required.every((permission) => userPermissions.includes(permission));
}
