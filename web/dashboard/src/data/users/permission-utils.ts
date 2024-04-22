const permissions = ['none', 'read', 'write'] as const;
export type Permissions = typeof permissions[number]

export function lowestPermission(left: Permissions, right: Permissions) {
  const leftIndex = permissions.indexOf(left);
  const rightIndex = permissions.indexOf(right);

  return permissions[Math.min(leftIndex, rightIndex)];
}

export function isPermissionsHigher(left: Permissions | undefined, right: Permissions | undefined) {
  if (!left || !right) {
    return false;
  }
  const leftIndex = permissions.indexOf(left);
  const rightIndex = permissions.indexOf(right);

  return leftIndex > rightIndex;
}