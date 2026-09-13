import assert from 'node:assert/strict';
import test from 'node:test';
import {
  friendlyAdminError,
  permissionGroup,
  permissionLabel,
  sectionFromPath,
  nextUserStatus,
  userStatusFilter,
} from './presentation';

test('maps route-addressable administration sections', () => {
  assert.equal(sectionFromPath('/app/settings/users'), 'users');
  assert.equal(sectionFromPath('/app/settings/roles/role-id'), 'roles');
  assert.equal(sectionFromPath('/app/settings'), 'company');
});

test('groups and labels canonical permissions without changing keys', () => {
  assert.equal(permissionGroup('report.view_profit'), 'Reports');
  assert.equal(permissionLabel('branch.access_all'), 'Branch · Access All');
});

test('turns protected administration failures into useful guidance', () => {
  assert.match(friendlyAdminError('You cannot remove your last branch access'), /final branch/);
  assert.match(friendlyAdminError('Branch code is already in use'), /already in use/);
});

test('maps user lifecycle controls to the backend UserStatus contract', () => {
  assert.equal(userStatusFilter('true'), 'ACTIVE');
  assert.equal(userStatusFilter('false'), 'DISABLED');
  assert.equal(nextUserStatus('ACTIVE'), 'DISABLED');
  assert.equal(nextUserStatus('DISABLED'), 'ACTIVE');
});
