import { render, screen } from '@testing-library/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import React from 'react'

describe('Card Component', () => {
  it('should render card with proper semantic structure', () => {
    render(
      <Card data-testid="test-card">
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
        </CardHeader>
        <CardContent>Test Content</CardContent>
      </Card>
    )
    
    const card = screen.getByTestId('test-card')
    expect(card).toBeInTheDocument()
    expect(card).toHaveAttribute('role', 'article')
    expect(card).toHaveAttribute('tabIndex', '0')
    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('should apply proper CSS classes for styling', () => {
    render(<Card data-testid="styled-card">Content</Card>)
    
    const card = screen.getByTestId('styled-card')
    expect(card).toHaveClass('rounded-2xl', 'border', 'bg-card', 'text-card-foreground', 'shadow-sm')
  })

  it('should support variant props (elevated, interactive)', () => {
    render(<Card variant="elevated" data-testid="elevated-card">Content</Card>)
    
    const card = screen.getByTestId('elevated-card')
    expect(card).toHaveClass('shadow-lg')
  })

  it('should have hover state transitions for interactive variant', () => {
    render(<Card variant="interactive" data-testid="interactive-card">Content</Card>)
    
    const card = screen.getByTestId('interactive-card')
    expect(card).toHaveClass('hover:shadow-md', 'cursor-pointer', 'transition-shadow')
  })
})