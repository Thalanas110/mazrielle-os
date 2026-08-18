import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCredentialHtml } from '../src/lib/docxImport.ts';

test('parses credential rows from a DOCX table HTML representation', () => {
  const records = parseCredentialHtml('<table><tr><th>Title</th><th>Username</th><th>Password</th><th>Website</th></tr><tr><td>GitHub</td><td>ren</td><td>secret</td><td>github.com</td></tr></table>');

  assert.deepEqual(records, [{ title: 'GitHub', username: 'ren', password: 'secret', website: 'github.com', notes: '', tags: '', source: 'table' }]);
});

test('parses free-form labeled credential text', () => {
  const records = parseCredentialHtml('<p>Personal email</p><p>Username: ren@example.com</p><p>Password: secret</p><p>Website: mail.example.com</p>');

  assert.deepEqual(records, [{ title: 'Personal email', username: 'ren@example.com', password: 'secret', website: 'mail.example.com', notes: '', tags: '', source: 'text' }]);
});
