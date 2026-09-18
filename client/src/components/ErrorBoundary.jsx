import { Component } from 'react'
import { Button } from './ui/Button'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-lg px-6 py-24">
          <p className="wa-kicker text-critical">Client error</p>
          <h1 className="wa-display mt-3 text-4xl">This screen failed to render.</h1>
          <p className="mt-4 text-sm text-quiet">{this.state.error.message}</p>
          <Button className="mt-8" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}
