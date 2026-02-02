import { execSync } from 'child_process'
import { describe, it, expect } from 'vitest'

describe('Python Tests via Vitest', () => {
  it('should pass all python unit tests', () => {
    try {
      const output = execSync('set PYTHONPATH=. && pytest tests/ --tb=short', { encoding: 'utf-8' })
      console.log(output)
      expect(true).toBe(true)
    } catch (error: any) {
      console.error(error.stdout)
      console.error(error.stderr)
      throw new Error('Python tests failed')
    }
  }, 60000)
})
