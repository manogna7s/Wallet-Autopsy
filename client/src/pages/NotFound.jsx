import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-24 md:px-8">
      <p className="wa-kicker">404</p>
      <h1 className="wa-display mt-3 text-5xl md:text-6xl">This route is not in the ledger.</h1>
      <p className="mt-4 text-sm text-quiet">The page does not exist, or the address path is malformed.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button as={Link} to="/">
          Overview
        </Button>
        <Button as={Link} to="/investigate" variant="secondary">
          Investigate
        </Button>
      </div>
    </div>
  )
}
