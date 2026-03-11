import { describe, it, expect } from 'vitest'
import { maskIp } from '../maskIp'

describe('maskIp', () => {
  it('masks last two octets of a standard IPv4', () => {
    expect(maskIp('192.168.1.115')).toBe('192.168.XX.XX')
  })

  it('masks any IPv4', () => {
    expect(maskIp('10.0.0.1')).toBe('10.0.XX.XX')
    expect(maskIp('172.16.254.1')).toBe('172.16.XX.XX')
  })

  it('passes through non-IPv4 strings unchanged', () => {
    expect(maskIp('hostname')).toBe('hostname')
    expect(maskIp('fe80::1')).toBe('fe80::1')
    expect(maskIp('')).toBe('')
  })
})
