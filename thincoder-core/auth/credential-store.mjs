import { promises as fs, constants } from 'node:fs'
import { join, resolve } from 'node:path'
import { homedir, hostname } from 'node:os'
import { randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { setTimeout as sleep } from 'node:timers/promises'
import { authError, checkSignal } from './errors.mjs'

const exec = promisify(execFile)
const validName = /^[a-zA-Z0-9_-]{1,100}$/
const denied = () => authError('credential_storage_unsafe', 'Credential storage is not private or has an unsafe path.')

// Windows chmod is insufficient. Replace, rather than merely supplement, the ACL.
async function protectWindows(path, directory) {
  const type = directory ? 'DirectorySecurity' : 'FileSecurity'
  const inheritance = directory ? 'ContainerInherit,ObjectInherit' : 'None'
  const script = `$ErrorActionPreference='Stop'; $sid=[System.Security.Principal.WindowsIdentity]::GetCurrent().User; $acl=New-Object System.Security.AccessControl.${type}; $acl.SetOwner($sid); $acl.SetAccessRuleProtection($true,$false); $rule=New-Object System.Security.AccessControl.FileSystemAccessRule($sid,'FullControl','${inheritance}','None','Allow'); $acl.AddAccessRule($rule); Set-Acl -LiteralPath $env:THINCODER_AUTH_PROTECT_PATH -AclObject $acl`
  try {
    await exec('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], {
      windowsHide: true, env: { ...process.env, THINCODER_AUTH_PROTECT_PATH: path }, timeout: 10000,
    })
  } catch { throw denied() }
}

export class CredentialStore {
  constructor({ root = join(homedir(), '.thincoder', 'auth'), leaseMs = 30000, lockTimeoutMs = 45000 } = {}) {
    this.root = resolve(root)
    this.leaseMs = Math.max(1000, leaseMs)
    this.lockTimeoutMs = lockTimeoutMs
  }

  async protect(path, directory = false) {
    const stat = await fs.lstat(path)
    if (stat.isSymbolicLink() || (directory ? !stat.isDirectory() : !stat.isFile())) throw denied()
    if (process.platform === 'win32') await protectWindows(path, directory)
    else {
      if (stat.uid !== process.getuid()) throw denied()
      await fs.chmod(path, directory ? 0o700 : 0o600)
    }
  }

  async init() {
    await fs.mkdir(this.root, { recursive: true, mode: 0o700 })
    await this.protect(this.root, true)
    for (const name of ['credentials', 'locks']) {
      const dir = join(this.root, name)
      await fs.mkdir(dir, { recursive: true, mode: 0o700 })
      await this.protect(dir, true)
    }
  }

  path(name) {
    if (!/^(host|profiles)\.json$/.test(name) && !/^credentials\/[a-zA-Z0-9_-]{1,100}\.json$/.test(name)) throw denied()
    return join(this.root, name)
  }

  async read(name, fallback = null) {
    const path = this.path(name)
    let handle
    try {
      const stat = await fs.lstat(path)
      if (!stat.isFile() || stat.isSymbolicLink() || (process.platform !== 'win32' && (stat.uid !== process.getuid() || (stat.mode & 0o077)))) throw denied()
      // Directory protection does not remove explicit permissive file ACEs.
      // Re-protect existing Windows records before reading any credential bytes.
      if (process.platform === 'win32') await this.protect(path)
      handle = await fs.open(path, constants.O_RDONLY | (constants.O_NOFOLLOW || 0))
      const opened = await handle.stat()
      if (opened.ino !== stat.ino || opened.dev !== stat.dev) throw denied()
      return JSON.parse(await handle.readFile('utf8'))
    } catch (error) {
      if (error.code === 'ENOENT') return fallback
      if (error.name === 'AuthError') throw error
      throw authError('credential_storage_invalid', 'Credential storage could not be read safely.')
    } finally { await handle?.close() }
  }

  async write(name, value) {
    const path = this.path(name)
    const temp = `${path}.${randomUUID()}.tmp`
    let handle
    try {
      handle = await fs.open(temp, 'wx', 0o600)
      await this.protect(temp)
      await handle.writeFile(`${JSON.stringify(value)}\n`, 'utf8')
      await handle.sync()
      await handle.close(); handle = null
      // Renaming never follows a destination symlink; reject one anyway.
      const old = await fs.lstat(path).catch(e => { if (e.code !== 'ENOENT') throw e })
      if (old?.isSymbolicLink()) throw denied()
      await fs.rename(temp, path)
      if (process.platform !== 'win32') {
        const dir = await fs.open(name.startsWith('credentials/') ? join(this.root, 'credentials') : this.root, 'r')
        try { await dir.sync() } finally { await dir.close() }
      }
    } finally {
      await handle?.close()
      await fs.unlink(temp).catch(() => {})
    }
  }

  async removeCredential(profileId) {
    await fs.unlink(this.path(`credentials/${profileId}.json`)).catch(e => { if (e.code !== 'ENOENT') throw e })
  }
  readCredential(profileId) { return this.read(`credentials/${profileId}.json`) }
  writeCredential(profileId, value) { return this.write(`credentials/${profileId}.json`, value) }
  readProfiles() { return this.read('profiles.json', { version: 1, activeProfileId: null, activation: 0, profiles: [] }) }

  async getHost() {
    await this.init()
    return this.withLock('host', async () => {
      const saved = await this.read('host.json')
      if (saved) {
        if (!/^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(saved.hostId)) throw denied()
        return saved
      }
      const host = { version: 1, hostId: `urn:uuid:${randomUUID()}` }
      await this.write('host.json', host)
      return host
    })
  }

  async withLock(name, action, { signal } = {}) {
    if (!validName.test(name)) throw denied()
    await this.init()
    const path = join(this.root, 'locks', `${name}.lock`)
    const recoveryDir = `${path}.recoveries`
    await fs.mkdir(recoveryDir, { recursive: true, mode: 0o700 })
    await this.protect(recoveryDir, true)
    const owner = { owner: randomUUID(), pid: process.pid, host: hostname(), leaseUntil: Date.now() + this.leaseMs }
    const started = Date.now()
    const ownerIsDead = record => {
      if (record?.host !== hostname() || !Number.isSafeInteger(record.pid) || record.pid <= 0) return false
      try { process.kill(record.pid, 0); return false } catch (e) { return e.code === 'ESRCH' }
    }
    const inspectLock = async () => {
      const stat = await fs.lstat(path).catch(e => { if (e.code !== 'ENOENT') throw e })
      if (!stat) return null
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw denied()
      const record = await fs.readFile(join(path, 'owner.json'), 'utf8').then(JSON.parse).catch(() => null)
      return { stat, record, stale: Date.now() > Math.max(Number(record?.leaseUntil) || 0, stat.mtimeMs + this.leaseMs) && (ownerIsDead(record) || !record) }
    }
    const hasRecoveries = async () => {
      let active = false
      for (const name of await fs.readdir(recoveryDir)) {
        const marker = join(recoveryDir, name)
        const stat = await fs.lstat(marker).catch(e => { if (e.code !== 'ENOENT') throw e })
        if (!stat) continue
        if (!stat.isFile() || stat.isSymbolicLink()) throw denied()
        const record = await fs.readFile(marker, 'utf8').then(JSON.parse).catch(() => null)
        if (ownerIsDead(record) || (!record && Date.now() > stat.mtimeMs + this.leaseMs)) {
          // Marker names are unique and never reused. Removing a crashed marker
          // cannot remove a new recovery generation (unlike a single guard path).
          await fs.unlink(marker).catch(e => { if (e.code !== 'ENOENT') throw e })
        } else active = true
      }
      return active
    }
    const wait = async () => {
      if (Date.now() - started > this.lockTimeoutMs) throw authError('refresh_busy', 'Another ThinCoder process is updating this account. Try again shortly.', { retryable: true })
      await sleep(40, undefined, { signal })
    }
    while (true) {
      checkSignal(signal)
      if (await hasRecoveries()) { await wait(); continue }
      try {
        await fs.mkdir(path, { mode: 0o700 })
        await this.protect(path, true)
        await fs.writeFile(join(path, 'owner.json'), JSON.stringify(owner), { flag: 'wx', mode: 0o600 })
        const acquired = await inspectLock()
        // Both sides respect recovery markers. No new authority may consume a
        // rotating token while any stale observer could remove the old path.
        if (await hasRecoveries() || acquired?.record?.owner !== owner.owner) {
          const held = await inspectLock()
          if (held?.record?.owner === owner.owner) await fs.rm(path, { recursive: true, force: true })
          await wait(); continue
        }
        break
      } catch (error) {
        if (error.code === 'ENOENT') continue // A recovery raced our not-yet-active directory.
        if (error.code !== 'EEXIST') throw error
        const observed = await inspectLock()
        if (!observed) continue
        if (observed.stale) {
          const marker = join(recoveryDir, randomUUID())
          try {
            await fs.writeFile(marker, JSON.stringify(owner), { flag: 'wx', mode: 0o600 })
            // A process suspended before writing its marker might have had the
            // incomplete marker reaped. It cannot proceed without the marker.
            const markerOwner = await fs.readFile(marker, 'utf8').then(JSON.parse).catch(() => null)
            if (markerOwner?.owner !== owner.owner) continue
            const current = await inspectLock()
            if (current?.stale) {
              const tombstone = `${path}.stale-${randomUUID()}`
              try { await fs.rename(path, tombstone); await fs.rm(tombstone, { recursive: true, force: true }) }
              catch (e) { if (e.code !== 'ENOENT') throw e }
            }
          } finally { await fs.unlink(marker).catch(e => { if (e.code !== 'ENOENT') throw e }) }
          continue
        }
        await wait()
      }
    }
    const heartbeat = setInterval(() => {
      // Owner metadata is immutable; readers never observe partial heartbeat JSON.
      // A live local PID is never stolen, even if its heartbeat is delayed.
      const time = new Date()
      fs.utimes(path, time, time).catch(() => {})
    }, this.leaseMs / 3)
    heartbeat.unref()
    try { checkSignal(signal); return await action() }
    finally {
      clearInterval(heartbeat)
      const held = await fs.readFile(join(path, 'owner.json'), 'utf8').then(JSON.parse).catch(() => null)
      if (held?.owner === owner.owner) await fs.rm(path, { recursive: true, force: true })
    }
  }
}
